import { ipcMain } from 'electron';
import { ZoneDefinition } from './src/types/Zone';
import { loadDirChildren } from './src/resourceLoader';
import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import path from 'path';
import { getSubtitleOfVideo, loadFromFileWithoutCache } from './src/subtitle';
import { Ass } from './src/subtitle/ass/ass';
import bodyParser from 'body-parser';
import { cardsByPage, deleteCardById, getCardCollection, getCardToReview } from './src/card/getCardCollection';
import { getAllCardCollections, saveCard, searchFlashCardCollections } from './src/card/searchCardCollection';
import WebSocket from 'ws';
// const streamer = require("./node-http-streamer/index.js");
// import serveStatic from 'serve-static';
import { networkInterfaces } from 'os';
import { promises as fs } from 'fs';
import { getRecords, saveRecord } from './src/record/record';
import cookieParser from 'cookie-parser';
import { firstValueFrom } from 'rxjs';
import { dbRoot$ } from './state';
import * as http from 'http';

let sessionId = '';
ipcMain.on('ipc-on-session-id-change', async (event, arg) => {
  if (arg.length > 0) {
    sessionId = arg[0];
  }
});

let configStore: any = {};
ipcMain.on('ipc-on-config-store-change', (event, arg) => {
  if (arg.length > 0) {
    configStore = arg[0];
  }
});

const webHome = path.resolve(__dirname, '../../comma-web');

const app = express();

app.use(cookieParser());
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json({
  limit: '10mb'
}));

app.get('/access/:code', (req, res) => {
  console.log('access code:', req.params.code);
  if (req.params.code === configStore.accessCode) {
    res.cookie('sessionId', sessionId);
  }
  res.redirect('/');
});

app.get('/ipaddress', (req, res) => {
  const nets = networkInterfaces();
  const results: string[] = [];
  for (const name of Object.keys(nets)) {
    let netList = nets[name];
    if (netList === undefined) {
      break;
    }
    for (const net of netList) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
      if (net.family === familyV4Value && !net.internal ) {
          const addressSplitted = net.address.split('.');
          const seg = addressSplitted.pop();
          if (seg !== undefined && seg !== '1') {
            results.push(net.address);
          }
      }
    }
  }
  res.send(results[0] || '');
});

app.get('/manifest.json', (req, res) => {
  const { sessionId: _sessionId } = req.cookies;
  console.log('getting manifest.json, _sessionId:', _sessionId);
  res.json({
    "name": "Comma",
    "short_name": "Comma",
    "start_url": `/?sessionId=${_sessionId}`,
    "display": "fullscreen",
    "background_color": "#f578a7",
    "theme_color": "#f578a7",
    "icons": [
      {
        "src": "assets/icon/favicon.png",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/png"
      }
    ]
  }
  );
});

app.use((req, res, next) => {
  next();
  return;
  console.log('in root middleware, req.path:', req.path);
  if (req.path === '/') {
    next();
    return;
  }
  const { sessionId: _sessionId } = req.cookies;
  console.log('in root middleware, sessionId:', _sessionId);
  if (_sessionId === sessionId) {
    console.log('valid request');
    next();
    return;
  }
  if (req.path.startsWith('/static/')) {
    next();
    return;
  }
  if (req.path.startsWith('/assets/')) {
    next();
    return;
  }
  if (['/assets/icon/favicon.png'].includes(req.path)) {
    next();
    return;
  }
  console.log('invalid request');
  res.status(401);
  res.send('请扫描Comma Station二维码重新访问');
});

expressWs(app);

app.get('/api/resource/children', (req, res) => {
  loadDirChildren('').then((data) => {
    res.json(data);
  });
});

app.get('/api/resource/children/:dir', (req, res) => {
  loadDirChildren(req.params.dir).then((data) => {
    res.json(data);
  });
});

app.get('/resource/*', (req, res) => {
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
  firstValueFrom(dbRoot$).then((dbRoot) => {
    if (!dbRoot) {
      res.status(404);
      return;
    }
    res.sendFile(path.join(dbRoot, decodeURIComponent(req.url)));
  });
});

process.on("uncaughtException", (e) => console.log("uncaughtException:", e));

// getting the subtitle of the video filePath, filePath 为resource的子路径
app.get('/api/video/subtitle/:filePath', (req, res) => {
  firstValueFrom(dbRoot$).then((dbRoot) => {
    if (!dbRoot) {
      res.json([]);
      return;
    }
    const videoPath = path.join(dbRoot, 'resource', req.params.filePath); 
    console.log('start trying to loading subtitle of video:', videoPath);
    getSubtitleOfVideo(videoPath).then((result) => {
      console.log('send back subtitle of ', videoPath, ', subtitle length:', result.length);
      res.json(result);
    }).catch(e => {
      res.status(500);
      res.json([]);
    });
  });
});

// getting the subtitle of the video filePath, filePath 为resource的子路径
app.post('/api/video/subtitle/:filePath', (req, res) => {
  firstValueFrom(dbRoot$)
  .then((dbRoot) => {
    if (!dbRoot) {
      res.send('success');
      return;
    }
    const videoPath = path.join(dbRoot, 'resource', req.params.filePath);
    console.log('saving subtitle of video:', videoPath);
    console.log('subtitle:', req.body);
    Ass.saveByVideoSrc(videoPath, req.body).then(() => {
      res.send('success');
    });
  });
});

// getting the subtitle of the video filePath, filePath 为resource的子路径
app.get('/api/reload/video/subtitle/:filePath', (req, res) => {
  firstValueFrom(dbRoot$)
  .then((dbRoot) => {
    if (!dbRoot) {
      res.send('success');
      return;
    }
    const videoPath = path.join(dbRoot, 'resource', req.params.filePath); 
    console.log('start trying to loading subtitle of video:', videoPath);
    loadFromFileWithoutCache(videoPath).then((result) => {
      console.log('send back subtitle of ', videoPath, ', subtitle length:', result.length);
      res.json(result);
    }).catch(e => {
      res.status(500);
      res.json([]);
    });
  });
});

app.get('/api/review/card/:time', (req, res) => {
  getCardToReview(parseInt(req.params.time) || Date.now()).then((data) => {
    res.json(data);
  }).catch(() => {
    res.json([]);
  });
});

app.delete('/api/card/:cardId', (req, res) => {
  console.log('delete card by id:', req.params.cardId);
  deleteCardById(req.params.cardId)
  .then((r) => {
    res.json(r);
  }).catch(e => {
    res.status(500);
    res.json(e.message);
  });
});

app.get('/api/card/collectionName/:search', (req, res) => {
  const search = req.params.search;
  if (search) {
    const result = searchFlashCardCollections(search);
    res.json(result);
  } else {
    res.status(400);
  }
});

app.get('/api/card/:pageSize/:pageNumber', (req, res) => {
  cardsByPage(parseInt(req.params.pageSize), parseInt(req.params.pageNumber)).then((data) => {
    res.json(data);
  }).catch(() => {
    res.json([]);
  });
});

app.get('/api/card/:collectionName', (req, res) => {
  console.log('getCardCollection:', req.params.collectionName);
  getCardCollection(req.params.collectionName)
  .then((result) => {
    console.log('getCardCollection result:', result);
    res.json(result);
  }).catch(e => {
    res.status(500);
    res.json([]);
  });
});

app.get('/api/card', (req, res) => {
  res.json(getAllCardCollections());
});

app.post('/api/card', (req, res) => {
  saveCard(req.body).then(() => {
    res.send('success');
  }).catch(e => {
    res.status(500);
    res.send(e);
  })
});

let zones: Map<string, ZoneDefinition> = new Map();

setInterval(() => {
  zones = [...zones.values()].filter(zone => {
    return Date.now().valueOf() - zone.registerTimeStamp < 60000;
  }).reduce((acc, curr) => {
    acc.set(curr.id, curr);
    return acc;
  }, new Map());
}, 10000);

app.get('/api/zone', (req, res) => {
  res.json([...zones.values()]);
});

app.delete('/api/zone/:id', (req, res) => {
  zones.delete(req.params.id)
  res.send('success');
});

app.post('/api/zone/register', (req, res) => {
  for (let zone of req.body) {
    zones.set(zone.id, zone);
  }
  res.send('success');
});

app.post('/api/record', (req, res) => {
  saveRecord(req.body).then(() => {
    res.send('success');
  }).catch(e => {
    res.status(500);
    res.send(e);
  })
});

app.get('/api/record', (req, res) => {
  getRecords().then((records) => {
    res.json(records);
  }).catch(e => {
    res.status(500);
    res.send(e);
  })
});



app.post('/api/error', (req, res) => {
  firstValueFrom(dbRoot$)
  .then(async (dbRoot) => {
    if (!dbRoot) {
      res.send('success');
      return;
    }
    const ERROR_LOG_PATH = path.join(dbRoot, 'error.log');
    try {
      await fs.stat(ERROR_LOG_PATH);
    } catch(e) {
      await fs.writeFile(ERROR_LOG_PATH, '');
    }
    if (req.body) {
      fs.appendFile(ERROR_LOG_PATH, req.body.error + '\n');
    }
    res.send('success');
  });
});

app.get('/*', (req, res) => {
  console.log('req.path', req.path);
  const filePath = path.join(webHome, req.path);
  const webRoot = path.join(webHome, '/');
  console.log('filePath:', filePath);
  if (filePath.startsWith(webHome)) {
    if (filePath === webRoot) {
      const { sessionId: _sessionId } = req.query || {};
      console.log('req.query:', req.query);
      console.log('_sessionId === sessionId:', _sessionId === sessionId);
      console.log('_sessionId:',  _sessionId);
      console.log('sessionId:',  sessionId);
      if (_sessionId === sessionId) {
        res.cookie('sessionId', sessionId);
        res.redirect('/');
        return;
      } else {
        // const { sessionId: _sessionId } = req.cookies;
        // if (_sessionId === sessionId) {
          res.sendFile(path.join(webHome, 'index.html'));
        // } else {
        //   res.status(401);
        //   res.sendFile(path.join(webHome, '401.html'));
        // }
      }
    } else {
      res.sendFile(filePath);;
    }
  } else {
    console.log('file not exists:', filePath);
    res.status(404);
    res.send('');
  }
});
// app.listen(8081);
// const server = https.createServer({ key: selfsignedKeys.private, cert: selfsignedKeys.cert }, app); 
const server = http.createServer(app);     
server.listen(8080);

const wsList = new Set<WebSocket>();
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws: WebSocket) => {
  console.log('new websocket connection!');
  wsList.add(ws);
  ws.on('message', function(msg: string) {
    console.log('websocket connection on message:', msg);
    if (msg === '__ping__') {
      ws.send('__pong__');
      return;
    }
    wsList.forEach((_ws) => {
      if (_ws === ws) {
        return;
      }
      _ws.send(msg);
    })
    console.log(msg);
  });
  ws.on('close', (code, reason) => {
    console.log('websocket connection closed, code', code, ', reason:', reason.length);
    wsList.delete(ws);
  });
  ws.onerror = (err) => {
    console.log('websocket connection on error:', err);
  };
});

