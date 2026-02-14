export function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  setTimeout(() => el.classList.add('hidden'), 2600);
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

export function openModal(contentHtml, title) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal-card">
        <div class="modal-head">
          <h3>${title || ''}</h3>
          <button id="modalCloseBtn" class="ghost-btn">✕</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
      </div>
    </div>
  `;
  container.classList.remove('hidden');

  const close = () => closeModal();
  document.getElementById('modalCloseBtn').addEventListener('click', close);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') close();
  });
}

export function closeModal() {
  const container = document.getElementById('modalContainer');
  container.classList.add('hidden');
  container.innerHTML = '';
}

export function openConfirm({ title = 'Confirmar', message = '', onConfirm }) {
  openModal(`
    <p class="text-slate-600">${message}</p>
    <div class="modal-actions">
      <button id="btnCancelConfirm" class="btn-light">Cancelar</button>
      <button id="btnDoConfirm" class="btn-primary">Confirmar</button>
    </div>
  `, title);

  document.getElementById('btnCancelConfirm').addEventListener('click', closeModal);
  document.getElementById('btnDoConfirm').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}
