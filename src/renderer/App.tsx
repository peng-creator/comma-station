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

  const [configStore, setConfigStore] = useState<any>({});
  const [showAccessCode, setShowAccessCode] = useState(false);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
      // notify main process to update
      window.electron.ipcRenderer.sendMessage('ipc-on-session-id-change', [sessionId]);
    }
  }, [sessionId]);

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('ipc-on-config-store-change', [configStore]);
  }, [configStore]);

  useEffect(() => {
    fetch('http://localhost:8080/ipaddress')
      .then((res) => res.text())
      .then((ip) => {
        const commaWebAddress = `http://${ip}:8080/`;
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
      <h1 style={{
        color: '#fff'
      }}>Comma 英语学习工作站已准备就绪!</h1>
      <h2 style={{
        color: '#fff',
        marginTop: '14px'
      }}>数据</h2>
      <div style={{height: '0.5px', background: '#fff'}}></div>

      <div style={{ padding: '14px' }}>
        <div style={{display: 'flex', alignItems: 'center'}}>
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
        <div>数据目录用于存放学习资源、浏览记录、卡片等，请定期备份，谨防数据丢失！</div>
      </div>
      <h2 style={{
        color: '#fff',
        marginTop: '14px'
      }}>访问</h2>
      <div style={{height: '0.5px', background: '#fff'}}></div>

      <div style={{padding: '14px'}}>
        <div style={{marginTop: '14px'}}>
          浏览器访问：<a href={commaWebAddress} target="_blank">浏览器访问</a>
        </div>
        <div style={{marginTop: '14px'}}>子窗口访问： <Button onClick={() => {
          window.electron.ipcRenderer.sendMessage('ipc-open-comma', [commaWebAddress]);
        }}>子窗口访问</Button></div>
        <div style={{display: 'flex', marginTop: '14px'}}>
          <div style={{marginRight: '18px'}}>移动端访问：</div>
          <div id="qrcode" style={{display: 'flex',}}/>
        </div>
      </div>

      <h2 style={{
        color: '#fff',
        marginTop: '14px'
      }}>安全</h2>
      <div style={{height: '0.5px', background: '#fff'}}></div>
      <div style={{padding: '14px'}}>
        <div style={{marginTop: '14px'}}>访问码：客户端需要输入访问码才可以连接成功。谨防数据泄露，请勿将访问码传于他人！ {!showAccessCode && <Button onClick={() => {
          const newAccessCode = () => {
            const code = (parseInt(Math.random() * 10000 + '') + '').padStart(4, '0');
            setConfigStore({...configStore, accessCode: code});
          };
          newAccessCode();
          setShowAccessCode(true);
          setTimeout(() => {
            setShowAccessCode(false);
            newAccessCode();
          }, 60 * 1000);
        }}>显示访问码</Button>}</div>
        
        {showAccessCode && configStore.accessCode && <div>
          <div>{configStore.accessCode}</div>
        </div>}
        {showSessionRefreshMsg && <div style={{color: 'rgb(242, 71, 71)', background: '#fff'}}>会话已刷新，所有连接设备已断开！</div>}
        <div>
          您可以重新开启会话，将所有已连接设备断开： <Button onClick={() => {
            setSessionId(uuidv4());
            setShowSessionRefreshMsg(true);
            setTimeout(() => {
              setShowSessionRefreshMsg(false);
            }, 5000);
          }}>重开会话</Button>
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
