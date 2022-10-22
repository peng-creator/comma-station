import Parser from 'srt-parser-2';
import { Subtitle } from '../../types/Subtitle';
import { timeToMilliseconds } from '../../utils/time';
import { JSDOM } from 'jsdom';

export function srtToSubtitle(content: string) {
  const parser = new Parser();
  const result = parser.fromSrt(content);
  return result
    .map(({ id, startTime, endTime, text }) => {
      const dom = new JSDOM(`<!DOCTYPE html><p>${text}</p>`);
      text = dom.window.document.querySelector("p")?.textContent?.toLowerCase() || text;
      return {
        id,
        start: timeToMilliseconds(startTime.replace(',', '.')),
        end: timeToMilliseconds(endTime.replace(',', '.')),
        subtitles: [text.replace(/\s/g, ' ')],
      };
    })
    .reduce((acc, curr) => {
      let last = acc[acc.length - 1];
      if (last && last.subtitles[0].endsWith(',')) {
        last.end = curr.end;
        last.subtitles[0] = `${last.subtitles[0]} ${curr.subtitles[0]}`;
      } else {
        acc.push(curr);
      }
      return acc;
    }, [] as Subtitle[]);
}
