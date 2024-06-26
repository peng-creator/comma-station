import { promises as fs } from 'fs';
import path from 'path';
import { Ass } from './ass/ass';
import { srtToSubtitle } from './srt/srt';
import { writeJSON } from '../JsonDB';
import { mergeNonePunctuations, mergeWithComma } from './merge';
import { Subtitle } from '../types/Subtitle';

const loadFromFile = async (srtFilePath: string, assFilePath: string) => {
  return Promise.all([
    srtFilePath ? fs
      .readFile(srtFilePath)
      .then((srtBuf) => srtBuf.toString())
      .then((srtContent) => {
        return srtToSubtitle(srtContent);
      })
      .catch((e) => {
        return [];
      }) : Promise.resolve([]),
    assFilePath ? Ass.loadBySrc(assFilePath).catch((e: any) => {
      return [];
    }) : Promise.resolve([]),
  ])
    .then(([srtRes, assRes]) => {
      // console.log('srtRes length:', srtRes.length);
      // console.log('assRes length:', assRes.length);
      if (srtRes.length > 0) {
        return srtRes;
      }
      if (assRes.length > 0) {
        return assRes;
      }
      return [];
    })
}

const getFilePath = async (videoPath: string) => {
  const cachePath = `${videoPath.slice(0, -4)}.json`;
  const dir = path.dirname(cachePath);
  const videoFileName = path.basename(videoPath).slice(0, -4);
  const sameNameSrt = path.join(dir, videoFileName + '.srt');
  const sameNameEnSrt = path.join(dir, videoFileName + '.en.srt');
  const sameNameAss = path.join(dir, videoFileName + '.ass');
  const sameNameEnAss = path.join(dir, videoFileName + '.en.ass');
  try {
    await fs.stat(sameNameAss);
    return {
      cachePath,
      srtFilePath: '',
      assFilePath: sameNameAss,
    };
  } catch(e) {
  }
  try {
    await fs.stat(sameNameEnAss);
    return {
      cachePath,
      srtFilePath: '',
      assFilePath: sameNameEnAss,
    };
  } catch(e) {
  }
  try {
    await fs.stat(sameNameSrt);
    return {
      cachePath,
      srtFilePath: sameNameSrt,
      assFilePath: '',
    };
  } catch(e) {
  }
  try {
    await fs.stat(sameNameEnSrt);
    return {
      cachePath,
      srtFilePath: sameNameEnSrt,
      assFilePath: '',
    };
  } catch(e) {
  }
  // console.log('load children of dir:', dir);
  let dirChildren = await fs.readdir(dir);
  dirChildren = dirChildren.filter((child) => !child.startsWith('.'));
  // console.log('dirChildren:', dirChildren);
  const assList = dirChildren.filter((file) => {
    return path.extname(file).toLowerCase() === '.ass';
  }).sort();
  const srtList = dirChildren.filter((file) => {
    return path.extname(file).toLowerCase() === '.srt';
  }).sort();
  const mp4List = dirChildren.filter((file) => {
    return path.extname(file).toLowerCase() === '.mp4';
  }).sort();
  const indexOfCurrentVideo = mp4List.indexOf(path.basename(videoPath));
  if (indexOfCurrentVideo === -1) {
    throw new Error('没找到当前视频文件！' + videoPath);
  }
  const matchedAss = assList.find((ass) => ass.startsWith(videoFileName));
  const matchedSrt = srtList.find((srt) => srt.startsWith(videoFileName));
  const assFilName = matchedAss || assList[indexOfCurrentVideo];
  const srtFileName = matchedSrt || srtList[indexOfCurrentVideo];
  const assFilePath = path.join(dir, assFilName || '');
  const srtFilePath = path.join(dir, srtFileName || '');
  return {
    cachePath,
    srtFilePath,
    assFilePath
  }
}

export const getSubtitleOfVideo = async (videoPath: string) => {
  const {
    cachePath,
    srtFilePath,
    assFilePath
  } = await getFilePath(videoPath);
  return fs
    .readFile(cachePath) // 读取字幕解析缓存。
    .then((res) => {
      console.log('reading cache...');
      const cache = JSON.parse(res.toString());
      if (cache.length > 0) {
        return cache;
      }
      throw new Error('empty cache');
    })
    .catch(() => {
      console.log('try to load srt from:', srtFilePath);
      console.log('try to load ass from:', assFilePath);
      return loadFromFile(srtFilePath, assFilePath)
      .then((subtitles) => {
        const filtered = subtitles.map(subtitle => {
          subtitle.subtitles = subtitle.subtitles.filter((s) => s.trim().length > 0);
          return subtitle;
        });
        // const mergedSubtitles = mergeWithComma(mergeNonePunctuations(filtered));
        writeJSON(filtered, cachePath);
        return filtered;
      })
      .catch((e: any) => {
        console.log(
          'unexpected error when get the subtitle of video file ',
          videoPath,
          ' e:',
          e
        );
        return [];
      });
    })
    .then((subtitles) => {
      return subtitles
        .filter((s: any) => s.subtitles.length > 0)
        .map((sub: any, index: number) => {
          sub.id = index;
          return sub;
        });
    });
};

export const loadFromFileWithoutCache = async (videoPath: string) => {
  const {
    cachePath,
    srtFilePath,
    assFilePath
  } = await getFilePath(videoPath);
  return loadFromFile(srtFilePath, assFilePath)
  .then((subtitles) => {
    const filtered = subtitles.map(subtitle => {
      subtitle.subtitles = subtitle.subtitles.filter((s) => s.trim().length > 0);
      return subtitle;
    });
    // return mergeWithComma(mergeNonePunctuations(filtered));
    return filtered;
  })
  .then((subtitles) => {
    return subtitles
      .filter((s: any) => s.subtitles.length > 0)
      .map((sub: any, index: number) => {
        sub.id = index;
        return sub as Subtitle;
      });
  }).catch(e => []);
};
