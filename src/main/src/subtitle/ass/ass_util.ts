import { Subtitle } from './../../types/Subtitle';
import { parse } from './parser';

export function parseAssText(assText: string): Subtitle[] {
  const localAssText = assText.replace(/Dialogue:/gi, '\nDialogue:');
  console.log('try to parse:');
  let parsedASS = parse(localAssText);
  if (parsedASS === null) {
    return [];
  }
  try {
    const { dialogue } = parsedASS.events;
    const result = dialogue.map(({ End, Start, Text }, i) => {
      const { parsed } = Text;
      const subtitles = parsed
        .map(({ text }) => {
          return text.replace(/\\N/g, ' ').split(' ').map((w) => {
            const isUpperCase = /^[^a-z]+$/.test(w);
            if (isUpperCase) {
              return w.toLocaleLowerCase();
            }
            return w;
          }).join(' ');
      })
        .filter((t) => t.length > 0);
      let localStart;
      let localEnd;
      if (Number.isNaN(Start)) {
        localStart = 0;
      } else {
        localStart = Start * 1000;
      }
      if (Number.isNaN(End)) {
        localEnd = dialogue[i + 1].Start * 1000 - 1;
      } else {
        localEnd = End * 1000;
      }
      return {
        start: localStart,
        end: localEnd,
        subtitles,
      };
    });
    return result;
  } catch (e) {
    console.error('parseAssText to subtitle list error:', e);
    return [];
  }
}
