import { state } from './state.js';
import { fmtMoney, statusBadge } from './ui.js';

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function dayLabel(dt) {
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function renderAgendamentos() {
  const weekStart = getWeekStart();
  const hours = [];
  for (let h = 8; h <= 19; h++) hours.push(h);

  let grid = '<div class="agenda-grid">';
  grid += '<div class="agenda-cell agenda-head">Hora</div>';
  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + d);
    grid += `<div class="agenda-cell agenda-head">${dayLabel(date)}</div>`;
  }

  for (const h of hours) {
    grid += `<div class="agenda-cell agenda-hour">${String(h).padStart(2, '0')}:00</div>`;
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      const startIso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0)).toISOString();
      grid += `<button class="agenda-cell agenda-slot" data-slot-start="${startIso}">+</button>`;
    }
  }
  grid += '</div>';

  const profActive = state.profissionais.find(p => String(p.id) === String(state.agenda_profissional_id));

  const list = state.agendamentos.map(a => {
    const cli = state.clientes.find(c => String(c.id) === String(a.cliente_id));
    const srv = state.servicos.find(s => String(s.id) === String(a.servico_id));
    const date = new Date(a.inicio_iso).toLocaleString('pt-BR');
    return `
      <div class="clean-card item-row">
        <div>
          <p class="font-semibold">${cli ? cli.nome : a.cliente_id} • ${srv ? srv.nome : a.servico_id}</p>
          <p class="muted">${date}</p>
        </div>
        <div class="text-right">
          ${statusBadge(a.status)}
          <p class="font-semibold mt-1">${fmtMoney(a.valor)}</p>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="space-y-4">
      <div class="clean-card top-filters">
        <div>
          <p class="label">Agenda ativa</p>
          <select id="agendaProfissional" class="input-clean">
            ${state.profissionais.map(p => `<option value="${p.id}" ${String(p.id) === String(state.agenda_profissional_id) ? 'selected' : ''}>${p.nome}</option>`).join('')}
          </select>
          <p class="muted mt-1">${profActive ? 'Novos agendamentos serão criados para ' + profActive.nome : ''}</p>
        </div>
        <button id="btnNovoAgendamento" class="btn-primary">Novo agendamento</button>
      </div>

      <div class="clean-card">
        <h2 class="section-title">Calendário semanal</h2>
        ${grid}
      </div>

      <div>
        <h3 class="section-title">Agendamentos da semana</h3>
        ${list || '<div class="clean-card muted">Sem agendamentos ainda.</div>'}
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
