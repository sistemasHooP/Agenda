/**
 * MinhaAgenda 2.0 — profissionais.js
 * Página de Profissionais (admin): CRUD + gerenciamento de usuários
 */

const ProfissionaisPage = {
  async render(container) {
    container.innerHTML = this._layoutHTML();
    await this._carregar();
    this._bindEvents();
  },

  _layoutHTML() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-white">Profissionais</h1>
          <button id="btn-novo-prof" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Novo Profissional
          </button>
        </div>
        <div id="profissionais-lista" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${UI.skeleton(3)}</div>
      </div>
    `;
  },

  async _carregar() {
    const r = await Api.call('listarProfissionais');
    if (r.ok) {
      Store.set('profissionais', r.data);
      Store.markRefreshed('profissionais');
      this._renderLista(r.data);
    }
  },

  _renderLista(profissionais) {
    const container = document.getElementById('profissionais-lista');
    if (!container) return;

    if (profissionais.length === 0) {
      container.innerHTML = UI.emptyState(
        '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
        'Nenhum profissional',
        'Adicione profissionais para criar agendas'
      );
      return;
    }

    container.innerHTML = profissionais.map(p => {
      const isInativo = String(p.ativo) === 'false';
      return `
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors ${isInativo ? 'opacity-50' : ''}">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style="background: ${p.cor || '#3B82F6'}">
              ${UI.escapeHtml((p.nome || '?').charAt(0).toUpperCase())}
            </div>
            <div>
              <div class="text-white font-medium">${UI.escapeHtml(p.nome)}</div>
              ${isInativo ? UI.badge('Inativo', 'gray') : UI.badge('Ativo', 'green')}
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="ProfissionaisPage.abrirEditar('${p.id}')" class="flex-1 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm transition-colors">Editar</button>
            <button onclick="ProfissionaisPage.toggleAtivo('${p.id}')" class="px-3 py-1.5 rounded-lg ${isInativo ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-600/20 text-amber-400'} text-sm transition-colors hover:opacity-80">
              ${isInativo ? 'Ativar' : 'Desativar'}
            </button>
            <button onclick="ProfissionaisPage.criarLogin('${p.id}', '${UI.escapeHtml(p.nome)}')" class="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-sm transition-colors hover:opacity-80" title="Criar login">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  _bindEvents() {
    document.getElementById('btn-novo-prof')?.addEventListener('click', () => this.abrirFormulario());
  },

  abrirFormulario(prof = null) {
    const isEditar = !!prof;

    const coresHTML = APP_CONFIG.PALETA_CORES.map(cor =>
      `<button type="button" class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cor-prof ${(prof?.cor || '#3B82F6') === cor ? 'border-white scale-110' : 'border-transparent'}"
        style="background:${cor}" data-cor="${cor}" onclick="ProfissionaisPage._selecionarCor(this, '${cor}')"></button>`
    ).join('');

    const content = `
      <form id="form-prof" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Nome *</label>
          <input type="text" id="fp-nome" value="${UI.escapeHtml(prof?.nome || '')}" required
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Cor</label>
          <input type="hidden" id="fp-cor" value="${prof?.cor || '#3B82F6'}">
          <div class="flex flex-wrap gap-2">${coresHTML}</div>
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: isEditar ? 'Editar Profissional' : 'Novo Profissional',
      content,
      size: 'sm',
      footer: `
        <button id="fp-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="fp-salvar" class="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium">Salvar</button>
      `
    });

    document.getElementById('fp-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('fp-salvar')?.addEventListener('click', async () => {
      const nome = document.getElementById('fp-nome').value.trim();
      if (!nome) { UI.warning('Nome é obrigatório.'); return; }

      const dados = { nome, cor: document.getElementById('fp-cor').value };
      if (isEditar) dados.id = prof.id;

      const action = isEditar ? 'atualizarProfissional' : 'criarProfissional';
      const r = await Api.call(action, dados);

      if (r.ok) {
        UI.success(r.msg);
        modal.close();
        this._carregar();
      } else {
        UI.error(r.msg);
      }
    });
  },

  _selecionarCor(el, cor) {
    document.querySelectorAll('.cor-prof').forEach(b => {
      b.classList.remove('border-white', 'scale-110');
      b.classList.add('border-transparent');
    });
    el.classList.add('border-white', 'scale-110');
    el.classList.remove('border-transparent');
    document.getElementById('fp-cor').value = cor;
  },

  abrirEditar(id) {
    const profissionais = Store.get('profissionais') || [];
    const prof = profissionais.find(p => p.id === id);
    if (prof) this.abrirFormulario(prof);
  },

  async toggleAtivo(id) {
    const r = await Api.call('ativarDesativarProfissional', { id });
    if (r.ok) {
      UI.success(r.msg);
      this._carregar();
    } else {
      UI.error(r.msg);
    }
  },

  criarLogin(profissionalId, nome) {
    const content = `
      <form id="form-login-prof" class="space-y-4">
        <p class="text-gray-400 text-sm">Criar acesso para: <strong class="text-white">${UI.escapeHtml(nome)}</strong></p>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Email *</label>
          <input type="email" id="lp-email" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Senha *</label>
          <input type="text" id="lp-senha" value="${Math.random().toString(36).slice(-8)}" required
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          <p class="text-xs text-gray-500 mt-1">Compartilhe esta senha com o profissional</p>
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: 'Criar Login',
      content,
      size: 'sm',
      footer: `
        <button id="lp-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="lp-salvar" class="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium">Criar</button>
      `
    });

    document.getElementById('lp-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('lp-salvar')?.addEventListener('click', async () => {
      const email = document.getElementById('lp-email').value.trim();
      const senha = document.getElementById('lp-senha').value;
      if (!email || !senha) { UI.warning('Email e senha são obrigatórios.'); return; }

      const r = await Api.call('criarUsuario', {
        nome,
        email,
        senha,
        role: 'PROFISSIONAL',
        profissional_id: profissionalId
      });

      if (r.ok) {
        UI.success('Login criado com sucesso!');
        modal.close();
      } else {
        UI.error(r.msg);
      }
    });
  }
};
