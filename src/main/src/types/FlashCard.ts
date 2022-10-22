import { SuperMemoItem } from 'supermemo';
import { PDFNote } from './PDFNote';
import { Subtitle } from './Subtitle';

export interface FlashCard extends SuperMemoItem {
  id: string;
  front: {
    word: string;
    subtitles: Subtitle[];
    pdfNote: PDFNote[];
  };
  back: string;
  dueDate: number;
  clean?: boolean; // 是否为初始状态
  hasChanged?: boolean; // 是否发生变化
}
