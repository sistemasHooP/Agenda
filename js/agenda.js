/**
 * MinhaAgenda 2.0 — agenda.js
 * Página da Agenda: visão semanal/diária, criação, edição, bloqueios
 */

const AgendaPage = {
  PENDENCIAS_KEY: 'ma2_agenda_pendencias',
  _agendaRequestSeq: 0,
  _agendaRequestAtual: 0,
  _agendaLoadKeyAtual: '',
  _fallbackSemanaTentado: false,

  async render(container) {
    const semanaKey = Store.get('semanaKey') || UI.getSemanaKey();
    Store.set('semanaKey', semanaKey);

    container.innerHTML = this._layoutHTML();
    this._fallbackSemanaTentado = false;

    // Não bloquear render por pendências antigas
    this._processarPendenciasSilencioso();

    // Render imediato para evitar skeleton infinito
    if (!(Store.get('datas') || []).length) {
      Store.set('datas', UI.getDatasDaSemana(semanaKey));
    }
    this._renderGrade();
    this._bindEvents();

    // Carga principal com timeout de segurança
    try {
      await Promise.race([
        this._carregarDados({ forceAgendaFetch: true, origem: 'render' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_agenda')), 12000))
      ]);
    } catch (_) {
      // mantém grade já renderizada; sync de fundo continua
    }

    this._renderGrade();
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
@@ -56,198 +61,268 @@ const AgendaPage = {
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

  _debugAgendaLog(evento, extra = {}) {
    try {
      console.log('[AgendaPage]', evento, {
        semanaKey: Store.get('semanaKey'),
        profissionalFiltro: Store.get('profissionalFiltro'),
        ...extra
      });
    } catch (_) {}
  },

  _getAgendaLoadKey(semanaKey, profFiltro) {
    return `${String(semanaKey || '')}|${String(profFiltro || 'all')}`;
  },

  _abrirRequisicaoAgenda(semanaKey, profFiltro) {
    const reqId = ++this._agendaRequestSeq;
    this._agendaRequestAtual = reqId;
    this._agendaLoadKeyAtual = this._getAgendaLoadKey(semanaKey, profFiltro);
    return { reqId, loadKey: this._agendaLoadKeyAtual };
  },

  _requisicaoAgendaAindaValida(reqId, loadKey) {
    return this._agendaRequestAtual === reqId && this._agendaLoadKeyAtual === loadKey;
  },

  _navegarSemana(direcao) {
    const sk = UI.navSemana(Store.get('semanaKey'), direcao);
    Store.set('semanaKey', sk);
    Store.set('datas', UI.getDatasDaSemana(sk));
    this._renderGrade();
    this._carregarDados({ forceAgendaFetch: true, origem: 'navegacao_semana' }).then(() => this._renderGrade());
  },

  _recarregarSemanaAtual(origem) {
    const sk = Store.get('semanaKey') || UI.getSemanaKey();
    Store.set('semanaKey', sk);
    Store.set('datas', UI.getDatasDaSemana(sk));
    this._renderGrade();
    this._carregarDados({ forceAgendaFetch: true, origem }).then(() => this._renderGrade());
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

    for (const p of pend.slice(0, 5)) {
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

  async _carregarDados(options = {}) {
    const forceAgendaFetch = options.forceAgendaFetch !== false;
    const origem = options.origem || 'desconhecida';

    const semanaKey = Store.get('semanaKey') || UI.getSemanaKey();
    const profFiltro = Store.get('profissionalFiltro');
    const req = this._abrirRequisicaoAgenda(semanaKey, profFiltro);

    Store.setLoading('agenda', true);
    this._debugAgendaLog('carregar_inicio', {
      origem,
      reqId: req.reqId,
      loadKey: req.loadKey,
      forceAgendaFetch
    });

    try {
      const promises = [];

      if (Store.needsRefresh('profissionais')) {
        promises.push(
          Api.call('listarProfissionais').then(r => {
            if (r.ok && this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) {
              Store.set('profissionais', r.data);
              Store.markRefreshed('profissionais');
            }
          })
        );
      }

      if (Store.needsRefresh('servicos')) {
        promises.push(
          Api.call('listarServicos').then(r => {
            if (r.ok && this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) {
              Store.set('servicos', r.data);
              Store.markRefreshed('servicos');
            }
          })
        );
      }

      if (Store.needsRefresh('clientes')) {
        promises.push(
          Api.call('listarClientes').then(r => {
            if (r.ok && this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) {
              const clientes = Array.isArray(r.data) ? r.data : (r.data?.itens || []);
              Store.set('clientes', clientes);
              Store.markRefreshed('clientes');
            }
          })
        );
      }

      const dados = { semana_key: semanaKey };
      if (profFiltro && profFiltro !== 'all') {
        dados.profissional_id = profFiltro;
      }

      if (forceAgendaFetch) {
        promises.push(
          Api.call('listarAgendaSemana', dados).then(r => {
            if (!this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) {
              this._debugAgendaLog('carregar_descartado_stale', {
                origem,
                reqId: req.reqId,
                loadKey: req.loadKey
              });
              return;
            }

            if (r.ok) {
              const datas = Array.isArray(r.data?.datas) ? r.data.datas : UI.getDatasDaSemana(semanaKey);
              const agsServidor = Array.isArray(r.data?.agendamentos) ? r.data.agendamentos : [];
              this._ultimaCargaServidor = { semana_key: String(dados.semana_key || ''), quantidade: agsServidor.length };
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

              const diaResolvido = this._resolverDiaAtual(datas);
              if (String(Store.get('diaAtual') || '') !== String(diaResolvido)) {
                Store.set('diaAtual', diaResolvido);
              }

              this._debugAgendaLog('carregar_sucesso', {
                origem,
                reqId: req.reqId,
                semanaKey,
                totalServidor: agsServidor.length,
                totalUI: agsFinal.length
              });
            }
          })
        );
      }

      await Promise.all(promises);

      if (!this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) return;

      const semDadosNoServidor = (this._ultimaCargaServidor && this._ultimaCargaServidor.quantidade === 0);
      if (semDadosNoServidor || (Store.get('agendamentos') || []).length === 0) {
        this._tentarCarregarSemanaComDados();
      }

      this._popularFiltroProfissionais();
    } catch (e) {
      this._debugAgendaLog('carregar_erro', { origem, reqId: req.reqId, erro: e?.message || 'erro_desconhecido' });
      UI.error('Erro ao carregar agenda.');
    } finally {
      if (this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) {
        Store.setLoading('agenda', false);
      }
    }
  },


  async _tentarCarregarSemanaComDados() {
    if (this._fallbackSemanaTentado) return;
    this._fallbackSemanaTentado = true;

    const profFiltro = Store.get('profissionalFiltro');
    const payload = {};
    if (profFiltro && profFiltro !== 'all') payload.profissional_id = profFiltro;

    const aplicarSemanaDestino = async (semanaKey, diaKey) => {
      const atual = String(Store.get('semanaKey') || '');
      const destino = String(semanaKey || '');
      if (!destino || destino === atual) return false;
      Store.set('semanaKey', destino);
      if (diaKey) Store.set('diaAtual', diaKey);
      await this._carregarDados();
      this._renderGrade();
      return true;
    };

    try {
      const r = await Api.call('obterSemanaAgendaRecente', payload, { retries: 1, timeout: 15000 });
      if (r.ok && r.data && r.data.semana_key) {
        const ok = await aplicarSemanaDestino(r.data.semana_key, r.data.dia_key);
        if (ok) return;
      }
@@ -429,55 +504,59 @@ const AgendaPage = {
            const extra = iniciandoAgora.length > 2 ? `<div class="text-[10px] text-blue-400 px-1">+${iniciandoAgora.length - 2} agend.</div>` : '';
            cellContent = `<div class="p-1">${cards}${extra}</div>`;
            cellClass += ' p-0';
          }
        } else if (agend && !agend._isStart && !agend._renderAsOverlay) {
          const serv = servicosMap[agend.servico_id] || {};
          const cor = serv.cor || '#3B82F6';
          const isCancelado = agend.status === APP_CONFIG.STATUS.CANCELADO;
          cellClass = `p-0 border-l border-gray-700/50 relative overflow-visible ${isCancelado ? 'opacity-70' : ''}`;
          cellContent = `<div class="agenda-fill absolute inset-0 min-h-[44px] ${isHourStart ? 'agenda-fill-merge-top' : ''}" style="--agenda-fill:${cor}; background:${cor}22;"></div>`;
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
    const datasSemana = Store.get('datas') || [];
    const diaAtual = this._resolverDiaAtual(datasSemana);
    Store.set('diaAtual', diaAtual);

    const agendamentos = (Store.get('agendamentos') || []).filter(a => this._getAgendamentoDiaKey(a) === diaAtual);
    const bloqueios = (Store.get('bloqueios') || []).filter((b) => {
      const inicio = this._parseIsoLocalParts(b?.inicio_iso);
      return inicio && inicio.dateKey === diaAtual;
    });
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
@@ -498,136 +577,153 @@ const AgendaPage = {
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

  _resolverDiaAtual(datasSemana) {
    const datas = Array.isArray(datasSemana) ? datasSemana : [];
    const hoje = UI.getHoje();
    const atual = String(Store.get('diaAtual') || '').substring(0, 10);

    if (!datas.length) {
      return atual || hoje;
    }

    if (atual && datas.includes(atual)) return atual;
    if (datas.includes(hoje)) return hoje;
    return String(datas[0]);
  },

  _getAgendamentoDiaKey(agendamento) {
    const dia = String(agendamento?.dia_key || '').substring(0, 10);
    if (dia) return dia;
    return String(this._parseIsoLocalParts(agendamento?.inicio_iso)?.dateKey || '');
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
      this._navegarSemana(-1);
    });

    document.getElementById('agenda-next')?.addEventListener('click', () => {
      this._navegarSemana(1);
    });

    document.getElementById('agenda-hoje')?.addEventListener('click', () => {
      Store.set('semanaKey', UI.getSemanaKey());
      Store.set('diaAtual', UI.getHoje());
      this._recarregarSemanaAtual('botao_hoje');
    });

    document.getElementById('btn-visao-semana')?.addEventListener('click', () => {
      Store.set('visao', 'semana');
      this._renderGrade();
    });

    document.getElementById('btn-visao-dia')?.addEventListener('click', () => {
      Store.set('visao', 'dia');
      this._renderGrade();
    });

    document.getElementById('agenda-filtro-prof')?.addEventListener('change', (e) => {
      Store.set('profissionalFiltro', e.target.value);
      this._recarregarSemanaAtual('troca_filtro_profissional');
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
@@ -808,51 +904,51 @@ const AgendaPage = {
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
      const dia = this._getAgendamentoDiaKey(a);
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
@@ -860,82 +956,97 @@ const AgendaPage = {
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
      const semanaKey = Store.get('semanaKey') || UI.getSemanaKey();
      const profFiltro = Store.get('profissionalFiltro');
      const req = this._abrirRequisicaoAgenda(semanaKey, profFiltro);
      const dados = { semana_key: semanaKey };
      if (profFiltro && profFiltro !== 'all') dados.profissional_id = profFiltro;

      const r = await Api.call('listarAgendaSemana', dados, { retries: 1, timeout: 15000 });
      if (!this._requisicaoAgendaAindaValida(req.reqId, req.loadKey)) {
        this._debugAgendaLog('sync_descartado_stale', { reqId: req.reqId, loadKey: req.loadKey });
        return;
      }

      if (r.ok && r.data) {
        const datas = Array.isArray(r.data.datas) ? r.data.datas : (Store.get('datas') || UI.getDatasDaSemana(semanaKey));
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

        this._debugAgendaLog('sync_sucesso', {
          reqId: req.reqId,
          semanaKey,
          totalServidor: servidor.length,
          totalUI: agsMerged.length
        });
      }
    } catch (e) {
      this._debugAgendaLog('sync_erro', { erro: e?.message || 'erro_desconhecido' });
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
