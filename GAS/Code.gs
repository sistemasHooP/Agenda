/**
 * MinhaAgenda 2.0 — Code.gs
 * Entry point: doGet, doPost, roteador de ações
 */

// ─── doGet — Health check / Setup ─────────────────────────────────────────────

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;

  if (action === 'setup') {
    var resultado = inicializarAbas();
    var adminResult = criarAdminPadrao();
    return jsonOk({ setup: resultado, admin: adminResult }, 'Setup concluído.');
  }

  return jsonOk({
    app: 'MinhaAgenda 2.0',
    version: CONFIG.VERSION,
    status: 'online',
    timestamp: agora()
  }, 'API funcionando.');
}

// ─── doPost — Roteador principal ──────────────────────────────────────────────

function doPost(e) {
  try {
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonErro('JSON inválido.', 400);
    }

    var action = body.action;
    if (!action) {
      return jsonErro('action é obrigatório.', 400);
    }

    // Ações que NÃO precisam de token
    if (action === 'ping') {
      return jsonOk({ pong: true, timestamp: agora() });
    }

    if (action === 'login') {
      var loginResult = login(body.email, body.senha);
      if (loginResult.ok) {
        return jsonOk(loginResult.data, 'Login realizado.');
      }
      return jsonErro(loginResult.msg, 401);
    }

    // ─── Todas as outras ações precisam de token ────────────────────────

    var tokenPayload = verificarToken(body.token);
    if (!tokenPayload) {
      return jsonErro('Token inválido ou expirado.', 401);
    }

    // Rate limit para ações sensíveis
    var acoesSensiveis = ['criarUsuario', 'importarClientes', 'venderPacote'];
    if (acoesSensiveis.indexOf(action) >= 0) {
      if (!verificarRateLimit('action_' + tokenPayload.uid + '_' + action)) {
        return jsonErro('Muitas requisições. Aguarde.', 429);
      }
    }

    var dados = body.dados || {};
    var resultado = rotear(action, tokenPayload, dados);

    if (resultado.ok === false) {
      return jsonErro(resultado.msg, resultado.code || 400);
    }

    return jsonOk(resultado.data, resultado.msg);

  } catch (erro) {
    Logger.log('Erro no doPost: ' + erro.message + '\n' + erro.stack);
    return jsonErro('Erro interno: ' + erro.message, 500);
  }
}

// ─── ROTEADOR ─────────────────────────────────────────────────────────────────

function rotear(action, tokenPayload, dados) {
  switch (action) {

    // ── Auth ──
    case 'getMe':
      return getMe(tokenPayload);
    case 'verificarToken':
      return { ok: true, data: tokenPayload, msg: 'Token válido.' };
    case 'alterarSenha':
      return alterarSenha(tokenPayload, dados.senha_atual, dados.nova_senha);
    case 'criarUsuario':
      return criarUsuario(tokenPayload, dados);

    // ── Profissionais ──
    case 'listarProfissionais':
      return listarProfissionais(tokenPayload);
    case 'criarProfissional':
      return criarProfissional(tokenPayload, dados);
    case 'atualizarProfissional':
      return atualizarProfissional(tokenPayload, dados);
    case 'ativarDesativarProfissional':
      return ativarDesativarProfissional(tokenPayload, dados);

    // ── Clientes ──
    case 'listarClientes':
      return listarClientes(tokenPayload, dados);
    case 'pesquisarClientes':
      return pesquisarClientes(tokenPayload, dados);
    case 'criarCliente':
      return criarCliente(tokenPayload, dados);
    case 'atualizarCliente':
      return atualizarCliente(tokenPayload, dados);
    case 'importarClientes':
      return importarClientes(tokenPayload, dados);

    // ── Serviços ──
    case 'listarServicos':
      return listarServicos(tokenPayload);
    case 'criarServico':
      return criarServico(tokenPayload, dados);
    case 'atualizarServico':
      return atualizarServico(tokenPayload, dados);
    case 'ativarDesativarServico':
      return ativarDesativarServico(tokenPayload, dados);

    // ── Agenda ──
    case 'listarAgendaSemana':
      return listarAgendaSemana(tokenPayload, dados);
    case 'listarAgendaDia':
      return listarAgendaDia(tokenPayload, dados);
    case 'criarAgendamento':
      return criarAgendamento(tokenPayload, dados);
    case 'atualizarAgendamento':
      return atualizarAgendamento(tokenPayload, dados);
    case 'cancelarAgendamento':
      return cancelarAgendamento(tokenPayload, dados);
    case 'excluirAgendamento':
      return excluirAgendamento(tokenPayload, dados);
    case 'marcarStatus':
      return marcarStatus(tokenPayload, dados);
    case 'checarConflito':
      return checarConflitoAction(tokenPayload, dados);

    // ── Bloqueios ──
    case 'listarBloqueios':
      return listarBloqueios(tokenPayload, dados);
    case 'criarBloqueio':
      return criarBloqueio(tokenPayload, dados);
    case 'removerBloqueio':
      return removerBloqueio(tokenPayload, dados);

    // ── Pacotes ──
    case 'listarModelosPacote':
      return listarModelosPacote(tokenPayload);
    case 'criarModeloPacote':
      return criarModeloPacote(tokenPayload, dados);
    case 'atualizarModeloPacote':
      return atualizarModeloPacote(tokenPayload, dados);
    case 'venderPacote':
      return venderPacote(tokenPayload, dados);
    case 'listarPacotesCliente':
      return listarPacotesCliente(tokenPayload, dados);
    case 'darBaixaPorAgendamento':
      return darBaixaPorAgendamento(tokenPayload, dados);
    case 'extratoPacote':
      return extratoPacote(tokenPayload, dados);

    // ── Lembretes ──
    case 'gerarMensagemLembrete':
      return gerarMensagemLembrete(tokenPayload, dados);
    case 'listarTemplatesLembrete':
      return listarTemplatesLembrete(tokenPayload);
    case 'registrarEnvioLembrete':
      return registrarEnvioLembrete(tokenPayload, dados);
    case 'listarLogLembretes':
      return listarLogLembretes(tokenPayload, dados);

    // ── Relatórios ──
    case 'resumoAgenda':
      return resumoAgenda(tokenPayload, dados);
    case 'resumoPacotes':
      return resumoPacotes(tokenPayload, dados);

    // ── Configurações ──
    case 'listarConfiguracoes':
      return listarConfiguracoes(tokenPayload);
    case 'salvarConfiguracoes':
      return salvarConfiguracoes(tokenPayload, dados);

    // ── Ação desconhecida ──
    default:
      return { ok: false, msg: 'Ação desconhecida: ' + action, code: 404 };
  }
}
