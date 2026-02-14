/**
 * MinhaAgenda 2.0 — ui.js
 * Componentes de UI: modais, toasts, loaders, empty states, formatadores
 */

const UI = {
  // ─── TOAST ──────────────────────────────────────────────────────────

  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
      error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
      info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>`
    };

    const colors = {
      success: 'bg-emerald-600 border-emerald-500',
      error: 'bg-red-600 border-red-500',
      info: 'bg-blue-600 border-blue-500',
      warning: 'bg-amber-600 border-amber-500'
    };

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type] || colors.info} text-white shadow-2xl transform translate-x-full transition-transform duration-300 max-w-sm`;
    toast.innerHTML = `
      <span class="flex-shrink-0">${icons[type] || icons.info}</span>
      <span class="text-sm font-medium flex-1">${this.escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" class="flex-shrink-0 opacity-60 hover:opacity-100">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));

    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.toast(msg, 'success'); },
  error(msg) { this.toast(msg, 'error', 5000); },
  info(msg) { this.toast(msg, 'info'); },
  warning(msg) { this.toast(msg, 'warning', 4000); },

  // ─── MODAL ──────────────────────────────────────────────────────────

  modal(options) {
    const { title, content, size = 'md', onClose, footer } = options;
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full mx-4'
    };

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 transition-opacity duration-200';

    overlay.innerHTML = `
      <div class="modal-content bg-gray-800 rounded-2xl shadow-2xl w-full ${sizeClasses[size] || sizeClasses.md} transform scale-95 transition-transform duration-200 max-h-[90vh] flex flex-col border border-gray-700">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 class="text-lg font-semibold text-white">${this.escapeHtml(title || '')}</h2>
          <button id="modal-close-btn" class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex-1" id="modal-body">${content || ''}</div>
        ${footer ? `<div class="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      overlay.querySelector('.modal-content').classList.remove('scale-95');
    });

    const close = () => {
      overlay.classList.add('opacity-0');
      overlay.querySelector('.modal-content').classList.add('scale-95');
      setTimeout(() => {
        overlay.remove();
        if (onClose) onClose();
      }, 200);
    };

    overlay.querySelector('#modal-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', handler);
      }
    });

    return { close, body: overlay.querySelector('#modal-body'), overlay };
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.add('opacity-0');
      const content = overlay.querySelector('.modal-content');
      if (content) content.classList.add('scale-95');
      setTimeout(() => overlay.remove(), 200);
    }
  },

  // ─── CONFIRM ────────────────────────────────────────────────────────

  async confirm(title, message) {
    return new Promise((resolve) => {
      const { close } = this.modal({
        title: title || 'Confirmar',
        content: `<p class="text-gray-300">${this.escapeHtml(message)}</p>`,
        size: 'sm',
        footer: `
          <button id="confirm-cancel" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm font-medium">Cancelar</button>
          <button id="confirm-ok" class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium">Confirmar</button>
        `,
        onClose: () => resolve(false)
      });

      document.getElementById('confirm-cancel')?.addEventListener('click', () => { close(); resolve(false); });
      document.getElementById('confirm-ok')?.addEventListener('click', () => { close(); resolve(true); });
    });
  },

  // ─── SKELETON LOADER ───────────────────────────────────────────────

  skeleton(lines = 3) {
    let html = '';
    for (let i = 0; i < lines; i++) {
      const width = 60 + Math.random() * 40;
      html += `<div class="h-4 bg-gray-700 rounded animate-pulse mb-3" style="width:${width}%"></div>`;
    }
    return `<div class="space-y-2 p-4">${html}</div>`;
  },

  skeletonCard() {
    return `
      <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
        <div class="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
        <div class="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-gray-700 rounded w-2/3"></div>
      </div>
    `;
  },

  // ─── EMPTY STATE ────────────────────────────────────────────────────

  emptyState(icon, title, subtitle, actionHtml = '') {
    return `
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 text-gray-500">
          ${icon}
        </div>
        <h3 class="text-gray-400 font-medium mb-1">${this.escapeHtml(title)}</h3>
        <p class="text-gray-500 text-sm mb-4">${this.escapeHtml(subtitle)}</p>
        ${actionHtml}
      </div>
    `;
  },

  // ─── LOADER ─────────────────────────────────────────────────────────

  loader() {
    return `
      <div class="flex items-center justify-center py-8">
        <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;
  },

  // ─── BADGE ──────────────────────────────────────────────────────────

  badge(text, color = 'blue') {
    const colors = {
      blue: 'bg-blue-500/20 text-blue-400',
      green: 'bg-emerald-500/20 text-emerald-400',
      red: 'bg-red-500/20 text-red-400',
      yellow: 'bg-amber-500/20 text-amber-400',
      purple: 'bg-purple-500/20 text-purple-400',
      gray: 'bg-gray-500/20 text-gray-400'
    };
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}">${this.escapeHtml(text)}</span>`;
  },

  statusBadge(status) {
    const labels = {
      marcado: 'Marcado',
      confirmado: 'Confirmado',
      concluido: 'Concluído',
      cancelado: 'Cancelado',
      faltou: 'Faltou'
    };
    const colors = {
      marcado: 'blue',
      confirmado: 'green',
      concluido: 'gray',
      cancelado: 'red',
      faltou: 'yellow'
    };
    return this.badge(labels[status] || status, colors[status] || 'gray');
  },

  // ─── FORMATADORES ──────────────────────────────────────────────────

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  formatarData(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR');
  },

  formatarHora(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  formatarDataHora(isoStr) {
    if (!isoStr) return '';
    return this.formatarData(isoStr) + ' ' + this.formatarHora(isoStr);
  },

  formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    return 'R$ ' + num.toFixed(2).replace('.', ',');
  },

  formatarTelefone(tel) {
    if (!tel) return '';
    const limpo = String(tel).replace(/\D/g, '');
    if (limpo.length === 11) {
      return `(${limpo.substring(0,2)}) ${limpo.substring(2,7)}-${limpo.substring(7)}`;
    }
    if (limpo.length === 10) {
      return `(${limpo.substring(0,2)}) ${limpo.substring(2,6)}-${limpo.substring(6)}`;
    }
    return tel;
  },

  // ─── HELPERS DE DATA ───────────────────────────────────────────────

  getHoje() {
    const now = new Date();
    return now.toLocaleDateString('en-CA'); // YYYY-MM-DD
  },

  getSemanaKey(dateStr) {
    const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((d - oneJan) / 86400000);
    const weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
    const wk = weekNum < 10 ? '0' + weekNum : '' + weekNum;
    return d.getFullYear() + '-' + wk;
  },

  /**
   * Retorna as datas (seg a dom) para uma semana_key
   */
  getDatasDaSemana(semanaKey) {
    const parts = semanaKey.split('-');
    const year = parseInt(parts[0]);
    const week = parseInt(parts[1]);

    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    let monday = new Date(year, 0, 1 + daysToMonday + (week - 2) * 7);

    if (week === 1) {
      const d = new Date(year, 0, 1);
      let dow = d.getDay();
      if (dow === 0) dow = 7;
      d.setDate(d.getDate() - (dow - 1));
      monday = d;
    }

    const datas = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(monday.getTime() + i * 86400000);
      datas.push(dia.toLocaleDateString('en-CA'));
    }
    return datas;
  },

  navSemana(semanaKey, direcao) {
    const datas = this.getDatasDaSemana(semanaKey);
    const ref = new Date(datas[0] + 'T12:00:00');
    ref.setDate(ref.getDate() + (direcao * 7));
    return this.getSemanaKey(ref.toLocaleDateString('en-CA'));
  },

  getDiaSemana(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return APP_CONFIG.DIAS_SEMANA[d.getDay()];
  },

  getDiaSemanaFull(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return APP_CONFIG.DIAS_SEMANA_FULL[d.getDay()];
  },

  /**
   * Gera slots de horário para a grade
   */
  gerarSlots() {
    const slots = [];
    for (let h = APP_CONFIG.HORA_INICIO; h < APP_CONFIG.HORA_FIM; h++) {
      for (let m = 0; m < 60; m += APP_CONFIG.INTERVALO_MIN) {
        const hora = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        slots.push(hora);
      }
    }
    return slots;
  }
};
