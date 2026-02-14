/**
 * MinhaAgenda 2.0 — pacotes.js
 * Página de Pacotes: modelos, vendas, saldos, extrato
 */

const PacotesPage = {
  async render(container) {
    container.innerHTML = this._layoutHTML();
    await this._carregar();
    this._bindEvents();
  },

  _layoutHTML() {
    const isAdmin = Auth.isAdmin();
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-white">Pacotes</h1>
          ${isAdmin ? `
          <div class="flex gap-2">
            <button id="btn-novo-modelo" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Modelo
            </button>
            <button id="btn-vender-pacote" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Vender
            </button>
          </div>` : ''}
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-700">
          <button id="tab-modelos" class="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-400" onclick="PacotesPage.switchTab('modelos')">Modelos</button>
          <button id="tab-vendidos" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-300" onclick="PacotesPage.switchTab('vendidos')">Vendidos</button>
        </div>

        <div id="pacotes-content">${UI.skeleton(4)}</div>
      </div>
    `;
  },

  _tabAtual: 'modelos',

  switchTab(tab) {
    this._tabAtual = tab;
    ['modelos', 'vendidos'].forEach(t => {
      const el = document.getElementById('tab-' + t);
      if (el) {
        el.classList.toggle('border-blue-500', t === tab);
        el.classList.toggle('text-blue-400', t === tab);
        el.classList.toggle('border-transparent', t !== tab);
        el.classList.toggle('text-gray-400', t !== tab);
      }
    });
    this._renderTab();
  },

  async _carregar() {
    const [rModelos, rServicos] = await Promise.all([
      Api.call('listarModelosPacote'),
      Store.needsRefresh('servicos') ? Api.call('listarServicos') : Promise.resolve(null)
    ]);

    if (rModelos.ok) Store.set('pacotesModelos', rModelos.data);
    if (rServicos?.ok) {
      Store.set('servicos', rServicos.data);
      Store.markRefreshed('servicos');
    }

    this._renderTab();
  },

  _renderTab() {
    const container = document.getElementById('pacotes-content');
    if (!container) return;

    if (this._tabAtual === 'modelos') {
      this._renderModelos(container);
    } else {
      this._renderVendidos(container);
    }
  },

  _renderModelos(container) {
    const modelos = Store.get('pacotesModelos') || [];

    if (modelos.length === 0) {
      container.innerHTML = UI.emptyState(
        '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
        'Nenhum modelo de pacote',
        'Crie modelos de pacote para vender aos clientes'
      );
      return;
    }

    container.innerHTML = `<div class="grid gap-3 sm:grid-cols-2">
      ${modelos.map(m => {
        const isInativo = String(m.ativo) === 'false';
        return `
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 ${isInativo ? 'opacity-50' : ''}">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-white font-semibold">${UI.escapeHtml(m.nome)}</h3>
                ${m.descricao ? `<p class="text-gray-500 text-sm">${UI.escapeHtml(m.descricao)}</p>` : ''}
              </div>
              ${isInativo ? UI.badge('Inativo', 'gray') : UI.badge('Ativo', 'green')}
            </div>
            <div class="space-y-1">
              ${(m.itens || []).map(it =>
                `<div class="flex justify-between text-sm"><span class="text-gray-400">${UI.escapeHtml(it.servico_nome)}</span><span class="text-white">${it.quantidade}x</span></div>`
              ).join('')}
            </div>
            ${Auth.isAdmin() ? `<button onclick="PacotesPage.editarModelo('${m.id}')" class="mt-3 text-blue-400 text-sm hover:underline">Editar</button>` : ''}
          </div>
        `;
      }).join('')}
    </div>`;
  },

  async _renderVendidos(container) {
    container.innerHTML = `
      <div class="space-y-3">
        <div class="relative">
          <input type="text" id="pacotes-busca-cliente" placeholder="Buscar cliente para ver pacotes..."
            class="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
          <svg class="w-4 h-4 text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div id="pacotes-vendidos-lista"></div>
      </div>
    `;

    let debounce;
    document.getElementById('pacotes-busca-cliente')?.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const termo = e.target.value.trim();
        if (termo.length < 2) return;

        const rClientes = await Api.call('pesquisarClientes', { termo });
        if (!rClientes.ok || rClientes.data.length === 0) {
          document.getElementById('pacotes-vendidos-lista').innerHTML =
            '<p class="text-gray-500 text-sm py-4 text-center">Nenhum cliente encontrado</p>';
          return;
        }

        // Pegar pacotes do primeiro cliente encontrado
        const cliente = rClientes.data[0];
        const rPacotes = await Api.call('listarPacotesCliente', { cliente_id: cliente.id });

        if (rPacotes.ok) {
          this._renderPacotesCliente(cliente, rPacotes.data);
        }
      }, 400);
    });
  },

  _renderPacotesCliente(cliente, vendas) {
    const container = document.getElementById('pacotes-vendidos-lista');
    if (!container) return;

    if (vendas.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-sm py-4 text-center">${UI.escapeHtml(cliente.nome)} não tem pacotes vendidos</p>`;
      return;
    }

    container.innerHTML = vendas.map(v => `
      <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-3">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-white font-semibold">${UI.escapeHtml(v.modelo_nome || 'Pacote')}</h3>
            <p class="text-gray-500 text-sm">Cliente: ${UI.escapeHtml(cliente.nome)} | Vendido: ${UI.formatarData(v.data_venda)}</p>
          </div>
          <div class="text-right">
            <div class="text-white font-semibold">${UI.formatarMoeda(v.valor_total)}</div>
          </div>
        </div>
        <div class="space-y-2">
          ${(v.saldos || []).map(s => {
            const pct = s.qtd_total > 0 ? (s.qtd_usada / s.qtd_total * 100) : 0;
            const corBarra = pct >= 100 ? 'bg-gray-500' : 'bg-blue-500';
            return `
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">${UI.escapeHtml(s.servico_nome)}</span>
                  <span class="text-white">${s.qtd_usada}/${s.qtd_total} ${pct >= 100 ? '(esgotado)' : ''}</span>
                </div>
                <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div class="${corBarra} h-full rounded-full transition-all" style="width:${Math.min(pct, 100)}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button onclick="PacotesPage.verExtrato('${v.id}')" class="mt-3 text-blue-400 text-sm hover:underline">Ver extrato</button>
      </div>
    `).join('');
  },

  _bindEvents() {
    document.getElementById('btn-novo-modelo')?.addEventListener('click', () => this.abrirFormularioModelo());
    document.getElementById('btn-vender-pacote')?.addEventListener('click', () => this.abrirVendaPacote());
  },

  // ─── CRUD MODELOS ──────────────────────────────────────────────────

  abrirFormularioModelo(modelo = null) {
    const isEditar = !!modelo;
    const servicos = (Store.get('servicos') || []).filter(s => String(s.ativo) === 'true');

    const itensExistentes = modelo?.itens || [{ servico_id: '', quantidade: 1 }];

    const content = `
      <form id="form-modelo" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Nome *</label>
          <input type="text" id="fm-nome" value="${UI.escapeHtml(modelo?.nome || '')}" required
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Descrição</label>
          <textarea id="fm-descricao" rows="2" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none resize-none">${UI.escapeHtml(modelo?.descricao || '')}</textarea>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2">Itens do Pacote *</label>
          <div id="fm-itens" class="space-y-2">
            ${itensExistentes.map((it, i) => this._itemModeloHTML(i, servicos, it)).join('')}
          </div>
          <button type="button" onclick="PacotesPage.addItemModelo()" class="mt-2 text-blue-400 text-sm hover:underline">+ Adicionar item</button>
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: isEditar ? 'Editar Modelo' : 'Novo Modelo de Pacote',
      content,
      size: 'md',
      footer: `
        <button id="fm-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="fm-salvar" class="px-6 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-sm font-medium">Salvar</button>
      `
    });

    this._servicosList = servicos;
    this._itemCount = itensExistentes.length;

    document.getElementById('fm-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('fm-salvar')?.addEventListener('click', async () => {
      const nome = document.getElementById('fm-nome').value.trim();
      if (!nome) { UI.warning('Nome é obrigatório.'); return; }

      const itens = [];
      document.querySelectorAll('.fm-item-row').forEach(row => {
        const sid = row.querySelector('.fm-item-servico').value;
        const qtd = row.querySelector('.fm-item-qtd').value;
        if (sid && qtd > 0) itens.push({ servico_id: sid, quantidade: parseInt(qtd) });
      });

      if (itens.length === 0) { UI.warning('Adicione pelo menos um item.'); return; }

      const dados = {
        nome,
        descricao: document.getElementById('fm-descricao').value.trim(),
        itens
      };

      if (isEditar) dados.id = modelo.id;

      const action = isEditar ? 'atualizarModeloPacote' : 'criarModeloPacote';
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

  _itemModeloHTML(index, servicos, item = {}) {
    return `
      <div class="fm-item-row flex gap-2 items-center">
        <select class="fm-item-servico flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
          <option value="">Serviço...</option>
          ${servicos.map(s => `<option value="${s.id}" ${s.id === item.servico_id ? 'selected' : ''}>${UI.escapeHtml(s.nome)}</option>`).join('')}
        </select>
        <input type="number" class="fm-item-qtd w-20 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-blue-500 focus:outline-none" value="${item.quantidade || 1}" min="1">
        <button type="button" onclick="this.closest('.fm-item-row').remove()" class="text-red-400 hover:text-red-300 p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  },

  addItemModelo() {
    const container = document.getElementById('fm-itens');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = this._itemModeloHTML(this._itemCount++, this._servicosList || []);
    container.appendChild(div.firstElementChild);
  },

  editarModelo(id) {
    const modelos = Store.get('pacotesModelos') || [];
    const modelo = modelos.find(m => m.id === id);
    if (modelo) this.abrirFormularioModelo(modelo);
  },

  // ─── VENDA DE PACOTE ──────────────────────────────────────────────

  async abrirVendaPacote() {
    const modelos = (Store.get('pacotesModelos') || []).filter(m => String(m.ativo) !== 'false');

    const content = `
      <form id="form-venda" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Cliente *</label>
          <div class="relative">
            <input type="text" id="vp-cliente-busca" placeholder="Buscar cliente..." autocomplete="off"
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
            <input type="hidden" id="vp-cliente-id" required>
            <div id="vp-cliente-results" class="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl max-h-40 overflow-y-auto hidden"></div>
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Modelo *</label>
          <select id="vp-modelo" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
            <option value="">Selecionar modelo...</option>
            ${modelos.map(m => `<option value="${m.id}">${UI.escapeHtml(m.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Valor Total (R$) *</label>
            <input type="number" id="vp-valor" min="0" step="0.01" required
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Data da Venda</label>
            <input type="date" id="vp-data" value="${UI.getHoje()}"
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Observação</label>
          <textarea id="vp-obs" rows="2" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none resize-none"></textarea>
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: 'Vender Pacote',
      content,
      size: 'md',
      footer: `
        <button id="vp-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="vp-salvar" class="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-medium">Vender</button>
      `
    });

    // Busca de clientes
    this._setupBuscaClienteVenda();

    document.getElementById('vp-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('vp-salvar')?.addEventListener('click', async () => {
      const clienteId = document.getElementById('vp-cliente-id').value;
      if (!clienteId) { UI.warning('Selecione um cliente.'); return; }

      const r = await Api.call('venderPacote', {
        cliente_id: clienteId,
        pacote_modelo_id: document.getElementById('vp-modelo').value,
        valor_total: document.getElementById('vp-valor').value,
        data_venda: document.getElementById('vp-data').value,
        obs: document.getElementById('vp-obs').value.trim()
      });

      if (r.ok) {
        UI.success('Pacote vendido!');
        modal.close();
      } else {
        UI.error(r.msg);
      }
    });
  },

  _setupBuscaClienteVenda() {
    const input = document.getElementById('vp-cliente-busca');
    const results = document.getElementById('vp-cliente-results');
    if (!input || !results) return;

    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const termo = input.value.trim();
        if (termo.length < 2) { results.classList.add('hidden'); return; }

        const r = await Api.call('pesquisarClientes', { termo });
        if (r.ok && r.data.length > 0) {
          results.innerHTML = r.data.map(c => `
            <div class="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm" onclick="PacotesPage._selClienteVenda('${c.id}','${UI.escapeHtml(c.nome)}')">
              <div class="text-white">${UI.escapeHtml(c.nome)}</div>
            </div>
          `).join('');
          results.classList.remove('hidden');
        } else {
          results.classList.add('hidden');
        }
      }, 300);
    });
  },

  _selClienteVenda(id, nome) {
    document.getElementById('vp-cliente-id').value = id;
    document.getElementById('vp-cliente-busca').value = nome;
    document.getElementById('vp-cliente-results')?.classList.add('hidden');
  },

  // ─── EXTRATO ──────────────────────────────────────────────────────

  async verExtrato(pacoteVendidoId) {
    const r = await Api.call('extratoPacote', { pacote_vendido_id: pacoteVendidoId });
    if (!r.ok) { UI.error(r.msg); return; }

    const { venda, saldos, usos } = r.data;

    const content = `
      <div class="space-y-4">
        <div class="bg-gray-900/50 rounded-xl p-4">
          <h3 class="text-white font-semibold mb-2">Saldo</h3>
          ${saldos.map(s => `
            <div class="flex justify-between text-sm py-1 border-b border-gray-700/50 last:border-0">
              <span class="text-gray-400">${UI.escapeHtml(s.servico_nome)}</span>
              <span class="text-white">${s.qtd_usada || 0}/${s.qtd_total} usado | <span class="${s.qtd_restante > 0 ? 'text-emerald-400' : 'text-red-400'}">${s.qtd_restante} restante</span></span>
            </div>
          `).join('')}
        </div>

        <div>
          <h3 class="text-white font-semibold mb-2">Histórico de Uso</h3>
          ${usos.length === 0 ? '<p class="text-gray-500 text-sm">Nenhum uso registrado.</p>' :
            usos.map(u => `
              <div class="flex justify-between text-sm py-2 border-b border-gray-700/50">
                <div>
                  <div class="text-gray-300">${UI.escapeHtml(u.servico_nome)}</div>
                  <div class="text-gray-500 text-xs">${u.profissional_nome || ''} | ${UI.formatarData(u.data_uso_iso)}</div>
                </div>
                <span class="text-white">-${u.qtd}</span>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;

    UI.modal({ title: 'Extrato do Pacote', content, size: 'md' });
  }
};
