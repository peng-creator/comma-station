export function parseFormat(text: string) {
  const matchResult = text.match(/Format\s*:\s*(.*)/i);
  if (matchResult !== null && matchResult.length > 1) {
    return matchResult[1].split(/\s*,\s*/);
  }
  return [];
}
