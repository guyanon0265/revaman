import { spawn } from 'child_process';
import qrcode from 'qrcode-terminal';
import { PORT } from './config.js';

const tunnel = spawn('pnpm dlx untun', ['--port', String(PORT)], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
});

let output = '';
let qrShown = false;

tunnel.stdout.on('data', (data) => {
  const text = data.toString();

  process.stdout.write(text);
  output += text;

  if (!qrShown) {
    const match = output.match(/https:\/\/[A-Za-z0-9.-]+(?:\/[^\s]*)?/);

    if (match) {
      const url = match[0];
      qrShown = true;

      console.log('\nRevaMan public URL:');
      console.log(url);
      console.log('\nScan to open RevaMan on your phone:\n');

      qrcode.generate(url, { small: true });
    }
  }
});

tunnel.on('error', (err) => {
  console.error('Failed to start tunnel:', err);
});

tunnel.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Tunnel exited from signal ${signal}`);
  } else if (code !== 0) {
    console.error(`Tunnel exited with code ${code}`);
  }
});
