import { createServer } from 'http';
import { extname, join } from 'path';
import { readFile } from 'fs/promises';
import handler from './api/chat.js';

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const body = await readBody(req);
      const requestLike = { json: async () => JSON.parse(body || '{}') };
      const response = await handler(requestLike);

      res.statusCode = response.status || 200;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const filePath = resolvePath(url.pathname);
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    const status = err.code === 'ENOENT' ? 404 : 500;
    res.writeHead(status, { 'Content-Type': 'text/plain' });
    res.end(status === 404 ? 'Not Found' : 'Internal Server Error');
  }
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function resolvePath(pathname) {
  if (pathname === '/' || pathname === '') return join(ROOT, 'index.html');
  return join(ROOT, pathname.replace(/^\//, ''));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
