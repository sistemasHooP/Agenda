/**
 * MinhaAgenda 2.0 — agenda.js
 * Página da Agenda: visão semanal/diária, criação, edição, bloqueios
 */

const AgendaPage = {
  PENDENCIAS_KEY: 'ma2_agenda_pendencias',
  async render(container) {
    const semanaKey = Store.get('semanaKey') || UI.getSemanaKey();
    Store.set('semanaKey', semanaKey);

    container.innerHTML = this._layoutHTML();
    this._fallbackSemanaTentado = false;
    await this._processarPendenciasSilencioso();
    await this._carregarDados();
    this._renderGrade();
    this._bindEvents();
  },

  _layoutHTML() {
    const visao = Store.get('visao') || 'semana';
    const isAdmin = Auth.isAdmin();
    return `
      <div class="agenda-container">
        <!-- Header da Agenda -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <button id="agenda-prev" class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button id="agenda-hoje" class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Hoje</button>
            <button id="agenda-next" class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <span id="agenda-periodo" class="text-white font-semibold ml-2"></span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            ${isAdmin ? `
            <select id="agenda-filtro-prof" class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none">
              <option value="all">Todos profissionais</option>
            </select>` : ''}

            <div class="flex bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <button id="btn-visao-semana" class="px-3 py-2 text-sm font-medium transition-colors ${visao === 'semana' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}">Semana</button>
              <button id="btn-visao-dia" class="px-3 py-2 text-sm font-medium transition-colors ${visao === 'dia' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}">Dia</button>
            </div>

            <button id="btn-novo-bloqueio" class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors" title="Bloquear horário">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </button>
          </div>
        </div>

        <!-- Grade da Agenda -->
        <div id="agenda-grade" class="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          ${UI.skeleton(8)}
        </div>
      </div>
    `;
  },


  _getPendencias() {
    try {
      const raw = localStorage.getItem(this.PENDENCIAS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  },

  _setPendencias(arr) {
    try {
      localStorage.setItem(this.PENDENCIAS_KEY, JSON.stringify(arr || []));
    } catch (_) {}
  },

  _addPendencia(item) {
    const pend = this._getPendencias();
    pend.push(item);
    this._setPendencias(pend);
  },

  _removePendencia(id) {
    const pend = this._getPendencias().filter(p => p.id !== id);
    this._setPendencias(pend);
  },

  async _processarPendenciasSilencioso() {
    const pend = this._getPendencias();
    if (!pend.length) return;

    for (const p of pend) {
      if (p.tipo !== 'criarAgendamento') continue;
      const r = await Api.call('criarAgendamento', p.dados, { retries: 1, timeout: 15000 });
      if (r.ok) {
        this._removePendencia(p.id);
        continue;
      }

      const msg = String(r?.msg || '').toLowerCase();
      const erroNegocio = msg.includes('saldo') || msg.includes('pacote') || msg.includes('conflito') || msg.includes('não encontrado');
      if (erroNegocio) {
        this._removePendencia(p.id);
      }
    }
  },

  async _carregarDados() {
    Store.setLoading('agenda', true);

    try {
      // Carregar profissionais e serviços se necessário
      const promises = [];

      if (Store.needsRefresh('profissionais')) {
        promises.push(
          Api.call('listarProfissionais').then(r => {
            if (r.ok) {
              Store.set('profissionais', r.data);
              Store.markRefreshed('profissionais');
            }
          })
        );
      }

      if (Store.needsRefresh('servicos')) {
        promises.push(
          Api.call('listarServicos').then(r => {
            if (r.ok) {
              Store.set('servicos', r.data);
              Store.markRefreshed('servicos');
            }
          })
        );
      }

      if (Store.needsRefresh('clientes')) {
        promises.push(
          Api.call('listarClientes').then(r => {
            if (r.ok) {
              const clientes = Array.isArray(r.data) ? r.data : (r.data?.itens || []);
              Store.set('clientes', clientes);
              Store.markRefreshed('clientes');
            }
          })
        );
      }

      // Carregar agenda
      const semanaKey = Store.get('semanaKey');
      const profFiltro = Store.get('profissionalFiltro');
      const dados = { semana_key: semanaKey };
      if (profFiltro && profFiltro !== 'all') {
        dados.profissional_id = profFiltro;
      }

      promises.push(
        Api.call('listarAgendaSemana', dados).then(r => {
          if (r.ok) {
            const datas = Array.isArray(r.data?.datas) ? r.data.datas : (Store.get('datas') || []);
            const agsServidor = Array.isArray(r.data?.agendamentos) ? r.data.agendamentos : [];
            const bloqsServidor = Array.isArray(r.data?.bloqueios) ? r.data.bloqueios : [];
            const agsAtuais = Store.get('agendamentos') || [];

            const mesmaSemana = String(Store.get('semanaKey')) === String(dados.semana_key);
            const manterAtuais = agsServidor.length === 0 && agsAtuais.length > 0 && mesmaSemana;
            const teveMutacaoRecente = (Date.now() - (this._ultimaMutacaoLocalTs || 0)) < 20000;
            const suspeitaRespostaParcial = mesmaSemana && teveMutacaoRecente && agsServidor.length > 0 && agsServidor.length < agsAtuais.length;
            const agsFinal = (manterAtuais || suspeitaRespostaParcial)
              ? this._mergeAgendamentosComPendentes([...agsServidor, ...agsAtuais], datas)
              : this._mergeAgendamentosComPendentes(agsServidor, datas);

            Store.setMultiple({
              datas,
              agendamentos: agsFinal,
              bloqueios: bloqsServidor
            });
          }
        })
      );

      await Promise.all(promises);

      if ((Store.get('agendamentos') || []).length === 0) {
        await this._tentarCarregarSemanaComDados();
      }

      // Popular filtro de profissionais
      this._popularFiltroProfissionais();

    } catch (e) {
      UI.error('Erro ao carregar agenda.');
    } finally {
      Store.setLoading('agenda', false);
    }
  },

  async _tentarCarregarSemanaComDados() {
    if (this._fallbackSemanaTentado) return;
    this._fallbackSemanaTentado = true;

    const profFiltro = Store.get('profissionalFiltro');
    const payload = {};
    if (profFiltro && profFiltro !== 'all') payload.profissional_id = profFiltro;

    try {
      const r = await Api.call('obterSemanaAgendaRecente', payload, { retries: 1, timeout: 15000 });
      if (!r.ok || !r.data || !r.data.semana_key) return;

      const atual = String(Store.get('semanaKey') || '');
      const destino = String(r.data.semana_key || '');
      if (!destino || destino === atual) return;

      Store.set('semanaKey', destino);
      if (r.data.dia_key) Store.set('diaAtual', r.data.dia_key);
      await this._carregarDados();
    } catch (_) {
      // fallback silencioso
    }
  },

  _popularFiltroProfissionais() {
    const select = document.getElementById('agenda-filtro-prof');
    if (!select) return;

    const profissionais = Store.get('profissionais') || [];
    const filtroAtual = Store.get('profissionalFiltro') || 'all';

    select.innerHTML = '<option value="all">Todos profissionais</option>';
    profissionais.filter(p => String(p.ativo) === 'true').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nome;
      if (p.id === filtroAtual) opt.selected = true;
      select.appendChild(opt);
    });
  },

  _renderGrade() {
    const gradeEl = document.getElementById('agenda-grade');
    if (!gradeEl) return;

    const visao = Store.get('visao') || 'semana';
    const periodoEl = document.getElementById('agenda-periodo');

    if (visao === 'semana') {
      this._renderSemana(gradeEl, periodoEl);
    } else {
      this._renderDia(gradeEl, periodoEl);
    }
  },

  _renderSemana(gradeEl, periodoEl) {
    const datas = Store.get('datas') || [];
    const agendamentos = Store.get('agendamentos') || [];
    const bloqueios = Store.get('bloqueios') || [];
    const slots = UI.gerarSlots();
    const hoje = UI.getHoje();
    const profissionais = Store.get('profissionais') || [];
    const servicos = Store.get('servicos') || [];

    // Maps para lookup rápido
    const servicosMap = {};
    servicos.forEach(s => servicosMap[s.id] = s);
    const profsMap = {};
    profissionais.forEach(p => profsMap[p.id] = p);
    const clientesMap = this._buildClienteMap();
    agendamentos.forEach((a) => { if (!a._clienteNome) a._clienteNome = clientesMap[a.cliente_id] || ''; });

    // Período label
    if (periodoEl && datas.length >= 2) {
      const d1 = new Date(datas[0] + 'T12:00:00');
      const d2 = new Date(datas[6] + 'T12:00:00');
      periodoEl.textContent = d1.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
        ' - ' + d2.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Montar grade
    let html = '<div class="overflow-x-auto"><table class="w-full border-collapse min-w-[700px]">';

    // Header com dias
    html += '<thead><tr><th class="sticky left-0 bg-gray-800 z-10 w-16 px-2 py-3 text-xs text-gray-500 font-medium border-b border-gray-700"></th>';
    for (let d = 0; d < datas.length; d++) {
      const isHoje = datas[d] === hoje;
      const dia = new Date(datas[d] + 'T12:00:00');
      html += `<th class="px-1 py-3 text-center border-b border-gray-700 ${isHoje ? 'bg-blue-600/10' : ''} min-w-[120px]">
        <div class="text-xs text-gray-500 font-medium">${APP_CONFIG.DIAS_SEMANA[dia.getDay()]}</div>
        <div class="${isHoje ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-gray-300'} text-sm font-semibold mt-1">${dia.getDate()}</div>
      </th>`;
    }
    html += '</tr></thead><tbody>';

    // Linhas de horários
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s];
      const isHourStart = slot.endsWith(':00');

      html += `<tr class="${isHourStart ? 'border-t border-gray-700' : ''} agenda-slot-row">`;
      html += `<td class="sticky left-0 bg-gray-800 z-10 px-2 py-1 text-right agenda-time-col">
        <span class="text-xs ${isHourStart ? 'text-gray-300 font-semibold' : 'text-gray-500'} font-mono">${slot}</span>
      </td>`;

      for (let d = 0; d < datas.length; d++) {
        const isHoje = datas[d] === hoje;
        const cellDate = datas[d];
        const cellTime = cellDate + 'T' + slot + ':00';

        const iniciandoAgora = this._agendamentosIniciandoNoSlot(agendamentos, cellDate, slot);
        const agend = this._findAgendamento(agendamentos, cellDate, slot);
        const bloq = this._findBloqueio(bloqueios, cellDate, slot);

        let cellContent = '';
        let cellClass = `px-1 py-1 border-l border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition-colors ${isHoje ? 'bg-blue-600/5' : ''}`;

        if (bloq) {
          cellClass = `px-1 py-1 border-l border-gray-700/50 bg-red-900/20`;
          cellContent = `<div class="text-xs text-red-400/70 truncate px-1" title="${UI.escapeHtml(bloq.motivo || 'Bloqueado')}">
            <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            Bloqueado
          </div>`;
        } else if (iniciandoAgora.length > 0) {
          const cards = iniciandoAgora.slice(0, 2).map((item) => {
            const serv = servicosMap[item.servico_id] || {};
            const prof = profsMap[item.profissional_id] || {};
            const cor = serv.cor || '#3B82F6';
            const statusCfg = APP_CONFIG.STATUS_CORES[item.status] || APP_CONFIG.STATUS_CORES.marcado;
            const clienteNome = clientesMap[item.cliente_id] || item._clienteNome || 'Cliente';
            const isCancelado = item.status === APP_CONFIG.STATUS.CANCELADO;
            return `<div class="agenda-card rounded-lg px-2 py-1 text-xs cursor-pointer border-l-2 transition-transform hover:scale-[1.02] mb-1 ${isCancelado ? 'opacity-70' : ''}"
              style="border-left-color:${cor}; background: ${cor}15;"
              onclick="event.stopPropagation(); AgendaPage.abrirDetalhes('${item.id}')">
              <div class="font-semibold text-white truncate ${item.status === APP_CONFIG.STATUS.CANCELADO ? 'line-through' : ''}">${UI.escapeHtml(clienteNome)}</div>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full ${statusCfg.dot}"></span>
                <span class="${statusCfg.text} text-[10px]">${UI.formatarHora(item.inicio_iso)} - ${UI.formatarHora(item.fim_iso)}</span>
              </div>
              <div class="text-[10px] ${statusCfg.text} uppercase truncate">${UI.escapeHtml(item.status || '')}</div>${item.tags ? `<div class=\"text-[10px] text-blue-300 truncate\">${UI.escapeHtml(item.tags)}</div>` : ''}
              ${Auth.isAdmin() ? `<div class="text-gray-500 text-[10px] truncate">${UI.escapeHtml(prof.nome || '')}</div>` : ''}
            </div>`;
          }).join('');

          const extra = iniciandoAgora.length > 2 ? `<div class="text-[10px] text-blue-400 px-1">+${iniciandoAgora.length - 2} agend.</div>` : '';
          cellContent = `<div class="p-1">${cards}${extra}</div>`;
          cellClass += ' p-0';
        } else if (agend && !agend._isStart) {
          const serv = servicosMap[agend.servico_id] || {};
          const cor = serv.cor || '#3B82F6';
          const isCancelado = agend.status === APP_CONFIG.STATUS.CANCELADO;
          cellClass = `p-0 border-l border-gray-700/50 ${isCancelado ? 'opacity-70' : ''}`;
          cellContent = `<div class="agenda-fill h-full min-h-[44px] ${isHourStart ? 'agenda-fill-merge-top' : ''}" style="--agenda-fill:${cor}; background:${cor}22;"></div>`;
        }

        html += `<td class="${cellClass}" data-date="${cellDate}" data-time="${slot}" onclick="AgendaPage.clickSlot('${cellDate}','${slot}')">
          ${cellContent}
        </td>`;
      }

      html += '</tr>';
    }

    html += '</tbody></table></div>';
    gradeEl.innerHTML = html;
  },

  _renderDia(gradeEl, periodoEl) {
    const diaAtual = Store.get('diaAtual') || UI.getHoje();
    Store.set('diaAtual', diaAtual);

    const agendamentos = (Store.get('agendamentos') || []).filter(a => a.dia_key === diaAtual);
    const bloqueios = Store.get('bloqueios') || [];
    const slots = UI.gerarSlots();
    const servicos = Store.get('servicos') || [];
    const profissionais = Store.get('profissionais') || [];

    const servicosMap = {};
    servicos.forEach(s => servicosMap[s.id] = s);
    const profsMap = {};
    profissionais.forEach(p => profsMap[p.id] = p);

    if (periodoEl) {
      const d = new Date(diaAtual + 'T12:00:00');
      periodoEl.textContent = UI.getDiaSemanaFull(diaAtual) + ', ' +
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    let html = '<div class="divide-y divide-gray-700/50">';

    for (const slot of slots) {
      const isHourStart = slot.endsWith(':00');
      const iniciandoAgora = this._agendamentosIniciandoNoSlot(agendamentos, diaAtual, slot);
      const agend = this._findAgendamento(agendamentos, diaAtual, slot);
      const bloq = this._findBloqueio(bloqueios, diaAtual, slot);

      html += `<div class="flex items-stretch hover:bg-gray-700/20 transition-colors cursor-pointer" onclick="AgendaPage.clickSlot('${diaAtual}','${slot}')">
        <div class="w-16 flex-shrink-0 py-3 px-3 text-right">
          <span class="text-xs ${isHourStart ? 'text-gray-400' : 'text-gray-600'} font-mono">${slot}</span>
        </div>
        <div class="flex-1 py-2 px-3 min-h-[44px]">`;

      if (bloq) {
        html += `<div class="bg-red-900/20 rounded-lg px-3 py-2 border border-red-800/30">
          <span class="text-red-400 text-sm">Bloqueado</span>
          ${bloq.motivo ? `<span class="text-red-400/60 text-xs ml-2">${UI.escapeHtml(bloq.motivo)}</span>` : ''}
        </div>`;
      } else if (iniciandoAgora.length > 0) {
        html += iniciandoAgora.map((item) => {
          const serv = servicosMap[item.servico_id] || {};
          const prof = profsMap[item.profissional_id] || {};
          const cor = serv.cor || '#3B82F6';
          const isCancelado = item.status === APP_CONFIG.STATUS.CANCELADO;
          return `<div class="rounded-xl px-4 py-3 border-l-4 cursor-pointer hover:scale-[1.01] transition-transform mb-2 ${isCancelado ? 'opacity-70' : ''}"
            style="border-left-color:${cor}; background: ${cor}15;"
            onclick="event.stopPropagation(); AgendaPage.abrirDetalhes('${item.id}')">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-white ${item.status === APP_CONFIG.STATUS.CANCELADO ? 'line-through' : ''}">${UI.escapeHtml(item._clienteNome || 'Cliente')}</span>
              ${UI.statusBadge(item.status)}
            </div>
            <div class="text-gray-400 text-sm mt-1">${UI.escapeHtml(serv.nome || '')} ${serv.duracao_min ? `(${serv.duracao_min}min)` : ''}</div>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>${UI.formatarHora(item.inicio_iso)} - ${UI.formatarHora(item.fim_iso)}</span>
              <span>${UI.escapeHtml(prof.nome || '')}</span>
              ${item.tags ? `<span class="text-blue-400">${UI.escapeHtml(item.tags)}</span>` : ''}
            </div>
          </div>`;
        }).join('');
      }

      html += '</div></div>';
    }

    html += '</div>';
    gradeEl.innerHTML = html;
  },

  _buildClienteMap() {
    const map = {};
    (Store.get('clientes') || []).forEach(c => { map[c.id] = c.nome || ''; });
    return map;
  },

  _agendamentosIniciandoNoSlot(agendamentos, dateStr, timeSlot) {
    const slotMin = this._slotToMinutes(timeSlot);
    return agendamentos.filter((a) => {
      const ini = this._parseIsoLocalParts(a.inicio_iso);
      return ini && ini.dateKey === String(dateStr) && ini.minutes === slotMin;
    });
  },

  _findAgendamento(agendamentos, dateStr, timeSlot) {
    const slotMin = this._slotToMinutes(timeSlot);

    for (const a of agendamentos) {
      const ini = this._parseIsoLocalParts(a.inicio_iso);
      const fim = this._parseIsoLocalParts(a.fim_iso);
      if (!ini || !fim) continue;
      if (ini.dateKey !== String(dateStr)) continue;

      if (slotMin >= ini.minutes && slotMin < fim.minutes) {
        a._isStart = slotMin === ini.minutes;
        if (!a._clienteNome) {
          const clientes = Store.get('clientes') || [];
          const cliente = clientes.find(c => c.id === a.cliente_id);
          a._clienteNome = cliente ? cliente.nome : '';
        }
        return a;
      }
    }
    return null;
  },

  _findBloqueio(bloqueios, dateStr, timeSlot) {
    const slotTime = new Date(dateStr + 'T' + timeSlot + ':00').getTime();

    for (const b of bloqueios) {
      const inicio = new Date(b.inicio_iso).getTime();
      const fim = new Date(b.fim_iso).getTime();
      if (slotTime >= inicio && slotTime < fim) return b;
    }
    return null;
  },

  _bindEvents() {
    document.getElementById('agenda-prev')?.addEventListener('click', () => {
      const sk = UI.navSemana(Store.get('semanaKey'), -1);
      Store.set('semanaKey', sk);
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('agenda-next')?.addEventListener('click', () => {
      const sk = UI.navSemana(Store.get('semanaKey'), 1);
      Store.set('semanaKey', sk);
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('agenda-hoje')?.addEventListener('click', () => {
      Store.set('semanaKey', UI.getSemanaKey());
      Store.set('diaAtual', UI.getHoje());
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('btn-visao-semana')?.addEventListener('click', () => {
      Store.set('visao', 'semana');
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('btn-visao-dia')?.addEventListener('click', () => {
      Store.set('visao', 'dia');
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('agenda-filtro-prof')?.addEventListener('change', (e) => {
      Store.set('profissionalFiltro', e.target.value);
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('btn-novo-bloqueio')?.addEventListener('click', () => {
      this.abrirModalBloqueio();
    });
  },

  // ─── CLICAR EM SLOT VAZIO ──────────────────────────────────────────

  clickSlot(date, time) {
    const agendamentos = Store.get('agendamentos') || [];
    const slotMin = this._slotToMinutes(time);
    const encontrados = [];

    for (const a of agendamentos) {
      const ini = this._parseIsoLocalParts(a.inicio_iso);
      const fim = this._parseIsoLocalParts(a.fim_iso);
      if (!ini || !fim) continue;
      if (ini.dateKey !== String(date)) continue;
      if (slotMin >= ini.minutes && slotMin < fim.minutes) encontrados.push(a);
    }

    if (encontrados.length === 1) {
      this.abrirDetalhes(encontrados[0].id);
      return;
    }

    if (encontrados.length > 1) {
      const content = `<div class="space-y-2">${encontrados.map((a) => `
        <button class="w-full text-left bg-gray-900 border border-gray-700 rounded-xl p-3 hover:border-blue-500" onclick="UI.closeModal(); AgendaPage.abrirDetalhes('${a.id}')">
          <div class="text-white font-medium">${UI.escapeHtml(a._clienteNome || 'Cliente')}</div>
          <div class="text-xs text-gray-400">${UI.formatarHora(a.inicio_iso)} - ${UI.formatarHora(a.fim_iso)}</div>
        </button>`).join('')}</div>`;
      UI.modal({ title: 'Agendamentos neste horário', content, size: 'sm' });
      return;
    }

    this.abrirModalNovoAgendamento(date, time);
  },

  // ─── MODAL: NOVO AGENDAMENTO ──────────────────────────────────────

  async abrirModalNovoAgendamento(date, time) {
    // Carregar clientes se necessário
    if (Store.needsRefresh('clientes')) {
      const r = await Api.call('listarClientes');
      if (r.ok) {
        Store.set('clientes', Array.isArray(r.data) ? r.data : r.data.itens || []);
        Store.markRefreshed('clientes');
      }
    }

    const profissionais = (Store.get('profissionais') || []).filter(p => String(p.ativo) === 'true');
    const servicos = (Store.get('servicos') || []).filter(s => String(s.ativo) === 'true');
    const user = Auth.getUser();

    const profDefault = Auth.isProfissional() ? user.profissional_id : (profissionais[0]?.id || '');

    const content = `
      <form id="form-agendamento" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Cliente *</label>
          <div class="relative">
            <input type="text" id="ag-cliente-busca" placeholder="Buscar cliente..." autocomplete="off"
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
            <input type="hidden" id="ag-cliente-id" required>
            <div id="ag-cliente-results" class="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl max-h-40 overflow-y-auto hidden"></div>
          </div>
          <button type="button" onclick="AgendaPage.novoClienteRapido()" class="text-blue-400 text-xs mt-1 hover:underline">+ Novo cliente</button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Profissional *</label>
            <select id="ag-profissional" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
              ${profissionais.map(p => `<option value="${p.id}" ${p.id === profDefault ? 'selected' : ''}>${UI.escapeHtml(p.nome)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Serviço *</label>
            <select id="ag-servico" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
              ${servicos.map(s => `<option value="${s.id}">${UI.escapeHtml(s.nome)} (${s.duracao_min}min - ${UI.formatarMoeda(s.preco)})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Data *</label>
            <input type="date" id="ag-data" value="${date}" required
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Horário *</label>
            <input type="time" id="ag-hora" value="${time}" required step="1800"
              class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">Tags</label>
          <div class="flex flex-wrap gap-2" id="ag-tags-container">
            ${APP_CONFIG.TAGS.map(t => `<label class="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer"><input type="checkbox" value="${t}" class="ag-tag rounded border-gray-600"> ${t}</label>`).join('')}
          </div>
        </div>

        <div id="ag-pacotes-area" class="hidden">
          <label class="block text-sm text-gray-400 mb-1">Pacotes ativos do cliente</label>
          <div id="ag-pacotes-list" class="space-y-2"></div>
          <input type="hidden" id="ag-pacote-vendido-id">
          <input type="hidden" id="ag-pacote-servico-id">
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">Observação</label>
          <textarea id="ag-obs" rows="2" maxlength="500"
            class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none resize-none"></textarea>
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: 'Novo Agendamento',
      content,
      size: 'md',
      footer: `
        <button id="ag-cancelar" class="px-4 py-2.5 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm font-medium">Cancelar</button>
        <button id="ag-salvar" class="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium">Agendar</button>
      `
    });

    // Busca de clientes
    this._setupBuscaCliente();

    document.getElementById('ag-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('ag-salvar')?.addEventListener('click', () => this._salvarAgendamento(modal));
  },

  _setupBuscaCliente() {
    const input = document.getElementById('ag-cliente-busca');
    const results = document.getElementById('ag-cliente-results');
    if (!input || !results) return;

    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const termo = input.value.trim();
        if (termo.length < 2) { results.classList.add('hidden'); return; }

        const locais = (Store.get('clientes') || []).filter((c) => {
          const nome = String(c.nome || '').toLowerCase();
          const tel = String(c.telefone || '').replace(/\D/g, '');
          const t = termo.toLowerCase();
          return nome.includes(t) || tel.includes(t.replace(/\D/g, ''));
        }).slice(0, 20);

        const renderResultados = (lista) => {
          if (lista.length > 0) {
            results.innerHTML = lista.map(c => `
              <div class="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm" onclick="AgendaPage.selecionarCliente('${c.id}','${UI.escapeHtml(c.nome)}')">
                <div class="text-white">${UI.escapeHtml(c.nome)}</div>
                <div class="text-gray-500 text-xs">${UI.formatarTelefone(c.telefone) || c.email || ''}</div>
              </div>
            `).join('');
          } else {
            results.innerHTML = '<div class="px-4 py-2 text-gray-500 text-sm">Nenhum cliente encontrado</div>';
          }
          results.classList.remove('hidden');
        };

        if (locais.length > 0) {
          renderResultados(locais);
          return;
        }

        const r = await Api.call('pesquisarClientes', { termo });
        renderResultados(r.ok ? (r.data || []) : []);
      }, 300);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#ag-cliente-busca') && !e.target.closest('#ag-cliente-results')) {
        results.classList.add('hidden');
      }
    });
  },

  selecionarCliente(id, nome) {
    document.getElementById('ag-cliente-id').value = id;
    document.getElementById('ag-cliente-busca').value = nome;
    document.getElementById('ag-cliente-results').classList.add('hidden');
    this._carregarPacotesClienteNoModal(id);
  },


  _formatLocalIso(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  },

  _parseIsoLocalParts(isoValue) {
    const str = String(isoValue || '');
    const m = str.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
    if (m) {
      return { dateKey: m[1], minutes: (parseInt(m[2], 10) * 60) + parseInt(m[3], 10) };
    }

    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return null;
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dateKey, minutes: (d.getHours() * 60) + d.getMinutes() };
  },

  _slotToMinutes(timeSlot) {
    const [h, m] = String(timeSlot || '00:00').split(':');
    return ((parseInt(h, 10) || 0) * 60) + (parseInt(m, 10) || 0);
  },

  _mergeAgendamentosComPendentes(agendamentosServidor, datasServidor) {
    const serverList = Array.isArray(agendamentosServidor) ? agendamentosServidor : [];
    const datasSet = new Set((datasServidor || []).map(String));
    const now = Date.now();

    const localValidos = (Store.get('agendamentos') || []).filter((a) => {
      if (!a) return false;
      const dia = String(a.dia_key || this._parseIsoLocalParts(a.inicio_iso)?.dateKey || '').substring(0, 10);
      if (datasSet.size > 0 && !datasSet.has(dia)) return false;

      if (!a._optimistic) return true;
      const created = parseInt(a._createdLocalTs, 10) || now;
      return (now - created) < 300000;
    });

    const merged = new Map();
    localValidos.forEach((a) => merged.set(String(a.id), a));
    serverList.forEach((a) => {
      const prev = merged.get(String(a.id)) || {};
      merged.set(String(a.id), { ...prev, ...a, _optimistic: false });
    });

    return Array.from(merged.values());
  },

  _atualizarAgendamentoLocal(id, patch) {
    this._ultimaMutacaoLocalTs = Date.now();
    const lista = [...(Store.get('agendamentos') || [])];
    const idx = lista.findIndex(a => String(a.id) === String(id));
    if (idx < 0) return null;
    const anterior = { ...lista[idx] };
    lista[idx] = { ...lista[idx], ...patch, _optimistic: true, _createdLocalTs: Date.now() };
    Store.set('agendamentos', lista);
    this._renderGrade();
    return anterior;
  },

  _inserirAgendamentoLocal(ag) {
    this._ultimaMutacaoLocalTs = Date.now();
    const lista = [...(Store.get('agendamentos') || [])];
    lista.push(ag);
    Store.set('agendamentos', lista);
    this._renderGrade();
  },

  _removerAgendamentoLocal(id) {
    this._ultimaMutacaoLocalTs = Date.now();
    const lista = [...(Store.get('agendamentos') || [])];
    const idx = lista.findIndex(a => String(a.id) === String(id));
    if (idx < 0) return null;
    const removido = lista[idx];
    lista.splice(idx, 1);
    Store.set('agendamentos', lista);
    this._renderGrade();
    return removido;
  },

  async _sincronizarAgendaSilenciosa() {
    try {
      const semanaKey = Store.get('semanaKey');
      const profFiltro = Store.get('profissionalFiltro');
      const dados = { semana_key: semanaKey };
      if (profFiltro && profFiltro !== 'all') dados.profissional_id = profFiltro;

      const r = await Api.call('listarAgendaSemana', dados, { retries: 1, timeout: 15000 });
      if (r.ok && r.data) {
        const datas = Array.isArray(r.data.datas) ? r.data.datas : (Store.get('datas') || []);
        const servidor = Array.isArray(r.data.agendamentos) ? r.data.agendamentos : [];
        const atuais = Store.get('agendamentos') || [];

        const teveMutacaoRecente = (Date.now() - (this._ultimaMutacaoLocalTs || 0)) < 20000;
        const manterAtuais = servidor.length === 0 && atuais.length > 0;
        const suspeitaRespostaParcial = teveMutacaoRecente && servidor.length > 0 && servidor.length < atuais.length;

        const agsMerged = (manterAtuais || suspeitaRespostaParcial)
          ? this._mergeAgendamentosComPendentes([...servidor, ...atuais], datas)
          : this._mergeAgendamentosComPendentes(servidor, datas);

        Store.setMultiple({
          datas,
          agendamentos: agsMerged,
          bloqueios: Array.isArray(r.data.bloqueios) ? r.data.bloqueios : (Store.get('bloqueios') || [])
        });
        this._renderGrade();
      }
    } catch (_) {
      // sincronização silenciosa (sem toast)
    }
  },


  async _carregarPacotesClienteNoModal(clienteId) {
    const area = document.getElementById('ag-pacotes-area');
    const list = document.getElementById('ag-pacotes-list');
    if (!area || !list || !clienteId) return;

    const r = await Api.call('listarPacotesCliente', { cliente_id: clienteId });
    if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) {
      area.classList.add('hidden');
      list.innerHTML = '';
      document.getElementById('ag-pacote-vendido-id').value = '';
      document.getElementById('ag-pacote-servico-id').value = '';
      return;
    }

    const opcoes = [];
    r.data.forEach((v) => {
      (v.saldos || []).forEach((s) => {
        const restante = parseInt(s.qtd_restante, 10) || 0;
        if (restante > 0) opcoes.push({
          pacote_vendido_id: v.id,
          pacote_nome: v.modelo_nome || 'Pacote',
          servico_id: s.servico_id,
          servico_nome: s.servico_nome,
          restante
        });
      });
    });

    if (opcoes.length === 0) {
      area.classList.add('hidden');
      list.innerHTML = '';
      return;
    }

    area.classList.remove('hidden');
    list.innerHTML = opcoes.map((o) => `
      <button type="button" data-pacote="${o.pacote_vendido_id}" data-servico="${o.servico_id}" class="ag-pacote-opcao w-full text-left bg-gray-900 border border-gray-700 rounded-xl p-2 hover:border-blue-500 transition-colors"
        onclick="AgendaPage.selecionarServicoPacote('${o.pacote_vendido_id}','${o.servico_id}')">
        <div class="text-sm text-white">${UI.escapeHtml(o.pacote_nome)} · ${UI.escapeHtml(o.servico_nome)}</div>
        <div class="text-xs text-emerald-400">Restante: ${o.restante}</div>
      </button>
    `).join('');
  },

  selecionarServicoPacote(pacoteVendidoId, servicoId) {
    const pv = document.getElementById('ag-pacote-vendido-id');
    const ps = document.getElementById('ag-pacote-servico-id');
    if (pv) pv.value = pacoteVendidoId;
    if (ps) ps.value = servicoId;

    const servSel = document.getElementById('ag-servico');
    if (servSel) servSel.value = servicoId;

    document.querySelectorAll('.ag-pacote-opcao').forEach((el) => {
      const ativo = el.getAttribute('data-pacote') === pacoteVendidoId && el.getAttribute('data-servico') === servicoId;
      el.classList.toggle('border-blue-500', ativo);
      el.classList.toggle('bg-blue-500/10', ativo);
    });

    UI.info('Serviço do pacote selecionado para este agendamento.');
  },

  async novoClienteRapido() {
    const content = `
      <form id="form-cliente-rapido" class="space-y-3">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Nome *</label>
          <input type="text" id="cr-nome" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Telefone</label>
          <input type="tel" id="cr-telefone" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Email</label>
          <input type="email" id="cr-email" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
      </form>
    `;

    const modal2 = UI.modal({
      title: 'Novo Cliente',
      content,
      size: 'sm',
      footer: `
        <button id="cr-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="cr-salvar" class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium">Salvar</button>
      `
    });

    document.getElementById('cr-cancelar')?.addEventListener('click', modal2.close);
    document.getElementById('cr-salvar')?.addEventListener('click', async () => {
      const nome = document.getElementById('cr-nome').value.trim();
      if (!nome) { UI.warning('Nome é obrigatório.'); return; }

      const r = await Api.call('criarCliente', {
        nome,
        telefone: document.getElementById('cr-telefone').value.trim(),
        email: document.getElementById('cr-email').value.trim()
      });

      if (r.ok) {
        UI.success('Cliente criado!');
        modal2.close();
        Store.markRefreshed('clientes'); // Forçar refresh
        this.selecionarCliente(r.data.id, r.data.nome || nome);
      } else {
        UI.error(r.msg);
      }
    });
  },

  async _salvarAgendamento(modal) {
    const clienteId = document.getElementById('ag-cliente-id').value;
    if (!clienteId) { UI.warning('Selecione um cliente.'); return; }

    const data = document.getElementById('ag-data').value;
    const hora = document.getElementById('ag-hora').value;
    if (!data || !hora) { UI.warning('Data e horário são obrigatórios.'); return; }

    const tags = Array.from(document.querySelectorAll('.ag-tag:checked')).map(cb => cb.value).join(',');

    const dados = {
      profissional_id: document.getElementById('ag-profissional').value,
      cliente_id: clienteId,
      servico_id: document.getElementById('ag-servico').value,
      inicio_iso: data + 'T' + hora + ':00',
      tags: tags,
      obs: document.getElementById('ag-obs').value.trim(),
      pacote_vendido_id: document.getElementById('ag-pacote-vendido-id')?.value || '',
      pacote_servico_id: document.getElementById('ag-pacote-servico-id')?.value || ''
    };

    const servSel = (Store.get('servicos') || []).find(s => s.id === dados.servico_id);
    const duracao = parseInt(servSel?.duracao_min, 10) || APP_CONFIG.INTERVALO_MIN;
    const inicio = new Date(dados.inicio_iso);
    const fim = new Date(inicio.getTime() + duracao * 60000);
    const cliente = (Store.get('clientes') || []).find(c => c.id === dados.cliente_id);
    const tempId = 'tmp_' + Date.now();

    const pendId = 'pend_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    this._addPendencia({ id: pendId, tipo: 'criarAgendamento', dados });

    this._inserirAgendamentoLocal({
      id: tempId,
      ...dados,
      _clienteNome: cliente?.nome || '',
      _optimistic: true,
      _createdLocalTs: Date.now(),
      _pendenciaId: pendId,
      fim_iso: this._formatLocalIso(fim),
      status: APP_CONFIG.STATUS.MARCADO,
      dia_key: dados.inicio_iso.substring(0, 10)
    });

    modal.close();

    const r = await Api.call('criarAgendamento', dados);
    if (r.ok) {
      this._removePendencia(pendId);
      this._atualizarAgendamentoLocal(tempId, { id: r.data.id, _pendenciaId: '' });
      UI.success('Agendamento criado!');
      this._sincronizarAgendaSilenciosa();
    } else {
      const msg = String(r.msg || '').toLowerCase();
      const erroPacoteOuConflito = msg.includes('saldo') || msg.includes('pacote') || msg.includes('conflito') || msg.includes('não encontrado');
      if (erroPacoteOuConflito) {
        this._removePendencia(pendId);
        this._removerAgendamentoLocal(tempId);
        UI.error(r.msg || 'Não foi possível criar o agendamento.');
        return;
      }
      UI.warning('Agendamento salvo localmente e será sincronizado automaticamente.');
    }
  },

  // ─── MODAL: DETALHES / EDITAR ─────────────────────────────────────

  async abrirDetalhes(agendamentoId) {
    const agendamentos = Store.get('agendamentos') || [];
    const agend = agendamentos.find(a => a.id === agendamentoId);
    if (!agend) { UI.error('Agendamento não encontrado.'); return; }

    // Buscar dados enriquecidos
    if (Store.needsRefresh('clientes')) {
      const r = await Api.call('listarClientes');
      if (r.ok) {
        Store.set('clientes', Array.isArray(r.data) ? r.data : []);
        Store.markRefreshed('clientes');
      }
    }

    const clientes = Store.get('clientes') || [];
    const servicos = Store.get('servicos') || [];
    const profissionais = Store.get('profissionais') || [];

    const cliente = clientes.find(c => c.id === agend.cliente_id) || {};
    const servico = servicos.find(s => s.id === agend.servico_id) || {};
    const prof = profissionais.find(p => p.id === agend.profissional_id) || {};
    const statusCfg = APP_CONFIG.STATUS_CORES[agend.status] || {};

    const content = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-white font-semibold text-lg">${UI.escapeHtml(cliente.nome || 'Cliente')}</h3>
            <p class="text-gray-500 text-sm">${UI.formatarTelefone(cliente.telefone) || ''} ${cliente.email ? '| ' + UI.escapeHtml(cliente.email) : ''}</p>
          </div>
          ${UI.statusBadge(agend.status)}
        </div>

        <div class="grid grid-cols-2 gap-4 bg-gray-900/50 rounded-xl p-4">
          <div>
            <span class="text-xs text-gray-500">Serviço</span>
            <div class="text-white text-sm font-medium flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background:${servico.cor || '#3B82F6'}"></span>
              ${UI.escapeHtml(servico.nome || '')}
            </div>
          </div>
          <div>
            <span class="text-xs text-gray-500">Valor</span>
            <div class="text-white text-sm font-medium">${UI.formatarMoeda(servico.preco)}</div>
          </div>
          <div>
            <span class="text-xs text-gray-500">Data/Hora</span>
            <div class="text-white text-sm font-medium">${UI.formatarData(agend.inicio_iso)} ${UI.formatarHora(agend.inicio_iso)} - ${UI.formatarHora(agend.fim_iso)}</div>
          </div>
          <div>
            <span class="text-xs text-gray-500">Profissional</span>
            <div class="text-white text-sm font-medium">${UI.escapeHtml(prof.nome || '')}</div>
          </div>
        </div>

        ${agend.tags ? `<div><span class="text-xs text-gray-500">Tags:</span> ${agend.tags.split(',').map(t => UI.badge(t.trim(), 'purple')).join(' ')}</div>` : ''}
        ${agend.obs ? `<div><span class="text-xs text-gray-500">Obs:</span> <span class="text-gray-300 text-sm">${UI.escapeHtml(agend.obs)}</span></div>` : ''}

        <!-- Ações de Status -->
        <div class="border-t border-gray-700 pt-4">
          <label class="text-sm text-gray-400 mb-2 block">Alterar Status</label>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(APP_CONFIG.STATUS).map(([key, val]) => {
              const sc = APP_CONFIG.STATUS_CORES[val] || {};
              const isAtual = agend.status === val;
              return `<button class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isAtual ? sc.bg + ' ' + sc.text + ' ring-1 ring-current' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}"
                onclick="AgendaPage.mudarStatus('${agend.id}','${val}')">${key.charAt(0) + key.slice(1).toLowerCase()}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Lembrete WhatsApp -->
        <div class="border-t border-gray-700 pt-4">
          <button onclick="AgendaPage.gerarLembrete('${agend.id}')" class="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.624-1.474A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.17 0-4.207-.578-5.963-1.588l-.427-.254-2.745.876.863-2.657-.278-.442A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z"/></svg>
            Enviar lembrete WhatsApp
          </button>
        </div>
      </div>
    `;

    const canCancel = agend.status !== 'cancelado' && agend.status !== 'concluido';

    UI.modal({
      title: 'Detalhes do Agendamento',
      content,
      size: 'md',
      footer: canCancel ? `
        <button onclick="AgendaPage.cancelar('${agend.id}')" class="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm font-medium">Cancelar Agendamento</button>
        <button onclick="AgendaPage.excluir('${agend.id}')" class="px-4 py-2 rounded-xl bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-sm font-medium">Excluir</button>
        <button onclick="UI.closeModal()" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Fechar</button>
      ` : `
        <button onclick="AgendaPage.excluir('${agend.id}')" class="px-4 py-2 rounded-xl bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-sm font-medium">Excluir</button>
        <button onclick="UI.closeModal()" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Fechar</button>
      `
    });
  },

  async mudarStatus(id, status) {
    const anterior = this._atualizarAgendamentoLocal(id, { status });
    UI.closeModal();

    const r = await Api.call('marcarStatus', { id, status });
    if (r.ok) {
      UI.success(r.msg);
      this._sincronizarAgendaSilenciosa();
    } else {
      if (anterior) this._atualizarAgendamentoLocal(id, { status: anterior.status });
      UI.error(r.msg);
    }
  },

  async cancelar(id) {
    const ok = await UI.confirm('Cancelar agendamento', 'Tem certeza que deseja cancelar este agendamento?');
    if (!ok) return;

    const anterior = this._atualizarAgendamentoLocal(id, { status: APP_CONFIG.STATUS.CANCELADO });
    UI.closeModal();

    const r = await Api.call('cancelarAgendamento', { id });
    if (r.ok) {
      UI.success('Agendamento cancelado.');
      this._sincronizarAgendaSilenciosa();
    } else {
      if (anterior) this._atualizarAgendamentoLocal(id, { status: anterior.status });
      UI.error(r.msg);
    }
  },

  async excluir(id) {
    const ok = await UI.confirm('Excluir agendamento', 'Deseja realmente excluir este agendamento? Se houver baixa de pacote, o saldo será estornado.');
    if (!ok) return;

    const removido = this._removerAgendamentoLocal(id);
    UI.closeModal();

    const r = await Api.call('excluirAgendamento', { id });
    if (r.ok) {
      UI.success(r.msg || 'Agendamento excluído.');
      this._sincronizarAgendaSilenciosa();
    } else {
      if (removido) this._inserirAgendamentoLocal(removido);
      UI.error(r.msg || 'Erro ao excluir.');
    }
  },

  async gerarLembrete(agendamentoId) {
    const r = await Api.call('gerarMensagemLembrete', {
      agendamento_id: agendamentoId,
      template: 'confirmacao'
    });

    if (r.ok) {
      const { mensagem, whatsapp_link } = r.data;

      const content = `
        <div class="space-y-4">
          <div class="bg-gray-900 rounded-xl p-4">
            <pre class="text-gray-300 text-sm whitespace-pre-wrap">${UI.escapeHtml(mensagem)}</pre>
          </div>
          <div class="flex gap-3">
            ${whatsapp_link ? `<a href="${whatsapp_link}" target="_blank" class="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-2.5 hover:bg-emerald-500 transition-colors text-sm font-medium"
              onclick="AgendaPage._registrarLembrete('${agendamentoId}','whatsapp','${UI.escapeHtml(mensagem.substring(0, 100))}')">
              Abrir WhatsApp
            </a>` : ''}
            <button onclick="navigator.clipboard.writeText(document.querySelector('#lembrete-texto').textContent); UI.success('Copiado!'); AgendaPage._registrarLembrete('${agendamentoId}','copiado','')"
              class="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white rounded-xl py-2.5 hover:bg-gray-600 transition-colors text-sm font-medium">
              Copiar Mensagem
            </button>
          </div>
          <div id="lembrete-texto" class="hidden">${UI.escapeHtml(mensagem)}</div>
        </div>
      `;

      UI.modal({ title: 'Lembrete', content, size: 'md' });
    } else {
      UI.error(r.msg);
    }
  },

  async _registrarLembrete(agendamentoId, canal, msg) {
    await Api.call('registrarEnvioLembrete', {
      agendamento_id: agendamentoId,
      canal,
      mensagem: msg || canal
    });
  },

  // ─── MODAL: BLOQUEIO ──────────────────────────────────────────────

  async abrirModalBloqueio() {
    const profissionais = (Store.get('profissionais') || []).filter(p => String(p.ativo) === 'true');
    const user = Auth.getUser();
    const profDefault = Auth.isProfissional() ? user.profissional_id : '';

    const content = `
      <form id="form-bloqueio" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Profissional *</label>
          <select id="bq-profissional" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
            ${profissionais.map(p => `<option value="${p.id}" ${p.id === profDefault ? 'selected' : ''}>${UI.escapeHtml(p.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Início *</label>
            <input type="datetime-local" id="bq-inicio" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Fim *</label>
            <input type="datetime-local" id="bq-fim" required class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Motivo</label>
          <input type="text" id="bq-motivo" maxlength="200" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none">
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: 'Bloquear Horário',
      content,
      size: 'md',
      footer: `
        <button id="bq-cancelar" class="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">Cancelar</button>
        <button id="bq-salvar" class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 text-sm font-medium">Bloquear</button>
      `
    });

    document.getElementById('bq-cancelar')?.addEventListener('click', modal.close);
    document.getElementById('bq-salvar')?.addEventListener('click', async () => {
      const inicio = document.getElementById('bq-inicio').value;
      const fim = document.getElementById('bq-fim').value;
      if (!inicio || !fim) { UI.warning('Horários são obrigatórios.'); return; }

      const payload = {
        profissional_id: document.getElementById('bq-profissional').value,
        inicio_iso: inicio + ':00',
        fim_iso: fim + ':00',
        motivo: document.getElementById('bq-motivo').value.trim()
      };

      const tempBloq = {
        id: 'tmp_bq_' + Date.now(),
        semana_key: Store.get('semanaKey'),
        ...payload,
        _optimistic: true,
        _createdLocalTs: Date.now()
      };

      const bloqs = [...(Store.get('bloqueios') || []), tempBloq];
      Store.set('bloqueios', bloqs);
      this._renderGrade();
      modal.close();

      const r = await Api.call('criarBloqueio', payload);

      if (r.ok) {
        const atual = [...(Store.get('bloqueios') || [])];
        const idx = atual.findIndex(b => b.id === tempBloq.id);
        if (idx >= 0) atual[idx].id = r.data.id;
        Store.set('bloqueios', atual);
        this._renderGrade();
        UI.success('Horário bloqueado!');
        this._sincronizarAgendaSilenciosa();
      } else {
        Store.set('bloqueios', (Store.get('bloqueios') || []).filter(b => b.id !== tempBloq.id));
        this._renderGrade();
        UI.error(r.msg);
      }
    });
  }
};
