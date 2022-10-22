export function timeToMilliseconds(time: string) {
  const [_h, _m, _sm] = time.split(':');
  const [_s, _mm] = _sm.split('.');
  let h = parseInt(_h, 10);
  let m = parseInt(_m, 10);
  let s = parseInt(_s, 10);
  let mm = parseInt(_mm, 10);
  if (h < 0) {
    h = 0;
  }
  if (m < 0) {
    m = 0;
  }
  if (s < 0) {
    s = 0;
  }
  if (mm < 0) {
    mm = 0;
  }
  return (h * 60 * 60 + m * 60 + s) * 1000 + mm;
}

export function secondsToTime(seconds: number) {
  const localSeconds = parseInt(`${seconds}`, 10);
  const h = parseInt(`${localSeconds / (60 * 60)}`, 10);
  const m = parseInt(`${localSeconds / 60}`, 10) - h * 60;
  const s = seconds % 60;
  return `${(h + '').padStart(2, '0')}:${(m + '').padStart(2, '0')}:${(
    s + ''
  ).padStart(2, '0')}`;
}

export function millisecondsToTime(millseconds: number) {
  const localMillseconds = parseInt(`${millseconds}`, 10);
  const mm = localMillseconds % 1000;
  const seconds = (localMillseconds - mm) / 1000;
  return `${secondsToTime(seconds)}.${mm}`;
}

export function timeDifference(a: string, b: string) {
  return Math.abs(timeToMilliseconds(b) - timeToMilliseconds(a));
}
