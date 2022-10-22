export function parseDrawing(text: string) {
  if (!text) return [];
  return (
    text
      .toLowerCase()
      // numbers
      .replace(/([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/g, ' $1 ')
      // commands
      .replace(/([mnlbspc])/g, ' $1 ')
      .trim()
      .replace(/\s+/g, ' ')
      .split(/\s(?=[mnlbspc])/)
      .map((cmd) =>
        cmd.split(' ').filter((x, i) => !(i && Number.isNaN(parseInt(x))))
      )
  );
}
