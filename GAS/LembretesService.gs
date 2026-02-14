/**
 * MinhaAgenda 2.0 — LembretesService.gs
 * Lembretes: templates, WhatsApp, log
 */

// ─── TEMPLATES PADRÃO ────────────────────────────────────────────────────────

var TEMPLATES_LEMBRETE = {
  confirmacao: 'Olá {cliente_nome}! 😊\n\nLembramos do seu agendamento:\n📋 Serviço: {servico_nome}\n📅 Data: {data}\n🕐 Horário: {hora}\n👤 Profissional: {profissional_nome}\n💰 Valor: R$ {valor}\n\nPor favor, confirme sua presença respondendo esta mensagem.\n\nObrigado! 🙏',

  lembrete_vespera: 'Olá {cliente_nome}! 👋\n\nAmanhã você tem um compromisso conosco:\n📋 {servico_nome}\n🕐 {hora}\n👤 Com: {profissional_nome}\n\nTe esperamos! 😄',

  reagendamento: 'Olá {cliente_nome}!\n\nSeu agendamento de {servico_nome} foi reagendado para:\n📅 {data} às {hora}\n👤 Profissional: {profissional_nome}\n\nQualquer dúvida, estamos à disposição! 😊',

  cancelamento: 'Olá {cliente_nome}.\n\nInformamos que seu agendamento de {servico_nome} no dia {data} às {hora} foi cancelado.\n\nCaso deseje reagendar, entre em contato conosco.\n\nAbraços! 🙂',

  pacote_vendido: 'Olá {cliente_nome}! 🎉\n\nSeu pacote foi ativado com sucesso!\nAproveite seus serviços e agende suas sessões.\n\nEstamos à disposição! 💜'
};

// ─── GERAR MENSAGEM ──────────────────────────────────────────────────────────

function gerarMensagemLembrete(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.agendamento_id && !dados.template) {
    return { ok: false, msg: 'agendamento_id ou template é obrigatório.' };
  }

  var template = dados.template_texto || TEMPLATES_LEMBRETE[dados.template || 'confirmacao'];
  if (!template) {
    return { ok: false, msg: 'Template não encontrado.' };
  }

  // Se tem agendamento, buscar dados para preencher placeholders
  var placeholders = {};

  if (dados.agendamento_id) {
    var agendamento = buscarPorId(SHEETS.AGENDAMENTOS, dados.agendamento_id);
    if (!agendamento) return { ok: false, msg: 'Agendamento não encontrado.' };

    var cliente = buscarPorId(SHEETS.CLIENTES, agendamento.cliente_id);
    var servico = buscarPorId(SHEETS.SERVICOS, agendamento.servico_id);
    var profissional = buscarPorId(SHEETS.PROFISSIONAIS, agendamento.profissional_id);

    placeholders = {
      cliente_nome: cliente ? cliente.nome : 'Cliente',
      servico_nome: servico ? servico.nome : 'Serviço',
      data: agendamento.inicio_iso ? formatarData(new Date(agendamento.inicio_iso), 'dd/MM/yyyy') : '',
      hora: agendamento.inicio_iso ? formatarData(new Date(agendamento.inicio_iso), 'HH:mm') : '',
      profissional_nome: profissional ? profissional.nome : 'Profissional',
      valor: servico ? parseFloat(servico.preco).toFixed(2) : '0.00'
    };
  }

  // Substituir dados manuais se fornecidos
  if (dados.placeholders) {
    for (var key in dados.placeholders) {
      if (dados.placeholders.hasOwnProperty(key)) {
        placeholders[key] = dados.placeholders[key];
      }
    }
  }

  // Substituir placeholders no template
  var mensagem = template;
  for (var ph in placeholders) {
    if (placeholders.hasOwnProperty(ph)) {
      mensagem = mensagem.replace(new RegExp('\\{' + ph + '\\}', 'g'), placeholders[ph]);
    }
  }

  // Gerar link WhatsApp
  var whatsappLink = '';
  if (dados.agendamento_id) {
    var clienteObj = buscarPorId(SHEETS.CLIENTES, buscarPorId(SHEETS.AGENDAMENTOS, dados.agendamento_id).cliente_id);
    if (clienteObj && clienteObj.telefone) {
      var tel = String(clienteObj.telefone).replace(/\D/g, '');
      if (tel.length === 11) tel = '55' + tel;
      if (tel.length === 10) tel = '55' + tel;
      whatsappLink = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(mensagem);
    }
  }

  return {
    ok: true,
    data: {
      mensagem: mensagem,
      whatsapp_link: whatsappLink,
      template_usado: dados.template || 'custom'
    }
  };
}

// ─── LISTAR TEMPLATES ─────────────────────────────────────────────────────────

function listarTemplatesLembrete(tokenPayload) {
  exigirAutenticado(tokenPayload);

  var lista = [];
  for (var key in TEMPLATES_LEMBRETE) {
    if (TEMPLATES_LEMBRETE.hasOwnProperty(key)) {
      lista.push({ id: key, nome: key.replace(/_/g, ' '), texto: TEMPLATES_LEMBRETE[key] });
    }
  }

  return { ok: true, data: lista };
}

// ─── REGISTRAR ENVIO ──────────────────────────────────────────────────────────

function registrarEnvioLembrete(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['agendamento_id', 'canal', 'mensagem']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  var id = gerarId();
  var registro = {
    id: id,
    agendamento_id: dados.agendamento_id,
    enviado_por: tokenPayload.uid,
    canal: sanitizar(dados.canal), // 'whatsapp', 'copiado'
    mensagem: sanitizar(String(dados.mensagem).substring(0, 1000)),
    criado_em: agora()
  };

  inserirRegistro(SHEETS.LEMBRETES_LOG, registro);
  registrarLog('enviar_lembrete', tokenPayload.uid, 'Canal: ' + dados.canal + ' Agendamento: ' + dados.agendamento_id);

  return { ok: true, data: { id: id }, msg: 'Lembrete registrado.' };
}

// ─── LISTAR LOG DE LEMBRETES ──────────────────────────────────────────────────

function listarLogLembretes(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var todos = listarTodos(SHEETS.LEMBRETES_LOG, false);

  if (dados && dados.agendamento_id) {
    todos = todos.filter(function(l) {
      return String(l.agendamento_id) === String(dados.agendamento_id);
    });
  }

  // Últimos 100
  return { ok: true, data: todos.slice(-100).reverse() };
}
