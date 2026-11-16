import { spawn } from 'node:child_process';
import { createServer } from 'vite';

// Own Vite in this process so Windows can close it without killing a shell tree.
const server = await createServer({ server: { host: '127.0.0.1', port: 4173, strictPort: true } });
try {
  await server.listen();
  const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit', windowsHide: true,
  });
  const interrupt = () => child.kill('SIGINT');
  process.once('SIGINT', interrupt);
  try {
    process.exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => resolve(code ?? 1));
    });
  } finally { process.removeListener('SIGINT', interrupt); }
} finally { await server.close(); }
