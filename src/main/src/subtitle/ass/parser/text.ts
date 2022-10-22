import { isDraw } from './tags';

export function parseText(text: string) {
  const pairs = text.split(/{([^{}]*?)}/);
  const parsed: {tags?: any[]; text: string; drawing?: any[]}[] = [];
  if (pairs[0].length) {
    parsed.push({ tags: [], text: pairs[0], drawing: [] });
  }
  console.log('pairs:', pairs);
  for (let i = 1; i < pairs.length; i += 2) {
    const isDrawing = isDraw(pairs[i]);
    if (isDrawing) {
      console.log('isDrawing');
    }
    parsed.push({
      text: isDrawing ? '' : pairs[i + 1],
    });
  }
  return {
    raw: text,
    combined: parsed.map((frag) => frag.text).join(''),
    parsed,
  };
}
