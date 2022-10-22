import { promises as fs } from 'fs';
import { dbRoot$ } from '../state';
import PATH from 'path';
import { firstValueFrom } from 'rxjs';

export const loadDirChildren = async (dir: string) => {
  console.log('loadDirsAndArticles of dir:', dir);
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
  console.log('loadDirChildren of ', abs);
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
        dirs,
        videos,
        pdfs,
      };
    })
    .catch((e) => {
      console.log(`load child dirs of ${abs}:`, e);
      return {
        dirs,
        videos,
        pdfs,
      };
    });
};

