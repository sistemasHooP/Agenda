/**
 * MinhaAgenda 2.0 — servicos.js
 * Página de Serviços: CRUD com paleta de cores
 */

const ServicosPage = {
  async render(container) {
    container.innerHTML = this._layoutHTML();
    await this._carregarServicos();
    this._bindEvents();
  },

  _layoutHTML() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-white">Serviços</h1>
          ${Auth.isAdmin() ? `
          <button id="btn-novo-servico" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Novo Serviço
          </button>` : ''}
        </div>
        <div id="servicos-lista" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${UI.skeleton(4)}</div>
      </div>
    `;
  },

  async _carregarServicos() {
    const r = await Api.call('listarServicos');
    if (r.ok) {
      Store.set('servicos', r.data);
      Store.markRefreshed('servicos');
      this._renderLista(r.data);
    }
  },

  _renderLista(servicos) {
    const container = document.getElementById('servicos-lista');
    if (!container) return;

    if (servicos.length === 0) {
      container.innerHTML = UI.emptyState(
        '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>',
        'Nenhum serviço cadastrado',
        'Crie serviços para usar nos agendamentos'
      );
      return;
    }

    container.innerHTML = servicos.map(s => {
      const isInativo = String(s.ativo) === 'false';
      return `
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors ${isInativo ? 'opacity-50' : ''} cursor-pointer"
          onclick="ServicosPage.abrirEditar('${s.id}')">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-4 h-10 rounded-full" style="background: ${s.cor || '#3B82F6'}"></div>
              <div>
                <div class="text-white font-medium">${UI.escapeHtml(s.nome)} ${isInativo ? '<span class="text-xs text-gray-500">(inativo)</span>' : ''}</div>
                <div class="text-gray-500 text-sm">${s.duracao_min || 30} min</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-white font-semibold">${UI.formatarMoeda(s.preco)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  _bindEvents() {
    document.getElementById('btn-novo-servico')?.addEventListener('click', () => this.abrirFormulario());
  },

  abrirFormulario(servico = null) {
    const isEditar = !!servico;

    const coresHTML = APP_CONFIG.PALETA_CORES.map(cor =>
      `<button type="button" class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cor-opcao ${(servico?.cor || '#8B5CF6') === cor ? 'border-white scale-110' : 'border-transparent'}"
        style="background:${cor}" data-cor="${cor}" onclick="ServicosPage._selecionarCor(this, '${cor}')"></button>`
    ).join('');

    const content = `
      <form id="form-servico" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Nome *</label>
          <input type="text" id="fs-nome" value="${UI.escapeHtml(servico?.nome || '')}" required
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Preço (R$) *</label>
            <input type="number" id="fs-preco" value="${servico?.preco || ''}" min="0" step="0.01" required
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Duração (min) *</label>
            <input type="number" id="fs-duracao" value="${servico?.duracao_min || 30}" min="5" max="480" step="5" required
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Cor</label>
          <input type="hidden" id="fs-cor" value="${servico?.cor || '#8B5CF6'}">
          <div class="flex flex-wrap gap-2">${coresHTML}</div>
        </div>
      </form>
    `;

    let footerExtra = '';
    if (isEditar && Auth.isAdmin()) {
      const toggleLabel = String(servico.ativo) === 'true' ? 'Desativar' : 'Ativar';
      footerExtra = `<button id="fs-toggle" class="px-4 py-2 rounded-xl bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-sm font-medium mr-auto">${toggleLabel}</button>`;
    }

    const modal = UI.modal({
      title: isEditar ? 'Editar Serviço' : 'Novo Serviço',
      content,
      size: 'md',
      footer: `
        ${footerExtra}
        <button id="fs-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="fs-salvar" class="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium">Salvar</button>
      `
    });

    document.getElementById('fs-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('fs-salvar')?.addEventListener('click', async () => {
      const nome = document.getElementById('fs-nome').value.trim();
      if (!nome) { UI.warning('Nome é obrigatório.'); return; }

      const dados = {
        nome,
        preco: document.getElementById('fs-preco').value,
        duracao_min: document.getElementById('fs-duracao').value,
        cor: document.getElementById('fs-cor').value
      };

      if (isEditar) dados.id = servico.id;

      const action = isEditar ? 'atualizarServico' : 'criarServico';
      const r = await Api.call(action, dados);

      if (r.ok) {
        UI.success(isEditar ? 'Serviço atualizado!' : 'Serviço criado!');
        modal.close();
        this._carregarServicos();
      } else {
        UI.error(r.msg);
      }
    });

    document.getElementById('fs-toggle')?.addEventListener('click', async () => {
      const r = await Api.call('ativarDesativarServico', { id: servico.id });
      if (r.ok) {
        UI.success(r.msg);
        modal.close();
        this._carregarServicos();
      } else {
        UI.error(r.msg);
      }
    });
  },

  _selecionarCor(el, cor) {
    document.querySelectorAll('.cor-opcao').forEach(b => {
      b.classList.remove('border-white', 'scale-110');
      b.classList.add('border-transparent');
    });
    el.classList.add('border-white', 'scale-110');
    el.classList.remove('border-transparent');
    document.getElementById('fs-cor').value = cor;
  },

  abrirEditar(id) {
    const servicos = Store.get('servicos') || [];
    const servico = servicos.find(s => s.id === id);
    if (servico) this.abrirFormulario(servico);
  }
};
