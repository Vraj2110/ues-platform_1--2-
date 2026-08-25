import { spawn } from 'child_process';
import path from 'path';

console.log("Starting Next.js Dev Server and HTTPS Proxy concurrently...");

// Start Next.js dev server using the direct node script path
const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const nextDev = spawn('node', [nextBin, 'dev'], {
  stdio: 'inherit'
});

// Start HTTPS proxy
const proxyScript = path.join(process.cwd(), 'scripts', 'proxy.mjs');
const proxy = spawn('node', [proxyScript], {
  stdio: 'inherit'
});

const cleanup = () => {
  nextDev.kill('SIGTERM');
  proxy.kill('SIGTERM');
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
