import MiniSearch from 'minisearch';
import PATH from 'path';
import { promises as fs } from 'fs';
import { FlashCard } from '../types/FlashCard';
import { firstValueFrom } from 'rxjs';
import { base64ToString, db$, objectToBase64, stringToBase64 } from '../db';
import { dbRoot$ } from '../../state';

export const CARD_COLLECTION_NAMESPACE = '3b671a64-40d5-491e-99b0-da01ff1f3341';


type FlashCardSearchItem = {
  id: string;
};

const cardCollections: Set<string> = new Set();

const reindex = async () => {
  const dbRoot = await firstValueFrom(dbRoot$);
  if (!dbRoot) {
    return;
  }
  const flashCardRoot = PATH.join(dbRoot, 'flash_cards');
  const res = await fs.readdir(flashCardRoot);
  for (let dir of res) {
    if (dir.startsWith('.') || dir.endsWith('json')) {
      continue;
    }
    const cardDir = PATH.join(flashCardRoot, dir);
    const cardDirStat = await fs.stat(cardDir);
    if (!cardDirStat.isDirectory()) {
      continue;
    }
    const childFiles = await fs.readdir(cardDir);
    let files = childFiles.filter((file) => {
      return file.endsWith('.json') && !file.startsWith('.') && file.length === 41;
    });
    for (let childFile of files) {
      const cardBuf = await fs.readFile(PATH.join(cardDir, childFile));
      try {
        const card: FlashCard = JSON.parse(cardBuf.toString());
        console.log('save card:', card);
        cardCollections.add(card.front.word);
        await saveCard(card);
      } catch (e) {
        // fs.unlink(PATH.join(cardDir, childFile));
        console.log('saveCard error:', e);
      }
    }
  }
  const indexList = [...cardCollections].map((id) => {
    return { id };
  });
  console.log('indexList:', indexList);
  addSearchItems(indexList);
}

db$.subscribe({
  async next(db) {
    if (db) {
      const { c } = await db.get(`select count(1) as c from flash_card`);
      console.log('count of flash_card:', c, typeof c);
      if (c === 0) {
        reindex();
      } else {
        const titles = await db.all(`select distinct title from flash_card`);
        addSearchItems(titles.map(({title}) => {
          return {id: base64ToString(title)};
        }));
      }
    }
  },
})

const flashCardMiniSearch = new MiniSearch<FlashCardSearchItem>({
  fields: ['id'], // fields to index for full-text search
  storeFields: ['id'], // fields to return with search results
  tokenize: (s) => s.split(/\W/),
});

const addedTitles: any = {}; // 已索引的卡片标题集合
export const addSearchItems = (items: FlashCardSearchItem[]) => {
  items = items.filter(({ id }) => {
    return addedTitles[id] === undefined;
  });
  if (items.length > 0) {
    flashCardMiniSearch.addAll(items);
    items.forEach(({ id }) => {
      addedTitles[id] = true;
      cardCollections.add(id);
    });
  }
};

export const searchFlashCardCollections = (keyword: string) => {
  const searchResult = flashCardMiniSearch.search(keyword, { fuzzy: 0.3 });
  console.log('searchResult of keyword:', keyword, ': ', searchResult);
  return searchResult;
};

export const getAllCardCollections = () => {
  return [...cardCollections];
};

export const saveCard = async (cardToSave: FlashCard) => {
  // 加入到搜索库
  addSearchItems([
    {
      id: cardToSave.front.word,
    },
  ]);
  const keyword = cardToSave.front.word;
  const db = await firstValueFrom(db$);
    try {
      await db.exec(`INSERT INTO flash_card VALUES (
        '${cardToSave.id}', 
        '${stringToBase64(keyword)}', 
        '${objectToBase64(cardToSave.front.subtitles)}', 
        '${objectToBase64(cardToSave.front.pdfNote)}', 
        '${stringToBase64(cardToSave.back)}', 
        ${cardToSave.dueDate}, 
        ${cardToSave.interval}, 
        ${cardToSave.repetition}, 
        ${cardToSave.efactor}, 
        ${Date.now()},
        ${Date.now()}
      )`);
    } catch(e) {
      await db.exec(`UPDATE flash_card SET 
      title='${stringToBase64(keyword)}',
      subtitles='${objectToBase64(cardToSave.front.subtitles)}',
      pdfNote='${objectToBase64(cardToSave.front.pdfNote)}',
      back='${stringToBase64(cardToSave.back)}',
      dueDate=${cardToSave.dueDate},
      interval=${cardToSave.interval},
      repetition=${cardToSave.repetition},
      efactor=${cardToSave.efactor},
      updateTime=${Date.now()}
    WHERE id='${cardToSave.id}' `);
    }
};
