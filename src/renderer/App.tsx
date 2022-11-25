import { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import qrcode from 'qrcode-generator';
import { v4 as uuidv4 } from "uuid";
import { Button } from 'antd';

const initDbRoot = localStorage.getItem('dbRoot');

if (initDbRoot !== null) {
  window.electron.ipcRenderer.sendMessage('ipc-on-got-db-root', [initDbRoot]);
}

const Main = () => {
  const [dbRoot, setDbRoot] = useState(initDbRoot);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || uuidv4());
  const [commaWebAddress, setCommaWebAddress] = useState('');
  const [showSessionRefreshMsg, setShowSessionRefreshMsg] = useState(false);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
      // notify main process to update
      window.electron.ipcRenderer.sendMessage('ipc-on-session-id-change', [sessionId]);
    }
  }, [sessionId]);

  useEffect(() => {
    fetch('http://localhost:8080/ipaddress')
      .then((res) => res.text())
      .then((ip) => {
        const commaWebAddress = `http://${ip}:8080/?sessionId=${sessionId}`;
        setCommaWebAddress(commaWebAddress);
        const container = document.querySelector('#qrcode');
        if (container) {
          const typeNumber = 4;
          const errorCorrectionLevel = 'L';
          const qr = qrcode(typeNumber, errorCorrectionLevel);
          qr.addData(commaWebAddress);
          qr.make();
          container.innerHTML = qr.createImgTag();
        }
      });
  }, [sessionId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        padding: '20px',
      }}
    >
      <div>Comma 英语学习工作站已就绪 <Button onClick={() => {
        window.electron.ipcRenderer.sendMessage('ipc-open-comma', [commaWebAddress]);
      }}>本地访问</Button></div>
      <div>移动端访问，请扫下方二维码：</div>
      {showSessionRefreshMsg && <div style={{color: 'rgb(242, 71, 71)', background: '#fff'}}>二维码已刷新，所有连接设备已断开！请重新扫描下方二维码：</div>}
      <div id="qrcode" style={{display: 'flex', justifyContent: 'center'}}/>
      <div>谨防数据泄露，请勿将访问地址或此二维码传于他人！</div>
      <div>
        您可以重新开启会话，将所有已连接设备断开： <Button onClick={() => {
          setSessionId(uuidv4());
          setShowSessionRefreshMsg(true);
          setTimeout(() => {
            setShowSessionRefreshMsg(false);
          }, 5000);
        }}>重开会话</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>数据目录</div>
        <div style={{ margin: '10px' }}>{dbRoot || '未选取'}</div>
        <div style={{ margin: '10px' }}>
          <Button
            onClick={() => {
              // calling IPC exposed from preload script
              window.electron.ipcRenderer.once('ipc-select-dir', (...args) => {
                const selectedDbRoot = args[0] as string;
                localStorage.setItem('dbRoot', selectedDbRoot);
                setDbRoot(selectedDbRoot);
              });
              window.electron.ipcRenderer.sendMessage('ipc-select-dir', []);
            }}
          >
            {dbRoot ? '更换' : '设置'}
          </Button>
          {dbRoot !== null && (
            <Button
              onClick={() => {
                window.electron.ipcRenderer.sendMessage('ipc-show-dir', [
                  dbRoot,
                ]);
              }}
            >
              打开
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
      </Routes>
    </Router>
  );
}
