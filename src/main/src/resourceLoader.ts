import { promises as fs } from 'fs';
import { dbRoot$ } from '../state';
import PATH from 'path';
import { EMPTY, Subject, firstValueFrom, share, switchMap, tap } from 'rxjs';
import MiniSearch from 'minisearch';

type FileSearchItem = {
  id: string;
};

const fileMiniSearch = new MiniSearch<FileSearchItem>({
  fields: ['id'], // fields to index for full-text search
  storeFields: ['id'], // fields to return with search results
  tokenize: (s) => s.toLowerCase().split(/\W/),
});

export const searchFiles = (keyword: string) => {
  const searchResult = fileMiniSearch.search(keyword, { fuzzy: 0.1,  });
  console.log('searchResult of keyword:', keyword, ': ', searchResult);
  return searchResult;
};

export const loadDirChildren = async (dir: string) => {
  // console.log('loadDirsAndArticles of dir:', dir);
  const dirs: string[] = [];
  const videos: string[] = [];
  const pdfs: string[] = [];
  const dbRoot = await firstValueFrom(dbRoot$);
  if (!dbRoot) {
    return {
      dirs,
      videos,
      pdfs,
    };
  }
  const abs = PATH.join(dbRoot, 'resource', dir);
  // console.log('loadDirChildren of ', abs);
  return fs
    .readdir(abs)
    .then(async (files) => {
      for (const file of files) {
        const stat = await fs.stat(PATH.join(abs, file));
        if (stat.isDirectory()) {
          dirs.push(file);
        } else if (file.toLowerCase().endsWith('mp4')) {
          videos.push(file);
        } else if (file.toLowerCase().endsWith('pdf')) {
          pdfs.push(file);
        }
      }
      return {
        dirs: dirs.sort(),
        videos: videos.sort(),
        pdfs: pdfs.sort(),
      };
    })
    .catch((e) => {
      // console.log(`load child dirs of ${abs}:`, e);
      return {
        dirs,
        videos,
        pdfs,
      };
    });
};

export const files$ = dbRoot$.pipe(
  switchMap(dbRoot => {
    if (!dbRoot) {
      return EMPTY;
    }
    console.log('build files stream on dbroot:', dbRoot);
    const files$ = new Subject<string[]>();
    const loadFiles = async () => {
      let dirsToSearch = ['./'];
      while(true) {
        let dir = dirsToSearch.shift();
        if (dir === undefined) {
          break;
        }
        const { dirs, videos, pdfs } = await loadDirChildren(dir);
        dirsToSearch = [...dirsToSearch, ...dirs.map((d) => {
          if (dir === undefined) {
            throw new Error('dir to be searched should not be undefined')
          }
          return PATH.join(dir, d);
        })];
        const files = [...videos, ...pdfs].map((file) => {
          if (dir === undefined) {
            throw new Error('dir to be searched should not be undefined')
          }
          return  PATH.join(dir, file);
        });
        files$.next(files);
      }
    }
    loadFiles();
    return files$;
  }),
  share(),
);

dbRoot$.pipe(
  tap(() => {
    console.log('reset file search engine');
    fileMiniSearch.removeAll();
  }),
  switchMap(() => files$),
).subscribe({
  next(files) {
    console.log('add files to search engine:', files);
    fileMiniSearch.addAll(files.map((file) => {
      return {
        id: file,
      };
    }));
  }
});
