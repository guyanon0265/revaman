import { spawn } from 'child_process';
import { createRequire } from 'module';
import { PORT } from './config.js';

const require = createRequire(import.meta.url);
const localtunnelBin = require.resolve('localtunnel/bin/lt.js');

const tunnel = spawn(
  process.execPath,
  [localtunnelBin, '--port', String(PORT), '--subdomain', 'revaman'],
  {
    stdio: 'inherit',
  }
);

tunnel.on('error', (err) => {
  console.error('Failed to start localtunnel:', err);
});

tunnel.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Localtunnel exited from signal ${signal}`);
  } else if (code !== 0) {
    console.error(`Localtunnel exited with code ${code}`);
  }
});
