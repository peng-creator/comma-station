export function parseEffect(text: string) {
  const param = text
    .toLowerCase()
    .trim()
    .split(/\s*;\s*/);
  if (param[0] === 'banner') {
    return {
      name: param[0],
      delay: parseInt(param[1]) || 0,
      leftToRight: parseInt(param[2]) || 0,
      fadeAwayWidth: parseInt(param[3]) || 0,
    };
  }
  if (/^scroll\s/.test(param[0])) {
    return {
      name: param[0],
      y1: Math.min(parseInt(param[1]), parseInt(param[2])),
      y2: Math.max(parseInt(param[1]), parseInt(param[2])),
      delay: parseInt(param[3]) || 0,
      fadeAwayHeight: parseInt(param[4]) || 0,
    };
  }
  return null;
}
