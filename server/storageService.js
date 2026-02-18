import { createHash, timingSafeEqual } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
let pool = null;

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

export const getSql = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is missing');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl
    });
  }

  return pool;
};

export const ensureStateTable = async (sql) => {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id smallint PRIMARY KEY CHECK (id = 1),
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      projects jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

export const requireMagicKeyFromHeaders = (headers) => {
  const incomingKey = (headers['x-magic-key'] || '').toString().trim();
  if (!incomingKey) {
    return { ok: false, message: 'Missing magic key' };
  }

  const storedHash = (process.env.MAGIC_KEY_HASH || '').trim().toLowerCase();
  if (storedHash) {
    const incomingHash = sha256(incomingKey);
    return safeEqual(incomingHash, storedHash)
      ? { ok: true }
      : { ok: false, message: 'Invalid magic key' };
  }

  const storedRaw = (process.env.MAGIC_KEY || '').trim();
  if (storedRaw && safeEqual(incomingKey, storedRaw)) {
    return { ok: true };
  }

  return { ok: false, message: 'Invalid magic key' };
};

export const normalizeStatePayload = (payload) => {
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : null;
  const projects = Array.isArray(payload?.projects) ? payload.projects : null;
  if (!tasks || !projects) return null;
  return { tasks, projects };
};

export const getState = async (sql) => {
  const result = await sql.query(
    'SELECT tasks, projects, updated_at FROM app_state WHERE id = $1 LIMIT 1',
    [1]
  );
  if (!result.rows.length) {
    return { tasks: [], projects: [], updatedAt: null, empty: true };
  }

  const row = result.rows[0];
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

  await sql.query(`
    INSERT INTO app_state (id, tasks, projects, updated_at)
    VALUES (1, $1::jsonb, $2::jsonb, now())
    ON CONFLICT (id)
    DO UPDATE SET
      tasks = EXCLUDED.tasks,
      projects = EXCLUDED.projects,
      updated_at = now()
  `, [tasksJson, projectsJson]);
};
