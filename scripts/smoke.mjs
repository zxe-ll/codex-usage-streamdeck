import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('com.ayato.codexusage.sdPlugin/manifest.json', 'utf8'));

// Simulated Stream Deck host: validates the bundled SDK and real usage path.
const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
await new Promise(resolve => server.once('listening', resolve));
let child;
let timer;
try {
  await new Promise((resolveTest, reject) => {
    timer = setTimeout(() => reject(new Error('Smoke timeout')), 40000);
    let layout = false;
    server.on('connection', socket => socket.on('message', bytes => {
      const message = JSON.parse(bytes.toString());
      if (message.event === 'registerPlugin') {
        socket.send(JSON.stringify({ event: 'willAppear', action: 'com.ayato.codexusage.infobar',
          context: 'smoke-infobar', device: 'smoke-neo', payload: {
            controller: 'Neo', coordinates: { column: 0, row: 0 }, settings: {},
          } }));
      }
      if (message.event === 'setFeedbackLayout') layout = true;
      if (message.event === 'setFeedback' && /^\d+%$/.test(message.payload.five?.value)) {
        if (!layout) return reject(new Error('Layout was not set'));
        console.log('Bundled plugin connected; Neo layout and live usage feedback received.');
        console.log(JSON.stringify(message.payload));
        socket.send(JSON.stringify({ event: 'willDisappear', action: 'com.ayato.codexusage.infobar',
          context: 'smoke-infobar', device: 'smoke-neo', payload: {
            controller: 'Neo', coordinates: { column: 0, row: 0 }, settings: {},
          } }));
        resolveTest();
      }
    }));
    child = spawn(process.execPath, ['bin/plugin.js', '-port', String(server.address().port),
      '-pluginUUID', 'smoke-plugin', '-registerEvent', 'registerPlugin', '-info', JSON.stringify({
        application: { version: '7.6.0', platform: 'windows', language: 'en', platformVersion: '10' },
        plugin: { version: manifest.Version, uuid: manifest.UUID },
        devices: [{ id: 'smoke-neo', name: 'Smoke Neo', type: 9, size: { columns: 4, rows: 2 } }],
      })], { cwd: resolve('com.ayato.codexusage.sdPlugin'), windowsHide: true, stdio: 'ignore' });
    child.on('error', () => reject(new Error('Plugin failed to start')));
    child.on('exit', code => reject(new Error(`Plugin exited: ${code}`)));
  });
} finally {
  clearTimeout(timer);
  child?.kill();
  for (const client of server.clients) client.terminate();
  server.close();
}
