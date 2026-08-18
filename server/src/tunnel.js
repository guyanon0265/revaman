import { spawn } from 'child_process';
import { PORT } from './config.js';

const tunnel = spawn('untun', ['--port', String(PORT)], {
  stdio: 'inherit',
  shell: true,
});

tunnel.on('error', (err) => {
  console.error('Failed to start untun:', err);
});

tunnel.on('exit', (code, signal) => {
  if (signal) {
    console.log(`untun exited from signal ${signal}`);
  } else if (code !== 0) {
    console.error(`untun exited with code ${code}`);
  }
});
