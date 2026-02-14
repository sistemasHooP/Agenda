import { CONFIG } from './config.js';
import { state } from './state.js';

export async function api(action, payload = {}, withAuth = true) {
  const body = {
    action,
    token: withAuth ? state.token : '',
    payload
  };
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message || 'Erro API');
  return data.data;
}
