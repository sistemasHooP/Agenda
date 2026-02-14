import { state } from './state.js';
import { fmtMoney, statusBadge } from './ui.js';

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function dayLabel(dt) {
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function eventColor(service) {
  return service?.cor || '#f59e0b';
}

function toSlotY(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  return ((h - 7) * 60 + m) * (42 / 30);
}

function renderAgendaEvents(weekStart) {
  const cliMap = Object.fromEntries(state.clientes.map(c => [String(c.id), c]));
  const srvMap = Object.fromEntries(state.servicos.map(s => [String(s.id), s]));

  const cols = Array.from({ length: 7 }, (_, i) => {
    const left = 74 + (i * (100 / 7));
    return `<div class="day-col" style="left: calc(${left}% - ${(74 / 7).toFixed(4)}px)"></div>`;
  }).join('');

  const events = state.agendamentos.map((a) => {
    const start = new Date(a.inicio_iso);
    const end = new Date(a.fim_iso);
    const day = start.getDay();

    const baseDay = new Date(weekStart);
    baseDay.setDate(baseDay.getDate() + day);
    if (start.toDateString() !== baseDay.toDateString()) return '';

    const top = Math.max(0, toSlotY(start));
    const height = Math.max(28, toSlotY(end) - toSlotY(start));
    const left = `calc(74px + (${day} * (100% - 74px) / 7))`;
    const width = `calc((100% - 74px) / 7)`;

    const cli = cliMap[String(a.cliente_id)];
    const srv = srvMap[String(a.servico_id)];
    const label = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')} - ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

    return `
      <div class="event-card" style="top:${top}px;height:${height}px;left:${left};width:${width};background:${eventColor(srv)}">
        <div><strong>${label}</strong></div>
        <div>${cli ? cli.nome : a.cliente_id}</div>
        <div>${srv ? srv.nome : a.servico_id}</div>
      </div>
    `;
  }).join('');

  return `<div class="agenda-events-layer">${cols}${events}</div>`;
}

export function renderAgendamentos() {
  const weekStart = getWeekStart();
  const hours = [];
  for (let h = 7; h <= 18; h++) {
    hours.push({ h, m: 0 });
    hours.push({ h, m: 30 });
  }

  let rows = '';
  for (const t of hours) {
    const label = `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
    rows += `<div class="agenda-row"><div class="agenda-time">${label}</div>`;

    for (let d = 0; d < 7; d++) {
      const dt = new Date(weekStart);
      dt.setDate(weekStart.getDate() + d);
      dt.setHours(t.h, t.m, 0, 0);
      rows += `<button class="agenda-slot" data-slot-start="${dt.toISOString()}" aria-label="Agendar ${label}"></button>`;
    }

    rows += '</div>';
  }

  const profActive = state.profissionais.find(p => String(p.id) === String(state.agenda_profissional_id));

  return `
    <section class="space-y-4">
      <div class="clean-card top-filters">
        <div>
          <p class="label">Agenda ativa</p>
          <select id="agendaProfissional" class="input-clean">
            ${state.profissionais.map(p => `<option value="${p.id}" ${String(p.id) === String(state.agenda_profissional_id) ? 'selected' : ''}>${p.nome}</option>`).join('')}
          </select>
          <p class="muted mt-1">${profActive ? `Novos agendamentos para ${profActive.nome}` : ''}</p>
        </div>
        <button id="btnNovoAgendamento" class="btn-primary">Novo agendamento</button>
      </div>

      <div class="clean-card">
        <h2 class="section-title">Agenda semanal</h2>
        <div class="agenda-board">
          <div class="agenda-header">
            <div class="agenda-head-cell">Hora</div>
            ${Array.from({ length: 7 }, (_, d) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + d);
              return `<div class="agenda-head-cell">${dayLabel(date)}</div>`;
            }).join('')}
          </div>
          ${rows}
          ${renderAgendaEvents(weekStart)}
        </div>
      </div>
    </section>
  `;
}

export function renderClientes() {
  return `
    <section class="space-y-3">
      <div class="clean-card form-grid">
        <input id="clienteNome" class="input-clean" placeholder="Nome do cliente" />
        <input id="clienteTelefone" class="input-clean" placeholder="Telefone" />
        <button id="btnSalvarCliente" class="btn-primary">Salvar cliente</button>
      </div>
      ${state.clientes.map(c => `<div class="clean-card"><strong>${c.nome}</strong><div class="muted">${c.telefone || '-'}</div></div>`).join('') || '<div class="clean-card muted">Sem clientes.</div>'}
    </section>
  `;
}

export function renderServicos() {
  return `
    <section class="space-y-3">
      <div class="clean-card form-grid">
        <input id="servicoNome" class="input-clean" placeholder="Nome do serviço" />
        <input id="servicoDuracao" class="input-clean" placeholder="Duração (min)" />
        <input id="servicoPreco" class="input-clean" placeholder="Preço" />
        <input id="servicoCor" type="color" class="input-clean p-1" value="#7c3aed" />
        <button id="btnSalvarServico" class="btn-primary">Salvar serviço</button>
      </div>
      ${state.servicos.map(s => `<div class="clean-card flex justify-between"><div><strong>${s.nome}</strong><div class="muted">${s.duracao_minutos} min</div></div><span>${fmtMoney(s.preco)}</span></div>`).join('') || '<div class="clean-card muted">Sem serviços.</div>'}
    </section>
  `;
}

export function renderAdmin() {
  const r = state.report?.kpis;
  return `
    <section class="space-y-3">
      <div class="clean-card">
        <h2 class="section-title">Relatório resumido</h2>
        <button id="btnLoadReport" class="btn-primary">Atualizar relatório</button>
      </div>
      <div class="kpi-grid">
        <div class="clean-card"><div class="muted">Agendamentos</div><div class="kpi-value">${r?.total_agendamentos ?? '-'}</div></div>
        <div class="clean-card"><div class="muted">Ocupação</div><div class="kpi-value">${r?.ocupacao_percent ?? '-'}%</div></div>
        <div class="clean-card"><div class="muted">Faturamento real</div><div class="kpi-value">${r ? fmtMoney(r.faturamento_real) : '-'}</div></div>
      </div>
    </section>
  `;
}

export function renderConfiguracoes() {
  const s = state.settings;
  return `
    <section class="space-y-3">
      <div class="clean-card settings-grid">
        <label class="label">Nome da empresa</label>
        <input id="cfgEmpresa" class="input-clean" value="${s.empresa_nome || ''}" />

        <label class="label">Intervalo entre agendamentos (min)</label>
        <input id="cfgIntervalo" type="number" min="0" class="input-clean" value="${s.intervalo_minutos || 0}" />

        <label class="label">Permitir encaixes</label>
        <select id="cfgEncaixe" class="input-clean">
          <option value="false" ${s.permitir_encaixe ? '' : 'selected'}>Não</option>
          <option value="true" ${s.permitir_encaixe ? 'selected' : ''}>Sim</option>
        </select>

        <label class="label">Máximo simultâneos</label>
        <input id="cfgSimultaneos" type="number" min="1" class="input-clean" value="${s.agendamentos_simultaneos_max || 1}" />

        <button id="btnSalvarConfig" class="btn-primary">Salvar configurações</button>
      </div>
    </section>
  `;
}
