/* eslint-disable import/prefer-default-export */
import { promises as fs } from 'fs';
import jschardet from 'jschardet';

import { writeJSON } from '../../JsonDB';
import { parseAssText } from './ass_util';

export class Ass {
  // file must end with .mp4
  static saveByVideoSrc = async (file: string, subtitleContent: any[]) => {
    return writeJSON(subtitleContent, `${file.slice(0, -4)}.json`);
  };

  static loadBySrc = async (file: string) => {
    const res = await fs.readFile(file);
    const { encoding } = jschardet.detect(res);
    return new Ass(res.toString(encoding as BufferEncoding)).parse();
  };

  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse() {
    return parseAssText(this.source).sort((a, b) => a.start - b.start);
  }
}
