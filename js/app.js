import { state } from './state.js';
import { api } from './api.js';
import { toast, openModal, closeModal, openConfirm } from './ui.js';
import { renderAgendamentos, renderClientes, renderServicos, renderAdmin, renderConfiguracoes } from './pages.js';

const view = document.getElementById('view');

function bindNav() {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.route = btn.dataset.route;
      await refreshData();
      render();
      highlightNav();
    });
  });
}

function highlightNav() {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === state.route);
  });
}

async function autoLogin() {
  if (!state.token) {
    const email = prompt('Primeiro acesso: email admin', 'admin@agenda.local');
    const senha = prompt('Senha admin', '123456');
    await api('setup.init', {}, false);
    const res = await api('auth.login', { email, senha }, false);
    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('token', state.token);
    localStorage.setItem('user', JSON.stringify(state.user));
    toast('Login realizado', 'success');
  }
}

async function refreshData() {
  try {
    const [clientsRes, servicesRes, profRes, settingsRes] = await Promise.all([
      api('clients.list', {}),
      api('services.list', {}),
      api('professionals.list', {}),
      api('settings.get', {})
    ]);

    state.clientes = clientsRes.items || [];
    state.servicos = servicesRes.items || [];
    state.profissionais = profRes.items || [];
    state.settings = settingsRes.settings || state.settings;

    if (!state.agenda_profissional_id && state.profissionais.length) {
      state.agenda_profissional_id = state.user?.profissional_id || state.profissionais[0].id;
      localStorage.setItem('agenda_profissional_id', state.agenda_profissional_id);
    }

    if (state.route === 'agendamentos') {
      state.agendamentos = (await api('schedule.list', { profissional_id: state.agenda_profissional_id })).items;
    } else if (state.route === 'admin') {
      state.report = await api('reports.summary', {});
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openScheduleModal(startIso = '') {
  const start = startIso || new Date().toISOString().slice(0, 16);

  openModal(`
    <div class="form-stack">
      <label class="label">Data/Hora</label>
      <input id="agInicio" type="datetime-local" class="input-clean" value="${start.slice(0,16)}" />

      <label class="label">Cliente</label>
      <select id="agCliente" class="input-clean">
        <option value="">Selecione</option>
        ${state.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
      </select>

      <label class="label">Serviço</label>
      <select id="agServico" class="input-clean">
        <option value="">Selecione</option>
        ${state.servicos.map(s => `<option value="${s.id}">${s.nome} (${s.duracao_minutos} min)</option>`).join('')}
      </select>

      <label class="label">Observações</label>
      <textarea id="agObs" class="input-clean" rows="3" placeholder="Observações..."></textarea>

      <label class="inline-check">
        <input id="agEncaixe" type="checkbox" />
        <span>Encaixe</span>
      </label>

      <div class="modal-actions">
        <button id="btnCancelarAg" class="btn-light">Cancelar</button>
        <button id="btnSalvarAg" class="btn-primary">Salvar agendamento</button>
      </div>
    </div>
  `, 'Novo agendamento');

  document.getElementById('btnCancelarAg').addEventListener('click', closeModal);
  document.getElementById('btnSalvarAg').addEventListener('click', async () => {
    try {
      const cliente_id = document.getElementById('agCliente').value;
      const servico_id = document.getElementById('agServico').value;
      const inicioInput = document.getElementById('agInicio').value;
      const observacoes = document.getElementById('agObs').value;
      const encaixe = document.getElementById('agEncaixe').checked;

      if (!cliente_id || !servico_id || !inicioInput) throw new Error('Preencha cliente, serviço e data/hora.');

      await api('schedule.save', {
        profissional_id: state.agenda_profissional_id,
        cliente_id,
        servico_id,
        inicio_iso: new Date(inicioInput).toISOString(),
        observacoes,
        encaixe
      });

      closeModal();
      toast('Agendamento criado com sucesso', 'success');
      await refreshData();
      render();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}

function bindViewActions() {
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    await refreshData();
    render();
    toast('Dados atualizados', 'success');
  });

  document.getElementById('agendaProfissional')?.addEventListener('change', async (e) => {
    state.agenda_profissional_id = e.target.value;
    localStorage.setItem('agenda_profissional_id', state.agenda_profissional_id);
    await refreshData();
    render();
  });

  document.getElementById('btnNovoAgendamento')?.addEventListener('click', () => openScheduleModal());

  document.querySelectorAll('[data-slot-start]').forEach((btn) => {
    btn.addEventListener('click', () => openScheduleModal(btn.dataset.slotStart));
  });

  document.getElementById('btnSalvarCliente')?.addEventListener('click', async () => {
    try {
      const nome = document.getElementById('clienteNome').value;
      const telefone = document.getElementById('clienteTelefone').value;
      await api('clients.save', { nome, telefone });
      toast('Cliente salvo', 'success');
      await refreshData();
      render();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('btnSalvarServico')?.addEventListener('click', async () => {
    try {
      const nome = document.getElementById('servicoNome').value;
      const duracao_minutos = document.getElementById('servicoDuracao').value;
      const preco = document.getElementById('servicoPreco').value;
      const cor = document.getElementById('servicoCor').value;
      await api('services.save', { nome, duracao_minutos, preco, cor });
      toast('Serviço salvo', 'success');
      await refreshData();
      render();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('btnLoadReport')?.addEventListener('click', async () => {
    try {
      state.report = await api('reports.summary', {});
      render();
      toast('Relatório atualizado', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('btnSalvarConfig')?.addEventListener('click', async () => {
    const payload = {
      empresa_nome: document.getElementById('cfgEmpresa').value,
      intervalo_minutos: Number(document.getElementById('cfgIntervalo').value || 0),
      permitir_encaixe: document.getElementById('cfgEncaixe').value === 'true',
      agendamentos_simultaneos_max: Number(document.getElementById('cfgSimultaneos').value || 1)
    };

    openConfirm({
      title: 'Salvar configurações',
      message: 'Deseja salvar as novas configurações da agenda?',
      onConfirm: async () => {
        try {
          const res = await api('settings.save', payload);
          state.settings = res.settings;
          toast('Configurações salvas', 'success');
          await refreshData();
          render();
        } catch (e) {
          toast(e.message, 'error');
        }
      }
    });
  });
}

function render() {
  document.getElementById('brandName').textContent = state.settings?.empresa_nome || 'MinhaAgenda 2.0';

  if (state.route === 'agendamentos') view.innerHTML = renderAgendamentos();
  if (state.route === 'clientes') view.innerHTML = renderClientes();
  if (state.route === 'servicos') view.innerHTML = renderServicos();
  if (state.route === 'admin') view.innerHTML = renderAdmin();
  if (state.route === 'configuracoes') view.innerHTML = renderConfiguracoes();

  bindViewActions();
}

(async function init() {
  bindNav();
  highlightNav();

  try {
    await autoLogin();
    await refreshData();
    render();
  } catch (e) {
    toast(e.message, 'error');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => null);
  }
})();
