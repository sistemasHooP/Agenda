import { state } from './state.js';
import { api } from './api.js';
import { toast, openModal, closeModal, openConfirm } from './ui.js';
import { renderAgendamentos, renderClientes, renderServicos, renderAdmin, renderConfiguracoes } from './pages.js';

const view = document.getElementById('view');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarBackdrop.classList.remove('hidden');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.add('hidden');
}

function toggleSidebar() {
  if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
}

function bindLayoutActions() {
  document.getElementById('btnMenu')?.addEventListener('click', toggleSidebar);
  sidebarBackdrop?.addEventListener('click', closeSidebar);
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) sidebarBackdrop.classList.add('hidden');
  });
}

function bindNav() {
  document.querySelectorAll('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.route = btn.dataset.route;
      render();
      highlightNav();
      closeSidebar();
      refreshRouteData();
    });
  });
}

function highlightNav() {
  document.querySelectorAll('[data-route]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === state.route);
  });
}

async function autoLogin() {
  if (state.token) return;
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

async function loadBaseData(force = false) {
  if (!force && Date.now() - state.cache.baseLoadedAt < 60_000 && state.clientes.length) return;
  if (state.ui.loadingBase) return;
  state.ui.loadingBase = true;

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

    state.cache.baseLoadedAt = Date.now();
  } finally {
    state.ui.loadingBase = false;
  }
}

async function loadAgenda(force = false) {
  if (!state.agenda_profissional_id) return;
  if (!force && Date.now() - state.cache.agendaLoadedAt < 10_000) return;
  if (state.ui.loadingAgenda) return;
  state.ui.loadingAgenda = true;

  try {
    const res = await api('schedule.list', { profissional_id: state.agenda_profissional_id });
    state.agendamentos = res.items || [];
    state.cache.agendaLoadedAt = Date.now();
  } finally {
    state.ui.loadingAgenda = false;
  }
}

async function loadReport(force = false) {
  if (!force && Date.now() - state.cache.reportLoadedAt < 30_000 && state.report) return;
  state.report = await api('reports.summary', {});
  state.cache.reportLoadedAt = Date.now();
}

async function refreshRouteData() {
  try {
    if (state.route === 'agendamentos') {
      await loadAgenda(true);
      render();
    }
    if (state.route === 'admin') {
      await loadReport(true);
      render();
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

      const optimistic = {
        id: `temp_${Date.now()}`,
        profissional_id: state.agenda_profissional_id,
        cliente_id,
        servico_id,
        inicio_iso: new Date(inicioInput).toISOString(),
        fim_iso: new Date(new Date(inicioInput).getTime() + 30 * 60000).toISOString(),
        status: 'marcado',
        valor: 0
      };
      state.agendamentos = [optimistic, ...state.agendamentos];
      render();

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
      await loadAgenda(true);
      render();
    } catch (e) {
      toast(e.message, 'error');
      await loadAgenda(true);
      render();
    }
  });
}

function bindViewActions() {
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    try {
      await loadBaseData(true);
      await refreshRouteData();
      toast('Dados atualizados', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('agendaProfissional')?.addEventListener('change', async (e) => {
    state.agenda_profissional_id = e.target.value;
    localStorage.setItem('agenda_profissional_id', state.agenda_profissional_id);
    render();
    await loadAgenda(true);
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
      await loadBaseData(true);
      render();
      toast('Cliente salvo', 'success');
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
      await loadBaseData(true);
      render();
      toast('Serviço salvo', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('btnLoadReport')?.addEventListener('click', async () => {
    try {
      await loadReport(true);
      render();
      toast('Relatório atualizado', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('btnSalvarConfig')?.addEventListener('click', () => {
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
          document.getElementById('brandName').textContent = state.settings.empresa_nome || 'MinhaAgenda 2.0';
          render();
          toast('Configurações salvas', 'success');
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
  bindLayoutActions();
  bindNav();
  highlightNav();

  try {
    await autoLogin();
    await loadBaseData(true);
    render();
    if (state.route === 'agendamentos') {
      await loadAgenda(true);
      render();
    }
  } catch (e) {
    toast(e.message, 'error');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => null);
  }
})();
