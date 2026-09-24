import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const children = new Set();
let shuttingDown = false;

// This launcher is for the all-in-one Railway deployment: the web app, scanner,
// and intentionally vulnerable demo API run in the same service. Local-machine
// values such as SCANNER_API_URL=http://localhost:5050 must not leak into this
// deployment, where the scanner listens on 127.0.0.1:5000.
process.env.SCANNER_API_URL = 'http://127.0.0.1:5000';

// Allow a public, no-login hackathon demo by default. The backend enforces the
// exact bundled loopback target in this mode. Set PUBLIC_DEMO_MODE=false to
// require the production Supabase operator session instead.
if (process.env.PUBLIC_DEMO_MODE === undefined) {
  process.env.PUBLIC_DEMO_MODE = 'true';
}

function start(label, args, env = process.env) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  children.add(child);
  child.once('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      console.error(`[${label}] exited (${signal ?? code ?? 'unknown'}); stopping the service`);
      shutdown(code && code !== 0 ? code : 1);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 8000);
  timer.unref();
  setTimeout(() => process.exit(code), 8500).unref();
}

process.once('SIGTERM', () => shutdown(0));
process.once('SIGINT', () => shutdown(0));

start('demo-api', ['sentinelapi/vulnerable-api/server.js'], { ...process.env, PORT: '4000' });
start('scanner-backend', ['sentinelapi/backend/dist/server.js'], {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: '5000',
  DATABASE_PATH: process.env.DATABASE_PATH || '/data/sentinel.sqlite',
});
start('next-web', ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', process.env.PORT || '3000']);
