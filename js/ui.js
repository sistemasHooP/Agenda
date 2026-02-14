export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

export function fmtMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function statusBadge(status) {
  const map = {
    marcado: 'badge badge-warn',
    confirmado: 'badge badge-ok',
    concluido: 'badge badge-ok',
    cancelado: 'badge badge-danger',
    faltou: 'badge badge-danger'
  };
  return `<span class="${map[status] || 'badge'}">${status}</span>`;
}
