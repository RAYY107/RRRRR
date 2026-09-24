// Evora ID — bridge to the client script (NUI callbacks)

import { resourceName } from '../core/util.js';

const RES = resourceName();

// Test hook: window.__EVORA_MOCK__ = { post(name, data) -> Promise }
export async function post(name, data = {}) {
  if (window.__EVORA_MOCK__) return window.__EVORA_MOCK__.post(name, data);
  try {
    const res = await fetch(`https://${RES}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return null;
  }
}

// Server request through the client. Resolves { ok, data, error, extra }.
export async function request(action, payload = {}) {
  const res = await post('request', { action, payload });
  if (!res) return { ok: false, error: 'timeout' };
  return res;
}
