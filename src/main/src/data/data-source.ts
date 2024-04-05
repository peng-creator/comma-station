import "reflect-metadata"
import { And, Between, DataSource, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { User } from "./entity/User"
import { dbRoot$ } from "../../state";
import { combineLatest, filter, firstValueFrom, from, mergeAll, mergeMap, shareReplay, switchMap } from "rxjs";
import path from "path";
import { File } from "./entity/File";
import { Card } from "./entity/Card";
import { files$ } from "../resourceLoader";
import { loadFromFileWithoutCache } from "../subtitle";
import { randomUUID } from "crypto";
import fs from 'fs';
import { getAssetPath } from "../../util";


const wordRanks = JSON.parse(fs.readFileSync(getAssetPath('words.json'),).toString())
    .reduce((acc: any, curr: any) => {
        acc[curr.word.toLowerCase()] = curr.rank;
        return acc;
    }, {});

let _datasource: DataSource;
let _datasourceF: DataSource;

export const datasource$ = dbRoot$.pipe(
    switchMap((dbRoot) => {
        const appDataSource = new DataSource({
            type: "sqlite",
            database: path.join(dbRoot, "database.sqlite"),
            synchronize: true,
            logging: false,
            entities: [
                User,
                File,
                Card,
            ],
            migrations: [],
            subscribers: [],
        });
        _datasource = appDataSource;
        console.log('init _datasource on dbRoot:', dbRoot);
        return from(appDataSource.initialize().then(() => appDataSource));
    }),
    shareReplay(1),
);

const getLevel = async (text: string) => {
    const words = text.split(/\W/).filter(w => w !== '' && w.length > 2 && !/\d/.test(w)).filter(w => !['start', 'end', 'subtitles', 'id'].includes(w));
    let count = 0;
    return words.reduce((acc, curr) => {
        const rank = wordRanks[curr.toLowerCase()] || 0;
        if (rank > 500) {
            acc += rank;
            count += 1;
        }
        return acc;
    }, 0) / (count + 1) || 0;
}

// build file levels
combineLatest([datasource$, files$, dbRoot$]).subscribe({
    next([datasource, files, dbRoot]) {
        _datasourceF = datasource;
        console.log('build file levels', datasource === _datasource);
        // load files with levels
        const uuid = randomUUID(); // epoch of indexing the files
        // clear old data
        // datasource.manager.createQueryBuilder().delete().from(File).where("epoch != :epoch", {epoch: uuid}).execute();
        from(files.filter((file) => file.endsWith('.mp4')).map(async file => {
            const result = await datasource.manager.findOneBy(File, {
                path: '/' + file,
            });
            if (result) {
                return null;
            }
            const videoPath = path.join(dbRoot, 'resource', file); 
            const subtitles = await loadFromFileWithoutCache(videoPath);
            const level = await getLevel(JSON.stringify(subtitles));
            console.log('level of file:', file, ' is: ', level);
            return {
                file,
                level,
            };
        }).map(fileLevelPromise => from(fileLevelPromise))).pipe(mergeAll(10)).subscribe({
            next(fileLevel) {
                if (fileLevel === null) {
                    return;
                }
                const {file, level} = fileLevel;
                const fileDO = new File();
                fileDO.epoch = uuid;
                fileDO.path = '/' + file;
                fileDO.level = level; 
                console.log('before save:', _datasourceF === datasource);
                datasource.manager.save(fileDO);
                console.log('after save:', _datasourceF === datasource);
            }
        });
    }
});

export const getFilesOfLevel = async (queryLevel: number) => {
    const datasource = await firstValueFrom(datasource$);
    if (!datasource) {
        console.log('datasource is undefined!');
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