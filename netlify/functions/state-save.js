import {
  ensureStateTable,
  getSql,
  handleError,
  normalizeStatePayload,
  parseBody,
  requireMagicKey,
  responseJson,
  upsertState
} from './_shared.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return responseJson(405, { error: 'Method not allowed' });
  }

  const auth = requireMagicKey(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request);
  const normalized = normalizeStatePayload(body);
  if (!normalized) {
    return responseJson(400, { error: 'Invalid payload: tasks and projects must both be arrays' });
  }

  try {
    const sql = getSql();
    await ensureStateTable(sql);
    await upsertState(sql, normalized.tasks, normalized.projects);
    return responseJson(200, { ok: true });
  } catch (error) {
    return handleError(error);
  }
};
