import {
  ensureStateTable,
  getSql,
  getState,
  handleError,
  requireMagicKey,
  responseJson
} from './_shared.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return responseJson(405, { error: 'Method not allowed' });
  }

  const auth = requireMagicKey(request);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureStateTable(sql);
    const state = await getState(sql);
    return responseJson(200, state);
  } catch (error) {
    return handleError(error);
  }
};
