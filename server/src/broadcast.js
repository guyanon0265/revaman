import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = '127.0.0.1';
const node = process.execPath;

const serverPath = path.join(__dirname, 'server.js');
const tunnelPath = path.join(__dirname, 'tunnel.js');

let server;
let tunnel;

function waitForPort(host, port) {
  return new Promise((resolve) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        setTimeout(tryConnect, 100);
      });
    };

    tryConnect();
  });
}

function shutdown() {
  if (tunnel) tunnel.kill();
  if (server) server.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Starting RevaMan server on port ${PORT}...`);

server = spawn(node, [serverPath], {
  stdio: 'inherit',
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  shutdown();
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`Server exited with code ${code}.`);
  }

  if (!signal) {
    shutdown();
  }
});

console.log(`Waiting for port ${PORT}...`);

await waitForPort(HOST, PORT);

console.log(`Server is ready on port ${PORT}.`);
console.log('Starting untun...');

tunnel = spawn(node, [tunnelPath], {
  stdio: 'inherit',
});

tunnel.on('error', (err) => {
  console.error('Failed to start untun:', err);
  shutdown();
  process.exit(1);
});

tunnel.on('exit', (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`untun exited with code ${code}.`);
  }

  if (!signal) {
    shutdown();
  }
});
