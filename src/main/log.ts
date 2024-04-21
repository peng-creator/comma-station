import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';

const appPath = app.getPath('userData');
// shell.openPath(appPath);

// eslint-disable-next-line import/prefer-default-export
export const logToFile = (...content: unknown[]) => {
  fs.appendFileSync(
    path.join(appPath, 'comma-log'),
    `${content
      .map((s) => {
        if (typeof s === 'object') {
          return JSON.stringify(s, null, 2);
        }
        return s;
      })
      .join(' ')}\n`
  );
  console.log( ...content);
};
