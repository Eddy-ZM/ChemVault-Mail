import { spawn } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';

const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:3001';
const viteHost = '127.0.0.1';
const vitePort = '3001';

const children = new Set();

function run(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...env,
    },
  });

  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

function waitForUrl(url, timeoutMs = 45000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(probe, 500);
      });
    };

    probe();
  });
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const vite = run('pnpm', ['exec', 'vite', '--mode', 'desktop', '--host', viteHost, '--port', vitePort]);

vite.on('exit', (code) => {
  if (children.size > 0) {
    shutdown(code || 0);
  }
});

await waitForUrl(rendererUrl);

const electron = run('pnpm', ['exec', 'electron', '.'], {
  ELECTRON_RENDERER_URL: rendererUrl,
  CHEMVAULT_DESKTOP_DISABLE_AUTO_UPDATE: '1',
});

electron.on('exit', (code) => shutdown(code || 0));
