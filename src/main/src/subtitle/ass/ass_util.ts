import { Subtitle } from './../../types/Subtitle';
import { parse } from './parser';

export function parseAssText(assText: string): Subtitle[] {
  const localAssText = assText.replace(/Dialogue:/gi, '\nDialogue:');
  console.log('try to parse:');
  let parsedASS = parse(localAssText);
  if (parsedASS === null) {
    return [];
  }
  console.log('parsedAss:', parsedASS);
  try {
    const { dialogue } = parsedASS.events;
    console.log('parseAssText got dialogue:', dialogue);
    const result = dialogue.map(({ End, Start, Text }, i) => {
      const { parsed } = Text;
      const subtitles = parsed
        .map(({ text }) => text.replace(/\\N/g, ' ').toLowerCase())
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
    console.log('parseAssText to subtitle list result:', result);
    return result;
  } catch (e) {
    console.error('parseAssText to subtitle list error:', e);
    return [];
  }
}
