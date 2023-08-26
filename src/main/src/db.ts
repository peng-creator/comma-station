import PATH from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { dbRoot$ } from '../state';
import { EMPTY, catchError, filter, from, shareReplay, switchMap } from 'rxjs';

sqlite3.verbose();

export const db$ = dbRoot$.pipe(
    filter((dbRoot) => dbRoot !== null && dbRoot !== undefined && dbRoot !== ''),
    switchMap((dbRoot) => {
        async function initDB() {
            const dbPath = PATH.join(dbRoot, 'database.db');
            const db = await open({
                filename: dbPath,
                driver: sqlite3.cached.Database
            });
            console.log('db:', dbPath);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS flash_card (
                    id  TEXT PRIMARY KEY,
                    title TEXT,
                    subtitles TEXT,
                    pdfNote TEXT,
                    back TEXT,
                    dueDate BIGINT,
                    interval INTEGER,
                    repetition INTEGER,
                    efactor REAL,
                    createTime BIGINT,
                    updateTime BIGINT
                );
            `);
            await db.exec(`
                CREATE INDEX IF NOT EXISTS flash_card_due_date ON flash_card(dueDate, updateTime);
            `);
            await db.exec(`
                CREATE INDEX IF NOT EXISTS flash_card_title ON flash_card(title);
            `);
            // await db.exec(`
            //     Drop table TV_show_collection;
            // `);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS TV_show_collection (
                    seasonDir  TEXT PRIMARY KEY,
                    genres TEXT,
                    videoInfo TEXT,
                    seasonInfo TEXT,
                    updateTime BIGINT
                );
            `);
            return db;
        }
        return from(initDB());
    }),
    catchError((e) => {
        console.log('load db failed: ', e);
        return EMPTY;
    }),
    shareReplay(1),
);

export const thirdPartyData$ = dbRoot$.pipe(
    filter((dbRoot) => dbRoot !== null && dbRoot !== undefined && dbRoot !== ''),
    switchMap((dbRoot) => {
        async function initDB() {
            const dbPath = PATH.join(dbRoot, 'third_party_data.db');
            const db = await open({
                filename: dbPath,
                driver: sqlite3.cached.Database
            });
            console.log('db:', dbPath);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS third_party_request_cache (
                    id  TEXT PRIMARY KEY,
                    content TEXT
                );
            `);
            return db;
        }
        return from(initDB());
    }),
    catchError((e) => {
        console.log('load thirdPartyData db failed: ', e);
        return EMPTY;
    }),
    shareReplay(1),
);

thirdPartyData$.subscribe({
    next(db) {
        console.log('thirdPartyData db created:', db);
    }
});

db$.subscribe({
    next(db) {
        console.log('db created:', db);
    }
});

export const base64ToObject = (base64: string) => {
    return JSON.parse(Buffer.from(base64, 'base64').toString());
};
  
export  const base64ToString = (base64: string) => {
    return Buffer.from(base64, 'base64').toString();
};
  
export const objectToBase64 = (object: any) => {
    return Buffer.from(JSON.stringify(object)).toString('base64');
};

export const stringToBase64 = (str: any) => {
    return Buffer.from(str).toString('base64');
};
  