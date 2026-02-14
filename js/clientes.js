/**
 * MinhaAgenda 2.0 — clientes.js
 * Página de Clientes: CRUD, busca, importação
 */

const ClientesPage = {
  async render(container) {
    container.innerHTML = this._layoutHTML();
    await this._carregarClientes();
    this._bindEvents();
  },

  _layoutHTML() {
    return `
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 class="text-xl font-bold text-white">Clientes</h1>
          <div class="flex items-center gap-2">
            <div class="relative flex-1 sm:w-72">
              <input type="text" id="clientes-busca" placeholder="Buscar por nome, telefone..."
                class="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
              <svg class="w-4 h-4 text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            ${Auth.isAdmin() ? `
            <button id="btn-importar-clientes" class="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors" title="Importar CSV/Excel">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            </button>` : ''}
            <button id="btn-novo-cliente" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Novo
            </button>
          </div>
        </div>

        <div id="clientes-lista" class="space-y-2">${UI.skeleton(5)}</div>
      </div>
    `;
  },

  async _carregarClientes() {
    const r = await Api.call('listarClientes');
    if (r.ok) {
      const clientes = Array.isArray(r.data) ? r.data : (r.data?.itens || []);
      Store.set('clientes', clientes);
      Store.markRefreshed('clientes');
      this._renderLista(clientes);
    } else {
      UI.error(r.msg);
    }
  },

  _renderLista(clientes) {
    const container = document.getElementById('clientes-lista');
    if (!container) return;

    if (clientes.length === 0) {
      container.innerHTML = UI.emptyState(
        '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
        'Nenhum cliente cadastrado',
        'Adicione seu primeiro cliente clicando em "Novo"'
      );
      return;
    }

    container.innerHTML = clientes.map(c => `
      <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer flex items-center justify-between group"
        onclick="ClientesPage.abrirEditar('${c.id}')">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-semibold text-sm flex-shrink-0">
            ${UI.escapeHtml((c.nome || '?').charAt(0).toUpperCase())}
          </div>
          <div class="min-w-0">
            <div class="text-white font-medium truncate">${UI.escapeHtml(c.nome)}</div>
            <div class="text-gray-500 text-sm truncate">${UI.formatarTelefone(c.telefone) || ''} ${c.email ? '| ' + UI.escapeHtml(c.email) : ''}</div>
          </div>
        </div>
        <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </div>
    `).join('');
  },

  _bindEvents() {
    let debounce;
    document.getElementById('clientes-busca')?.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const termo = e.target.value.toLowerCase().trim();
        const clientes = Store.get('clientes') || [];

        if (!termo) {
          this._renderLista(clientes);
          return;
        }

        const filtrados = clientes.filter(c => {
          return (c.nome || '').toLowerCase().includes(termo) ||
                 (c.telefone || '').replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
                 (c.email || '').toLowerCase().includes(termo);
        });
        this._renderLista(filtrados);
      }, 200);
    });

    document.getElementById('btn-novo-cliente')?.addEventListener('click', () => this.abrirFormulario());
    document.getElementById('btn-importar-clientes')?.addEventListener('click', () => this.abrirImportacao());
  },

  // ─── FORMULÁRIO CRUD ──────────────────────────────────────────────

  abrirFormulario(cliente = null) {
    const isEditar = !!cliente;

    const content = `
      <form id="form-cliente" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Nome *</label>
          <input type="text" id="fc-nome" value="${UI.escapeHtml(cliente?.nome || '')}" required
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Telefone</label>
          <input type="tel" id="fc-telefone" value="${UI.escapeHtml(cliente?.telefone || '')}"
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Email</label>
          <input type="email" id="fc-email" value="${UI.escapeHtml(cliente?.email || '')}"
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Observações</label>
          <textarea id="fc-obs" rows="2" maxlength="500"
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none resize-none">${UI.escapeHtml(cliente?.obs || '')}</textarea>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Tags</label>
          <input type="text" id="fc-tags" value="${UI.escapeHtml(cliente?.tags || '')}" placeholder="Ex: VIP, FREQUENTE"
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: isEditar ? 'Editar Cliente' : 'Novo Cliente',
      content,
      size: 'md',
      footer: `
        <button id="fc-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="fc-salvar" class="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium">Salvar</button>
      `
    });

    document.getElementById('fc-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('fc-salvar')?.addEventListener('click', async () => {
      const nome = document.getElementById('fc-nome').value.trim();
      if (!nome) { UI.warning('Nome é obrigatório.'); return; }

      const dados = {
        nome,
        telefone: document.getElementById('fc-telefone').value.trim(),
        email: document.getElementById('fc-email').value.trim(),
        obs: document.getElementById('fc-obs').value.trim(),
        tags: document.getElementById('fc-tags').value.trim()
      };

      if (isEditar) dados.id = cliente.id;

      const action = isEditar ? 'atualizarCliente' : 'criarCliente';
      const r = await Api.call(action, dados);

      if (r.ok) {
        UI.success(isEditar ? 'Cliente atualizado!' : 'Cliente criado!');
        modal.close();
        this._carregarClientes();
      } else {
        UI.error(r.msg);
      }
    });
  },

  abrirEditar(id) {
    const clientes = Store.get('clientes') || [];
    const cliente = clientes.find(c => c.id === id);
    if (cliente) this.abrirFormulario(cliente);
  },

  // ─── IMPORTAÇÃO CSV/EXCEL ─────────────────────────────────────────

  abrirImportacao() {
    const content = `
      <div class="space-y-4">
        <p class="text-gray-400 text-sm">Selecione um arquivo CSV ou Excel (.xlsx) com as colunas: Nome, Telefone, Email</p>

        <div class="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-600 transition-colors" id="import-dropzone">
          <input type="file" id="import-file" accept=".csv,.xlsx,.xls" class="hidden">
          <svg class="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
          <p class="text-gray-400 text-sm">Clique para selecionar ou arraste o arquivo</p>
        </div>

        <div id="import-mapping" class="hidden space-y-3">
          <h3 class="text-white font-medium">Mapear colunas</h3>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Nome *</label>
              <select id="map-nome" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"></select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Telefone</label>
              <select id="map-telefone" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"></select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Email</label>
              <select id="map-email" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"></select>
            </div>
          </div>
          <div id="import-preview" class="bg-gray-900 rounded-lg p-3 text-sm text-gray-400 max-h-32 overflow-y-auto"></div>
        </div>

        <div id="import-resultado" class="hidden"></div>
      </div>
    `;

    const modal = UI.modal({
      title: 'Importar Clientes',
      content,
      size: 'lg',
      footer: `
        <button id="imp-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="imp-importar" class="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium hidden">Importar</button>
      `
    });

    this._importData = null;

    const dropzone = document.getElementById('import-dropzone');
    const fileInput = document.getElementById('import-file');

    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this._processarArquivo(e.target.files[0]));
    dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-blue-500'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('border-blue-500'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-blue-500');
      if (e.dataTransfer.files[0]) this._processarArquivo(e.dataTransfer.files[0]);
    });

    document.getElementById('imp-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('imp-importar')?.addEventListener('click', () => this._executarImportacao(modal));
  },

  async _processarArquivo(file) {
    if (!file) return;

    try {
      // Verificar se XLSX está carregado
      if (typeof XLSX === 'undefined') {
        // Carregar SheetJS dinamicamente
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (json.length < 2) {
        UI.warning('Arquivo vazio ou sem dados.');
        return;
      }

      const headers = json[0].map(h => String(h || '').trim());
      const rows = json.slice(1).filter(r => r.some(c => c));

      this._importData = { headers, rows };

      // Popular selects de mapeamento
      const options = '<option value="">-- Selecionar --</option>' +
        headers.map((h, i) => `<option value="${i}">${UI.escapeHtml(h)}</option>`).join('');

      ['map-nome', 'map-telefone', 'map-email'].forEach(id => {
        const select = document.getElementById(id);
        if (select) select.innerHTML = options;
      });

      // Auto-mapear
      headers.forEach((h, i) => {
        const hl = h.toLowerCase();
        if (hl.includes('nome') || hl.includes('name')) document.getElementById('map-nome').value = i;
        if (hl.includes('tel') || hl.includes('fone') || hl.includes('phone')) document.getElementById('map-telefone').value = i;
        if (hl.includes('email') || hl.includes('e-mail')) document.getElementById('map-email').value = i;
      });

      // Preview
      const preview = document.getElementById('import-preview');
      if (preview) {
        preview.textContent = `${rows.length} registros encontrados. Primeiros 3:\n` +
          rows.slice(0, 3).map(r => r.join(' | ')).join('\n');
      }

      document.getElementById('import-mapping')?.classList.remove('hidden');
      document.getElementById('imp-importar')?.classList.remove('hidden');

    } catch (e) {
      UI.error('Erro ao processar arquivo: ' + e.message);
    }
  },

  async _executarImportacao(modal) {
    if (!this._importData) return;

    const colNome = parseInt(document.getElementById('map-nome').value);
    if (isNaN(colNome)) { UI.warning('Mapeie a coluna Nome.'); return; }

    const colTel = parseInt(document.getElementById('map-telefone').value);
    const colEmail = parseInt(document.getElementById('map-email').value);

    const clientes = this._importData.rows.map(r => ({
      nome: String(r[colNome] || '').trim(),
      telefone: !isNaN(colTel) ? String(r[colTel] || '').trim() : '',
      email: !isNaN(colEmail) ? String(r[colEmail] || '').trim() : ''
    })).filter(c => c.nome);

    if (clientes.length === 0) {
      UI.warning('Nenhum registro válido para importar.');
      return;
    }

    const btn = document.getElementById('imp-importar');
    btn.disabled = true;
    btn.textContent = 'Importando...';

    const r = await Api.call('importarClientes', { clientes }, { timeout: 60000, retries: 0 });

    if (r.ok) {
      const d = r.data;
      document.getElementById('import-resultado').innerHTML = `
        <div class="bg-emerald-900/20 border border-emerald-800 rounded-xl p-4 space-y-2">
          <div class="text-emerald-400 font-semibold">Importação concluída!</div>
          <div class="text-sm text-gray-300">Importados: <span class="text-white font-medium">${d.importados}</span></div>
          <div class="text-sm text-gray-300">Duplicados: <span class="text-amber-400">${d.duplicados}</span></div>
          <div class="text-sm text-gray-300">Erros: <span class="text-red-400">${d.erros}</span></div>
        </div>
      `;
      document.getElementById('import-resultado').classList.remove('hidden');
      document.getElementById('import-mapping').classList.add('hidden');
      btn.classList.add('hidden');

      this._carregarClientes();
    } else {
      UI.error(r.msg);
      btn.disabled = false;
      btn.textContent = 'Importar';
    }
  }
};
