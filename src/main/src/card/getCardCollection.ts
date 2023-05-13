import { FlashCard } from '../types/FlashCard';
import { firstValueFrom } from 'rxjs';
import { base64ToObject, base64ToString, db$, stringToBase64 } from '../db';


export const mapCardRecord = (record: any) => {
  const mapTo = {
    ...record,
    front: {
      word: base64ToString(record.title),
      subtitles: base64ToObject(record.subtitles),
      pdfNote: base64ToObject(record.pdfNote),
    },
    back: base64ToString(record.back),
    title: base64ToString(record.title),
  };
  delete mapTo.subtitles;
  delete mapTo.pdfNote;
  return mapTo as FlashCard;
}

/**
 * 查询 collection 下的全部card
 * @param title collection 标题
 * @returns flashCards
 */
export const getCardCollection = async (title: string) => {

  const db = await firstValueFrom(db$);
  console.log('getCardCollection from db:', db);
  if (!db) {
    return [];
  }
  const stmt = await db.prepare(
    'SELECT * FROM flash_card WHERE title = @title'
  );
  console.log('search title:', title);
  console.log('search title to base64:', stringToBase64(title));
  const result = await stmt.all({ '@title': stringToBase64(title) });
  console.log('result:', result);
  try {
    return result.map(r => mapCardRecord(r));
  } catch(e) {
    console.log('e on getCardCollection:', e);
    return [];
  }
};

export const getCardToReview = async (date: number) => {
  const db = await firstValueFrom(db$);
  const stmt = await db.prepare(
    'SELECT * FROM flash_card WHERE dueDate < @dueDate limit 100',
  );
  const result = await stmt.all({ '@dueDate': date });
  return result.map(r => mapCardRecord(r));
};

export const cardsByPage = async (pageSize: number, pageNumber: number) => {
  const db = await firstValueFrom(db$);
  const stmt = await db.prepare(
    'SELECT * FROM flash_card ORDER BY dueDate ASC LIMIT @limit OFFSET @offset',
  );
  const result = await stmt.all({ '@limit': pageSize, '@offset': pageSize * (pageNumber - 1) });
  return result.map(r => mapCardRecord(r));
};

export const deleteCardById = async (cardId: string) => {
  const db = await firstValueFrom(db$);
  const stmt = await db.prepare(
    'DELETE FROM flash_card where id=@id',
  );
  return await stmt.run({ '@id': cardId });
}
