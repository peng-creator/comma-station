import Parser from 'srt-parser-2';
import { parse } from 'node-html-parser';
import { Subtitle } from '../../types/Subtitle';
import { timeToMilliseconds } from '../../utils/time';

export function srtToSubtitle(content: string) {
  const parser = new Parser();
  const result = parser.fromSrt(content);
  return result
    .map(({ id, startTime, endTime, text }) => {
      const root = parse(`<p>${text}</p>`);
      let textContent = root.querySelector('p')?.textContent;
      if (textContent) {
        text = textContent.split(' ').map((w) => {
          const isUpperCase = /^[^a-z]+$/.test(w);
          if (isUpperCase) {
            return w.toLocaleLowerCase();
          }
          return w;
        }).join(' ')
      }
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
