import MiniSearch from 'minisearch';
import PATH from 'path';
import { mkdir } from '../utils/mkdir';
import { promises as fs } from 'fs';
import { v5 as uuidv5 } from 'uuid';
import { FlashCard } from '../types/FlashCard';
import { dbRoot$ } from '../../state';
import { firstValueFrom } from 'rxjs';
import { writeJSON } from '../JsonDB';

export const CARD_COLLECTION_NAMESPACE = '3b671a64-40d5-491e-99b0-da01ff1f3341';


type FlashCardSearchItem = {
  id: string;
};


const getFlashCardDir = async () => {
  const dbRoot = await firstValueFrom(dbRoot$);
  if (!dbRoot) {
    return '';
  }
  return PATH.join(dbRoot, 'flash_cards');
}


type CardIndexMap = { [prop: string]: string };
let cardIndexMapCache: CardIndexMap = {};
let cardCollections: string[] = [];

const reindex = async (flashCardRoot: string) => {
  let nextCardIndexMapCache: CardIndexMap = {};
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
        nextCardIndexMapCache[dir] = card.front.word;
        // console.log('addIndex:', dir, ", word:", card.front.word);
      } catch (e) {
        fs.unlink(PATH.join(cardDir, childFile));
      }
    }
  }
  cardIndexMapCache = nextCardIndexMapCache;
  cardCollections = [...new Set(Object.values(cardIndexMapCache))];
  flashCardMiniSearch.removeAll();
  const indexList = cardCollections.map((id) => {
    return { id };
  });
  console.log('indexList:', indexList);
  addSearchItems(indexList);
  //  console.log(nextCardIndexMapCache);
  writeJSON(cardIndexMapCache, PATH.join(flashCardRoot, 'index.json'));
}


dbRoot$.subscribe({
  next(dbRoot) {
    const L1 = PATH.join(dbRoot, 'flash_cards');
    const resourceDir = PATH.join(dbRoot, 'resource');
    (async () => {
      await mkdir(L1);
      await mkdir(resourceDir);
      await reindex(L1);
    })();
    // const cardIndexMapPromise = fs
    //   .readFile(PATH.join(L1, 'index.json'))
    //   .then((buf) => {
    //     return JSON.parse(buf.toString()) as CardIndexMap;
    //   })
    //   .catch(() => {
    //     return {};
    //   });

    // cardIndexMapPromise
    //   .then((cardIndexMap: { [prop: string]: string }) => {
    //     cardIndexMapCache = cardIndexMap;
    //     const collectionKeywordList = [...new Set(Object.values(cardIndexMap))];
    //     cardCollections = collectionKeywordList;
    //     const indexList = collectionKeywordList.map((id) => {
    //       return { id };
    //     });
    //     addSearchItems(indexList);
    //   })
    //   .catch((e) => {
    //     console.log('加载全部卡片集失败！');
    //   });
    }
});
  

const ids: any = {};

const flashCardMiniSearch = new MiniSearch<FlashCardSearchItem>({
  fields: ['id'], // fields to index for full-text search
  storeFields: ['id'], // fields to return with search results
  tokenize: (s) => s.split(/\W/),
});

export const addSearchItems = (items: FlashCardSearchItem[]) => {
  items = items.filter(({ id }) => {
    return ids[id] === undefined;
  });
  if (items.length > 0) {
    flashCardMiniSearch.addAll(items);
    items.forEach(({ id }) => {
      ids[id] = true;
    });
  }
};

export const searchFlashCardCollections = (keyword: string) => {
  const searchResult = flashCardMiniSearch.search(keyword, { fuzzy: 0.3 });
  console.log('searchResult of keyword:', keyword, ': ', searchResult);
  return searchResult;
};

export const getAllCardCollections = () => cardCollections;

export const saveCard = async (cardToSave: FlashCard) => {
  // saveCard$.next(cardToSave);
  // 加入到搜索库
  addSearchItems([
    {
      id: cardToSave.front.word,
    },
  ]);
  // 保存卡片。
  cardToSave.clean = false;
  cardToSave.hasChanged = false;
  const keyword = cardToSave.front.word;
  const collectionId = uuidv5(keyword, CARD_COLLECTION_NAMESPACE);
  cardIndexMapCache[collectionId] = keyword;
  const collectionKeywordList = [...new Set(Object.values(cardIndexMapCache))];
  cardCollections = collectionKeywordList;
  const L1 = await getFlashCardDir();
  if (!L1) {
    return;
  }
  const dir = PATH.join(L1, collectionId);
  return mkdir(dir)
    .then(() => {
      const _cardToSave = { ...cardToSave, hasChanged: false };
      console.log('cardToSave:', _cardToSave);
      return fs.writeFile(
        PATH.join(dir, `${_cardToSave.id}.json`),
        JSON.stringify(_cardToSave)
      );
    })
    .then(() => {
      return fs.writeFile(
        PATH.join(L1, 'index.json'),
        JSON.stringify(cardIndexMapCache)
      );
    })
    .then(() => {
      cardToSave.hasChanged = false;
    })
    .catch((e) => {
      console.log('保存卡片失败:', e);
    });
};
