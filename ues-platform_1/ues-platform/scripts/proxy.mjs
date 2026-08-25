import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';

const TARGET_PORT = 3000;
const PROXY_PORT = 3001;

async function getSslCredentials() {
  const certDir = path.resolve(process.cwd(), 'certificates');
  const certPath = path.join(certDir, 'localhost.crt');
  const keyPath = path.join(certDir, 'localhost.key');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      const key = fs.readFileSync(keyPath, 'utf8');
      const cert = fs.readFileSync(certPath, 'utf8');
      if (key.includes('BEGIN') && cert.includes('BEGIN')) {
        return { key, cert };
      }
    } catch {}
  }

  console.log("Generating fresh SSL certificate for localhost on port 3001...");
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048 });

  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);

  return { key: pems.private, cert: pems.cert };
}

function handleProxyRequest(req, res) {
  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${TARGET_PORT}`,
      'x-forwarded-host': req.headers.host || `localhost:${PROXY_PORT}`,
      'x-forwarded-proto': 'https',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] Unable to forward request to Next.js on port ${TARGET_PORT}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Bad Gateway: Next.js dev server on port ${TARGET_PORT} is not reachable.`);
    }
  });

  req.pipe(proxyReq, { end: true });
}

async function startProxy() {
  const credentials = await getSslCredentials();
  const httpsServer = https.createServer(credentials, handleProxyRequest);

  httpsServer.listen(PROXY_PORT, () => {
    console.log(`🚀 HTTPS Proxy listening natively on https://localhost:${PROXY_PORT} -> forwarding to http://localhost:${TARGET_PORT}`);
  });
}

startProxy();
