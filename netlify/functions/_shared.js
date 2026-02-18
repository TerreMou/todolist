import { createHash, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const ERROR_CODES = {
  unauthorized: 401,
  bad_request: 400,
  server_error: 500
};

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

export const responseJson = (status, payload) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

export const parseBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export const getSql = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is missing');
  }
  return neon(databaseUrl);
};

export const ensureStateTable = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id smallint PRIMARY KEY CHECK (id = 1),
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      projects jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
};

const getStoredHash = () => {
  const hash = (process.env.MAGIC_KEY_HASH || '').trim().toLowerCase();
  return hash || null;
};

const getStoredRaw = () => {
  const raw = (process.env.MAGIC_KEY || '').trim();
  return raw || null;
};

export const requireMagicKey = (request) => {
  const incomingKey = request.headers.get('x-magic-key')?.trim() || '';
  if (!incomingKey) {
    return { ok: false, response: responseJson(ERROR_CODES.unauthorized, { error: 'Missing magic key' }) };
  }

  const storedHash = getStoredHash();
  if (storedHash) {
    const incomingHash = sha256(incomingKey);
    if (!safeEqual(incomingHash, storedHash)) {
      return { ok: false, response: responseJson(ERROR_CODES.unauthorized, { error: 'Invalid magic key' }) };
    }
    return { ok: true };
  }

  const storedRaw = getStoredRaw();
  if (storedRaw && safeEqual(incomingKey, storedRaw)) {
    return { ok: true };
  }

  return { ok: false, response: responseJson(ERROR_CODES.unauthorized, { error: 'Invalid magic key' }) };
};

export const normalizeStatePayload = (payload) => {
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : null;
  const projects = Array.isArray(payload?.projects) ? payload.projects : null;
  if (!tasks || !projects) return null;
  return { tasks, projects };
};

export const getState = async (sql) => {
  const rows = await sql`SELECT tasks, projects, updated_at FROM app_state WHERE id = 1 LIMIT 1`;
  if (!rows.length) {
    return { tasks: [], projects: [], updatedAt: null, empty: true };
  }

  const row = rows[0];
  return {
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
    projects: Array.isArray(row.projects) ? row.projects : [],
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    empty: false
  };
};

export const upsertState = async (sql, tasks, projects) => {
  const tasksJson = JSON.stringify(tasks);
  const projectsJson = JSON.stringify(projects);

  await sql`
    INSERT INTO app_state (id, tasks, projects, updated_at)
    VALUES (1, ${tasksJson}::jsonb, ${projectsJson}::jsonb, now())
    ON CONFLICT (id)
    DO UPDATE SET
      tasks = EXCLUDED.tasks,
      projects = EXCLUDED.projects,
      updated_at = now()
  `;
};

export const handleError = (error) => {
  console.error(error);
  return responseJson(ERROR_CODES.server_error, { error: 'Internal server error' });
};
