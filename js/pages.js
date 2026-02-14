import { state } from './state.js';
import { fmtMoney, statusBadge } from './ui.js';

export function renderAgendamentos() {
  const now = new Date();
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let header = '<div class="grid-week">';
  header += '<div>Hora</div>';
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() + i);
    header += `<div><strong>${days[i]}</strong><br>${d.toLocaleDateString('pt-BR')}</div>`;
  }

  for (let h = 7; h <= 20; h++) {
    header += `<div>${String(h).padStart(2, '0')}:00</div>`;
    for (let i = 0; i < 7; i++) header += '<div></div>';
  }
  header += '</div>';

  const list = state.agendamentos.map(a => `
    <div class="card mt-3">
      <div class="flex justify-between items-center">
        <strong>${a.inicio_iso?.replace('T', ' ').replace('Z', '') || ''}</strong>
        ${statusBadge(a.status)}
      </div>
      <div class="text-sm text-slate-300 mt-1">Cliente: ${a.cliente_id} | Serviço: ${a.servico_id}</div>
      <div class="text-sm mt-1">Valor: ${fmtMoney(a.valor)}</div>
    </div>
  `).join('');

  return `
    <section class="space-y-4">
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold">Agenda semanal</h2>
          <button id="btnNovoAg" class="btn-primary">Novo agendamento</button>
        </div>
        ${header}
      </div>
      <div>
        <h3 class="font-semibold mb-2">Próximos agendamentos</h3>
        ${list || '<div class="card">Nenhum agendamento encontrado.</div>'}
      </div>
    </section>
  `;
}

export function renderClientes() {
  return `
    <section class="space-y-3">
      <div class="card flex flex-col md:flex-row gap-2">
        <input id="clienteNome" class="input flex-1" placeholder="Nome do cliente" />
        <input id="clienteTelefone" class="input flex-1" placeholder="Telefone" />
        <button id="btnSalvarCliente" class="btn-primary">Salvar cliente</button>
      </div>
      ${state.clientes.map(c => `<div class="card"><strong>${c.nome}</strong><div class="text-sm text-slate-400">${c.telefone || '-'}</div></div>`).join('') || '<div class="card">Sem clientes</div>'}
    </section>
  `;
}

export function renderServicos() {
  return `
    <section class="space-y-3">
      <div class="card flex flex-col md:flex-row gap-2">
        <input id="servicoNome" class="input flex-1" placeholder="Nome do serviço" />
        <input id="servicoDuracao" class="input w-full md:w-40" placeholder="Duração (min)" />
        <input id="servicoPreco" class="input w-full md:w-40" placeholder="Preço" />
        <input id="servicoCor" type="color" class="input w-full md:w-24 p-2" value="#0ea5e9" />
        <button id="btnSalvarServico" class="btn-primary">Salvar serviço</button>
      </div>
      ${state.servicos.map(s => `<div class="card flex justify-between"><div><strong>${s.nome}</strong><div class="text-sm text-slate-400">${s.duracao_minutos} min</div></div><span>${fmtMoney(s.preco)}</span></div>`).join('') || '<div class="card">Sem serviços</div>'}
    </section>
  `;
}

export function renderAdmin() {
  const r = state.report?.kpis;
  return `
    <section class="space-y-3">
      <div class="card">
        <h2 class="font-semibold mb-3">Relatório resumido</h2>
        <button id="btnLoadReport" class="btn-primary">Atualizar relatório</button>
      </div>
      <div class="grid md:grid-cols-3 gap-3">
        <div class="card"><div class="text-sm text-slate-400">Agendamentos</div><div class="text-2xl">${r?.total_agendamentos ?? '-'}</div></div>
        <div class="card"><div class="text-sm text-slate-400">Ocupação</div><div class="text-2xl">${r?.ocupacao_percent ?? '-'}%</div></div>
        <div class="card"><div class="text-sm text-slate-400">Faturamento real</div><div class="text-2xl">${r ? fmtMoney(r.faturamento_real) : '-'}</div></div>
      </div>
    </section>
  `;
}
