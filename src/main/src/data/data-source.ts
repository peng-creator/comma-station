import "reflect-metadata"
import { And, Between, DataSource, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { dbRoot$ } from "../../state";
import { Observable, Subject, bufferTime, combineLatest, filter, firstValueFrom, from, map, mergeAll, mergeMap, shareReplay, switchMap, tap, windowCount, windowTime } from "rxjs";
import path from "path";
import { File } from "./entity/File";
import { files$ } from "../resourceLoader";
import { loadFromFileWithoutCache } from "../subtitle";
import { randomUUID } from "crypto";
import fs from 'fs';
import { getAssetPath } from "../../util";
import { logToFile } from '../../log';


const wordRanks = JSON.parse(fs.readFileSync(getAssetPath('words.json'),).toString())
    .reduce((acc: any, curr: any) => {
        acc[curr.word.toLowerCase()] = curr.rank;
        return acc;
    }, {});

export const datasource$ = dbRoot$.pipe(
    switchMap((dbRoot) => {
        const appDataSource = new DataSource({
            type: "sqlite",
            database: path.join(dbRoot, "database.sqlite"),
            synchronize: true,
            logger: "file",
            logging: true,
            entities: [
                File,
            ],
            migrations: [],
            subscribers: [],
        });
        logToFile('init _datasource on dbRoot:', dbRoot);
        return from(appDataSource.initialize().then(() => appDataSource));
    }),
    shareReplay(1),
);

const getLevel = async (text: string) => {
    const words = text.split(/\W/).filter(w => w !== '' && w.length > 2 && !/\d/.test(w)).filter(w => !['start', 'end', 'subtitles', 'id'].includes(w));
    let count = 0;
    return words.reduce((acc, curr) => {
      const rank = wordRanks[curr.toLowerCase()] || 0;
      if (rank < 1000) {
          return acc;
      }
      acc += rank;
      count += 1;
      return acc;
    }, 0) / (count + 1) || 0;
}

// build file levels
combineLatest([datasource$, files$.pipe(bufferTime(10000)), dbRoot$])
.pipe(
    map(([datasource, files, dbRoot]) => {
        return from(files.flat()).pipe(
            filter((file) => file.endsWith('.mp4')),
            map((file) => {
                const loadLevelForFile = async (file: string) => {
                    // logToFile('check levels of file:', file);
                    const result = await datasource.manager.findOneBy(File, {
                        path: '/' + file,
                    });
                    if (result) {
                        // logToFile('file', file, 'already added');
                        return null;
                    }
                    const videoPath = path.join(dbRoot, 'resource', file);
                    const subtitles = await loadFromFileWithoutCache(videoPath);
                    const level = await getLevel(JSON.stringify(subtitles));
                    logToFile('level of file:', file, ' is: ', level);
                    return {
                        file,
                        level,
                    };
                }
                return () => loadLevelForFile(file);
            }),
            map((toLoad) => {
                return new Observable<{file: string; level: number}>((observer) => {
                    toLoad().then((fileLevel) => {
                        if (fileLevel !== null) {
                            observer.next(fileLevel);
                        }
                    }).finally(() => {
                        observer.complete();
                    })
                });
            }),
            mergeAll(1),
            bufferTime(5000),
            map((fileLevels) => {
                return {
                    datasource,
                    fileLevels
                }
            })
        );
    }),
    mergeAll(),
    bufferTime(1000),
    map(t => {
        if (t.length > 0) {
           return [t[0].datasource, t.map(({fileLevels}) => fileLevels).flat()] as [DataSource, {file: string; level: number}[]];
        }
        return null;
    }),
    filter(t => t !== null),
    map(t => t!)
)
.subscribe({
    next([datasource, fileLevels]) {
        // load files with levels
        const uuid = randomUUID(); // epoch of indexing the files
        const fileDoList = fileLevels.filter(item => item !== null && item !== undefined).map((fileLevel) => {
            const {file, level} = fileLevel!;
            const fileDO = new File();
            fileDO.epoch = uuid;
            fileDO.path = '/' + file;
            fileDO.level = parseInt(level + '', 10);
            return fileDO;
          });
          if (fileDoList.length === 0) {
            return;
          }

          logToFile('saving fileDoList to datasource:', fileDoList);
          datasource.manager.find(File).then((files) => {
            let beforeLength = files.length;
            logToFile('length before adding:', beforeLength);
            datasource.manager.save(fileDoList).then(() => {
              return datasource.manager.find(File);
            }).then(res => {
              logToFile('length before adding:', beforeLength, 'table length after adding:', res.length);
            }).catch(e => {
              logToFile('saving fileDoList to datasource failed:', e);
            });
          });
    }
});

export const getFilesOfLevel = async (queryLevel: number) => {
    const datasource = await firstValueFrom(datasource$);
    if (!datasource) {
        logToFile('datasource is undefined!');
        return [];
    }
    if (queryLevel === 0) {
        return await datasource.manager.find(File);
    }
    return await datasource.manager.findBy(File, {
        level: Between((queryLevel - 1) * 500, queryLevel * 500),
    });
}

export const getDataSource = () => datasource$;
