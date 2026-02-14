import { state } from './state.js';
import { api } from './api.js';
import { toast } from './ui.js';
import { renderAgendamentos, renderClientes, renderServicos, renderAdmin } from './pages.js';

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
    toast('Login realizado');
  }
}

async function refreshData() {
  try {
    if (state.route === 'agendamentos') {
      state.agendamentos = (await api('schedule.list', {})).items;
    } else if (state.route === 'clientes') {
      state.clientes = (await api('clients.list', {})).items;
    } else if (state.route === 'servicos') {
      state.servicos = (await api('services.list', {})).items;
    } else if (state.route === 'admin') {
      state.report = (await api('reports.summary', {}));
    }
  } catch (e) {
    toast(e.message);
  }
}

function bindViewActions() {
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    await refreshData();
    render();
  });

  document.getElementById('btnSalvarCliente')?.addEventListener('click', async () => {
    try {
      const nome = document.getElementById('clienteNome').value;
      const telefone = document.getElementById('clienteTelefone').value;
      await api('clients.save', { nome, telefone });
      toast('Cliente salvo');
      await refreshData();
      render();
    } catch (e) { toast(e.message); }
  });

  document.getElementById('btnSalvarServico')?.addEventListener('click', async () => {
    try {
      const nome = document.getElementById('servicoNome').value;
      const duracao_minutos = document.getElementById('servicoDuracao').value;
      const preco = document.getElementById('servicoPreco').value;
      const cor = document.getElementById('servicoCor').value;
      await api('services.save', { nome, duracao_minutos, preco, cor });
      toast('Serviço salvo');
      await refreshData();
      render();
    } catch (e) { toast(e.message); }
  });

  document.getElementById('btnNovoAg')?.addEventListener('click', async () => {
    try {
      const profissional_id = prompt('profissional_id');
      const cliente_id = prompt('cliente_id');
      const servico_id = prompt('servico_id');
      const inicio_iso = prompt('inicio_iso (2026-01-20T13:00:00Z)');
      await api('schedule.save', { profissional_id, cliente_id, servico_id, inicio_iso });
      toast('Agendamento criado');
      await refreshData();
      render();
    } catch (e) { toast(e.message); }
  });

  document.getElementById('btnLoadReport')?.addEventListener('click', async () => {
    try {
      state.report = await api('reports.summary', {});
      render();
      toast('Relatório atualizado');
    } catch (e) { toast(e.message); }
  });
}

function render() {
  if (state.route === 'agendamentos') view.innerHTML = renderAgendamentos();
  if (state.route === 'clientes') view.innerHTML = renderClientes();
  if (state.route === 'servicos') view.innerHTML = renderServicos();
  if (state.route === 'admin') view.innerHTML = renderAdmin();
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
    toast(e.message);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => null);
  }
})();
