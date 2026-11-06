import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'store.json');
const distDir = path.join(root, 'dist');
const port = Number(process.env.PORT || 3000);

fs.mkdirSync(dataDir, { recursive: true });

let storeState = null;
let updatedAt = 0;

try {
  if (fs.existsSync(dataFile)) {
    const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (saved?.state?.orders && saved?.state?.products && saved?.state?.riders) {
      storeState = saved.state;
      updatedAt = Number(saved.updatedAt) || Date.now();
    } else if (saved?.orders && saved?.products && saved?.riders) {
      // Migrate the earlier server.ts file format.
      storeState = saved;
      updatedAt = Date.now();
    }
  }
} catch (error) {
  console.error('Could not read saved store data:', error);
}

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(contentType.startsWith('application/json') ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10 * 1024 * 1024) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function persist(nextState) {
  const nextUpdatedAt = Math.max(Date.now(), updatedAt + 1);
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify({ state: nextState, updatedAt: nextUpdatedAt }, null, 2));
  fs.renameSync(tempFile, dataFile);
  storeState = nextState;
  updatedAt = nextUpdatedAt;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, updatedAt });
  }

  if (url.pathname === '/api/state' && req.method === 'GET') {
    return send(res, 200, { state: storeState, updatedAt });
  }

  if (url.pathname === '/api/state' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      const next = body.state;
      if (!next || !Array.isArray(next.orders) || !Array.isArray(next.products) || !Array.isArray(next.riders) || !next.storeProfile) {
        return send(res, 400, { error: 'Invalid store state payload' });
      }
      persist(next);
      return send(res, 200, { success: true, updatedAt });
    } catch (error) {
      return send(res, 400, { error: error instanceof Error ? error.message : 'Invalid request' });
    }
  }

  if (req.method === 'GET') {
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const requested = path.resolve(distDir, `.${relative}`);
    if (requested.startsWith(distDir) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
      const ext = path.extname(requested).toLowerCase();
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
      return send(res, 200, fs.readFileSync(requested), types[ext] || 'application/octet-stream');
    }
    const index = path.join(distDir, 'index.html');
    if (fs.existsSync(index)) return send(res, 200, fs.readFileSync(index), 'text/html; charset=utf-8');
  }

  return send(res, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Butchi shared server listening on http://0.0.0.0:${port}`);
});
