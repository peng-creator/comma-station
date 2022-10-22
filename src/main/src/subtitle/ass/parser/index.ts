import { parseDialogue } from './dialogue';
import { parseFormat } from './format';

type Dialogue = {
  End: number;
  Start: number;
  Text: { parsed: { text: string }[]; [key: string]: any };
};

type Styles = {format: any[]; style: any[]};
type Events = {format: any[]; comment: any[]; dialogue: Dialogue[]};

type Tree = {
  info: any;
  styles: Styles;
  events: Events;
};

export function parse(text: string) {
  const tree: Tree = {
    info: {},
    styles: { format: [], style: [] },
    events: { format: [], comment: [], dialogue: [] },
  };
  const lines = text.split(/\r?\n/);
  let state = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^;/.test(line)) continue;

    if (/^\[Script Info\]/i.test(line)) state = 1;
    else if (/^\[V4\+? Styles\]/i.test(line)) state = 2;
    else if (/^\[Events\]/i.test(line)) state = 3;
    else if (/^\[.*\]/.test(line)) state = 0;
    if (state !== 3) {
      console.log('state !==3');
      continue;
    }
    if (state === 3) {
      if (/^Format\s*:/i.test(line)) {
        tree.events.format = parseFormat(line);
      }
      if (/^(?:Comment|Dialogue)\s*:/i.test(line)) {
        const matchResult = line.match(/^(\w+?)\s*:\s*(.*)/i);
        if (matchResult !== null) {
          const [, key, value] = matchResult;
          tree.events[(key.toLowerCase() as keyof Events)].push(
            parseDialogue(value, tree.events.format)
          );
        }
      }
    }
  }

  return tree;
}
