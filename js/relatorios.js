/**
 * MinhaAgenda 2.0 — relatorios.js
 * Página de Relatórios (admin)
 */

const RelatoriosPage = {
  async render(container) {
    container.innerHTML = this._layoutHTML();
    this._bindEvents();
    await this._gerarResumoAgenda();
  },

  _layoutHTML() {
    const hoje = UI.getHoje();
    const d = new Date();
    const primeiroDia = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA');

    return `
      <div class="space-y-6">
        <h1 class="text-xl font-bold text-white">Relatórios</h1>

        <!-- Filtros -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div class="flex flex-wrap gap-3 items-end">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Data início</label>
              <input type="date" id="rel-inicio" value="${primeiroDia}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Data fim</label>
              <input type="date" id="rel-fim" value="${ultimoDia}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Profissional</label>
              <select id="rel-prof" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                <option value="">Todos</option>
              </select>
            </div>
            <button id="btn-gerar-rel" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Gerar</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-700">
          <button id="rel-tab-agenda" class="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-400" onclick="RelatoriosPage.switchTab('agenda')">Agenda</button>
          <button id="rel-tab-pacotes" class="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-300" onclick="RelatoriosPage.switchTab('pacotes')">Pacotes</button>
        </div>

        <div id="relatorios-content">${UI.skeleton(6)}</div>
      </div>
    `;
  },

  _tabAtual: 'agenda',

  switchTab(tab) {
    this._tabAtual = tab;
    ['agenda', 'pacotes'].forEach(t => {
      const el = document.getElementById('rel-tab-' + t);
      if (el) {
        el.classList.toggle('border-blue-500', t === tab);
        el.classList.toggle('text-blue-400', t === tab);
        el.classList.toggle('border-transparent', t !== tab);
        el.classList.toggle('text-gray-400', t !== tab);
      }
    });

    if (tab === 'agenda') this._gerarResumoAgenda();
    else this._gerarResumoPacotes();
  },

  async _bindEvents() {
    // Carregar profissionais no select
    if (Store.needsRefresh('profissionais')) {
      const r = await Api.call('listarProfissionais');
      if (r.ok) {
        Store.set('profissionais', r.data);
        Store.markRefreshed('profissionais');
      }
    }

    const select = document.getElementById('rel-prof');
    if (select) {
      (Store.get('profissionais') || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        select.appendChild(opt);
      });
    }

    document.getElementById('btn-gerar-rel')?.addEventListener('click', () => {
      if (this._tabAtual === 'agenda') this._gerarResumoAgenda();
      else this._gerarResumoPacotes();
    });
  },

  async _gerarResumoAgenda() {
    const container = document.getElementById('relatorios-content');
    if (!container) return;

    container.innerHTML = UI.loader();

    const dados = {
      data_inicio: document.getElementById('rel-inicio')?.value || '',
      data_fim: document.getElementById('rel-fim')?.value || '',
      profissional_id: document.getElementById('rel-prof')?.value || ''
    };

    const r = await Api.call('resumoAgenda', dados);
    if (!r.ok) { container.innerHTML = `<p class="text-red-400">${r.msg}</p>`; return; }

    const d = r.data;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- KPIs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${this._kpiCard('Total', d.total_agendamentos, 'blue')}
          ${this._kpiCard('Concluídos', d.por_status.concluido || 0, 'green')}
          ${this._kpiCard('Faltas', d.por_status.faltou || 0, 'amber')}
          ${this._kpiCard('Taxa de Falta', d.taxa_falta, 'red')}
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <!-- Receita -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 class="text-gray-400 text-sm mb-3">Receita</h3>
            <div class="space-y-2">
              <div class="flex justify-between"><span class="text-gray-400">Estimada</span><span class="text-white font-semibold">${UI.formatarMoeda(d.receita_estimada)}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Concluída</span><span class="text-emerald-400 font-semibold">${UI.formatarMoeda(d.receita_concluida)}</span></div>
            </div>
          </div>

          <!-- Por Status -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 class="text-gray-400 text-sm mb-3">Por Status</h3>
            <div class="space-y-2">
              ${Object.entries(d.por_status).map(([s, c]) =>
                `<div class="flex items-center justify-between text-sm">
                  <span class="flex items-center gap-2">${UI.statusBadge(s)}</span>
                  <span class="text-white font-medium">${c}</span>
                </div>`
              ).join('')}
            </div>
          </div>

          <!-- Por Profissional -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 class="text-gray-400 text-sm mb-3">Por Profissional</h3>
            <div class="space-y-2">
              ${Object.entries(d.por_profissional).map(([nome, v]) =>
                `<div class="flex justify-between text-sm">
                  <span class="text-gray-300">${UI.escapeHtml(nome)}</span>
                  <span class="text-white">${v.total} <span class="text-gray-500">(${v.concluidos} concl.)</span></span>
                </div>`
              ).join('') || '<p class="text-gray-500 text-sm">Sem dados</p>'}
            </div>
          </div>

          <!-- Por Serviço -->
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 class="text-gray-400 text-sm mb-3">Por Serviço</h3>
            <div class="space-y-2">
              ${Object.entries(d.por_servico)
                .sort((a, b) => b[1] - a[1])
                .map(([nome, c]) =>
                  `<div class="flex justify-between text-sm">
                    <span class="text-gray-300">${UI.escapeHtml(nome)}</span>
                    <span class="text-white">${c}</span>
                  </div>`
                ).join('') || '<p class="text-gray-500 text-sm">Sem dados</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async _gerarResumoPacotes() {
    const container = document.getElementById('relatorios-content');
    if (!container) return;

    container.innerHTML = UI.loader();

    const dados = {
      data_inicio: document.getElementById('rel-inicio')?.value || '',
      data_fim: document.getElementById('rel-fim')?.value || ''
    };

    const r = await Api.call('resumoPacotes', dados);
    if (!r.ok) { container.innerHTML = `<p class="text-red-400">${r.msg}</p>`; return; }

    const d = r.data;

    container.innerHTML = `
      <div class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${this._kpiCard('Vendas', d.total_vendas, 'blue')}
          ${this._kpiCard('Receita', UI.formatarMoeda(d.receita_pacotes), 'green')}
          ${this._kpiCard('Créditos Pendentes', d.total_pendentes, 'amber')}
          ${this._kpiCard('Usos Realizados', d.total_usos, 'purple')}
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 class="text-gray-400 text-sm mb-3">Por Modelo</h3>
            <div class="space-y-2">
              ${Object.entries(d.por_modelo).map(([nome, c]) =>
                `<div class="flex justify-between text-sm">
                  <span class="text-gray-300">${UI.escapeHtml(nome)}</span>
                  <span class="text-white">${c} vendidos</span>
                </div>`
              ).join('') || '<p class="text-gray-500 text-sm">Sem dados</p>'}
            </div>
          </div>

          <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 class="text-gray-400 text-sm mb-3">Saldo por Serviço</h3>
            <div class="space-y-2">
              ${Object.entries(d.por_servico).map(([nome, v]) => {
                const pendente = v.total - v.usado;
                return `<div class="flex justify-between text-sm">
                  <span class="text-gray-300">${UI.escapeHtml(nome)}</span>
                  <span class="text-white">${v.usado}/${v.total} <span class="${pendente > 0 ? 'text-amber-400' : 'text-gray-500'}">(${pendente} pend.)</span></span>
                </div>`;
              }).join('') || '<p class="text-gray-500 text-sm">Sem dados</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _kpiCard(label, value, color) {
    const colors = {
      blue: 'from-blue-600/20 to-blue-600/5 border-blue-800/50',
      green: 'from-emerald-600/20 to-emerald-600/5 border-emerald-800/50',
      amber: 'from-amber-600/20 to-amber-600/5 border-amber-800/50',
      red: 'from-red-600/20 to-red-600/5 border-red-800/50',
      purple: 'from-purple-600/20 to-purple-600/5 border-purple-800/50'
    };
    return `
      <div class="bg-gradient-to-br ${colors[color] || colors.blue} rounded-xl p-4 border">
        <div class="text-xs text-gray-400 mb-1">${UI.escapeHtml(label)}</div>
        <div class="text-2xl font-bold text-white">${typeof value === 'string' ? value : value}</div>
      </div>
    `;
  }
};
