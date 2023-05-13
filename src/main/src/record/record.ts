import PATH from 'path';
import {promises as fs} from 'fs';
import { mkdir } from '../utils/mkdir';
import { dbRoot$ } from '../../state';
import { filter, firstValueFrom } from 'rxjs';
import { writeJSON } from '../JsonDB';

const CACHE_VOLUME = 20;

dbRoot$.subscribe({
    next(dbRoot) {
        if (!dbRoot) {
            return;
        }
        const dir = PATH.join(dbRoot, 'records');
        mkdir(dir);
    }
});

const getRecordFilePath = async () => {
    const dbRoot = await firstValueFrom(dbRoot$.pipe(filter((r) => r !== null && r !== undefined && r !== '')));
    if (!dbRoot) {
      return '';
    }
    const dir = PATH.join(dbRoot, 'records');
    return PATH.join(dir, 'records.json')
  }
  

type Record = {
    file: string;
    type: 'pdf' | 'video';
    progress: any;
    timestamp?: number;
};

type RecordCache = {[key: string]: Record};

let recordCache: RecordCache = {

};

const loadFromCache = async () => {
    try {
        const RECORD_FILE = await getRecordFilePath();
        console.log('loadFromCache RECORD_FILE:', RECORD_FILE);
        if (!RECORD_FILE) {
            return {} as RecordCache;
        }
        const buf = await fs.readFile(RECORD_FILE);
        const recordCache = (JSON.parse(buf.toString()) as RecordCache);
        console.log('loadFromCache succeeded:', recordCache);
        return recordCache;
    } catch(e) {
        console.log('loadFromCache failed:', e);
        return {} as RecordCache;
    }
}

const loadCachePromise = loadFromCache().then(cache => recordCache = cache);

export const saveRecord = async (record: Record) => {
    await loadCachePromise;
    recordCache[record.file] = {...record, timestamp: Date.now().valueOf()};

    const records = Object.values(recordCache);
    if (records.length > CACHE_VOLUME) {
        const recordToClear = records.sort((a, b) => a.timestamp! - b.timestamp!)[0];
        delete recordCache[recordToClear.file];
    }
    const RECORD_FILE = await getRecordFilePath();
    if (!RECORD_FILE) {
        return;
    }
    return writeJSON(recordCache, RECORD_FILE);
}

export const getRecords = async () => {
    await loadCachePromise;
    const records = Object.values(recordCache);
    console.log('getRecords:', records);
    return records.sort((a, b) => b.timestamp! - a.timestamp!);
};
