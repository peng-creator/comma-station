export function parseTime(time: string) {
  const t = time.split(':');
  const h = parseInt(t[0], 10);
  const m = parseInt(t[1], 10);
  const s = parseInt(t[2], 10);
  return  h * 3600 + m * 60 + s * 1;
}
