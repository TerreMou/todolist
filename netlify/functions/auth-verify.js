import { requireMagicKey, responseJson } from './_shared.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return responseJson(405, { error: 'Method not allowed' });
  }

  const auth = requireMagicKey(request);
  if (!auth.ok) return auth.response;

  return responseJson(200, { ok: true });
};
