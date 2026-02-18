import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureStateTable,
  getSql,
  getState,
  normalizeStatePayload,
  requireMagicKeyFromHeaders,
  upsertState
} from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const PORT = Number(process.env.PORT || 3000);
const API_PREFIXES = ['/api', '/.netlify/functions'];

const json = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload));
};

const text = (res, statusCode, value) => {
  res.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(value);
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const runWithAuth = async (req, res, handler) => {
  const auth = requireMagicKeyFromHeaders(req.headers);
  if (!auth.ok) {
    json(res, 401, { error: auth.message });
    return;
  }

  try {
    const sql = getSql();
    await ensureStateTable(sql);
    await handler(sql);
  } catch (error) {
    console.error(error);
    json(res, 500, { error: 'Internal server error' });
  }
};

const handleApi = async (req, res, pathname) => {
  const matchedPrefix = API_PREFIXES.find(prefix => pathname.startsWith(`${prefix}/`));
  if (!matchedPrefix) return false;

  const action = pathname.slice(matchedPrefix.length + 1);

  if (action === 'state-get' && req.method === 'GET') {
    await runWithAuth(req, res, async (sql) => {
      const state = await getState(sql);
      json(res, 200, state);
    });
    return true;
  }

  if (action === 'state-save' && req.method === 'POST') {
    await runWithAuth(req, res, async (sql) => {
      const payload = normalizeStatePayload(await parseBody(req));
      if (!payload) {
        json(res, 400, { error: 'Invalid payload: tasks and projects must both be arrays' });
        return;
      }

      await upsertState(sql, payload.tasks, payload.projects);
      json(res, 200, { ok: true });
    });
    return true;
  }

  if (action === 'state-migrate' && req.method === 'POST') {
    await runWithAuth(req, res, async (sql) => {
      const payload = normalizeStatePayload(await parseBody(req));
      if (!payload) {
        json(res, 400, { error: 'Invalid payload: tasks and projects must both be arrays' });
        return;
      }

      const current = await getState(sql);
      const hasRemoteData = current.tasks.length > 0 || current.projects.length > 0;
      if (hasRemoteData) {
        json(res, 200, { ok: true, migrated: false, reason: 'remote_has_data' });
        return;
      }

      await upsertState(sql, payload.tasks, payload.projects);
      json(res, 200, { ok: true, migrated: true });
    });
    return true;
  }

  if (action === 'auth-verify' && req.method === 'GET') {
    await runWithAuth(req, res, async () => {
      json(res, 200, { ok: true });
    });
    return true;
  }

  json(res, 405, { error: 'Method not allowed' });
  return true;
};

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  return map[ext] || 'application/octet-stream';
};

const serveStatic = async (req, res, pathname) => {
  let target = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(target).replace(/^\.+/, '');
  const filePath = path.join(distDir, safePath);

  try {
    const file = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': getContentType(filePath) });
    res.end(file);
    return;
  } catch {
    try {
      const indexFile = await fs.readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(indexFile);
    } catch {
      text(res, 500, 'dist/index.html not found, run npm run build first');
    }
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (await handleApi(req, res, url.pathname)) {
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
