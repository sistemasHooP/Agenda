/**
 * MinhaAgenda 2.0 — PacotesService.gs
 * Modelos de pacote, vendas, saldos, baixa, extrato
 */

// ─── MODELOS DE PACOTE ───────────────────────────────────────────────────────

function listarModelosPacote(tokenPayload) {
  exigirAutenticado(tokenPayload);

  var modelos = listarTodos(SHEETS.PACOTES_MODELO, true);
  var itens = listarTodos(SHEETS.PACOTES_MODELO_ITENS, true);
  var servicos = listarTodos(SHEETS.SERVICOS, true);

  // Enriquecer modelos com seus itens
  var servicosMap = {};
  for (var s = 0; s < servicos.length; s++) {
    servicosMap[servicos[s].id] = servicos[s];
  }

  for (var i = 0; i < modelos.length; i++) {
    modelos[i].itens = [];
    for (var j = 0; j < itens.length; j++) {
      if (String(itens[j].pacote_modelo_id) === String(modelos[i].id)) {
        var item = {
          id: itens[j].id,
          servico_id: itens[j].servico_id,
          quantidade: parseInt(itens[j].quantidade, 10) || 0,
          servico_nome: servicosMap[itens[j].servico_id] ? servicosMap[itens[j].servico_id].nome : 'Serviço removido'
        };
        modelos[i].itens.push(item);
      }
    }
  }

  return { ok: true, data: modelos };
}

function criarModeloPacote(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['nome', 'itens']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
    return { ok: false, msg: 'O pacote deve ter pelo menos um item.' };
  }

  var modeloId = gerarId();
  var modelo = {
    id: modeloId,
    nome: sanitizar(dados.nome),
    descricao: dados.descricao ? sanitizar(String(dados.descricao).substring(0, 300)) : '',
    ativo: 'true'
  };

  inserirRegistro(SHEETS.PACOTES_MODELO, modelo);

  // Inserir itens
  for (var i = 0; i < dados.itens.length; i++) {
    var it = dados.itens[i];
    if (!it.servico_id || !it.quantidade) continue;

    var itemId = gerarId();
    inserirRegistro(SHEETS.PACOTES_MODELO_ITENS, {
      id: itemId,
      pacote_modelo_id: modeloId,
      servico_id: it.servico_id,
      quantidade: parseInt(it.quantidade, 10)
    });
  }

  registrarLog('criar_modelo_pacote', tokenPayload.uid, 'Modelo: ' + dados.nome);
  return { ok: true, data: { id: modeloId }, msg: 'Modelo de pacote criado.' };
}

function atualizarModeloPacote(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var updates = {};
  if (dados.nome) updates.nome = sanitizar(dados.nome);
  if (dados.descricao !== undefined) updates.descricao = sanitizar(String(dados.descricao).substring(0, 300));
  if (dados.ativo !== undefined) updates.ativo = String(dados.ativo);

  atualizarRegistro(SHEETS.PACOTES_MODELO, dados.id, updates);

  // Se enviou itens, atualizar (remover antigos + inserir novos)
  if (dados.itens && Array.isArray(dados.itens)) {
    // Remover itens antigos
    var itensAntigos = buscarPorFiltro(SHEETS.PACOTES_MODELO_ITENS, { pacote_modelo_id: dados.id });
    for (var i = 0; i < itensAntigos.length; i++) {
      removerRegistro(SHEETS.PACOTES_MODELO_ITENS, itensAntigos[i].id);
    }

    // Inserir novos
    for (var j = 0; j < dados.itens.length; j++) {
      var it = dados.itens[j];
      if (!it.servico_id || !it.quantidade) continue;
      inserirRegistro(SHEETS.PACOTES_MODELO_ITENS, {
        id: gerarId(),
        pacote_modelo_id: dados.id,
        servico_id: it.servico_id,
        quantidade: parseInt(it.quantidade, 10)
      });
    }
  }

  registrarLog('atualizar_modelo_pacote', tokenPayload.uid, 'ID: ' + dados.id);
  return { ok: true, msg: 'Modelo atualizado.' };
}

// ─── VENDA DE PACOTE ──────────────────────────────────────────────────────────

function venderPacote(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['cliente_id', 'pacote_modelo_id', 'valor_total']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  // Verificar que o modelo existe
  var modelo = buscarPorId(SHEETS.PACOTES_MODELO, dados.pacote_modelo_id);
  if (!modelo) return { ok: false, msg: 'Modelo de pacote não encontrado.' };

  var vendaId = gerarId();
  var venda = {
    id: vendaId,
    cliente_id: dados.cliente_id,
    pacote_modelo_id: dados.pacote_modelo_id,
    data_venda: dados.data_venda || agora(),
    valor_total: parseFloat(dados.valor_total) || 0,
    obs: dados.obs ? sanitizar(String(dados.obs).substring(0, 300)) : ''
  };

  inserirRegistro(SHEETS.PACOTES_VENDIDOS, venda);

  // Criar saldos baseados nos itens do modelo
  var itensModelo = buscarPorFiltro(SHEETS.PACOTES_MODELO_ITENS, { pacote_modelo_id: dados.pacote_modelo_id });
  for (var i = 0; i < itensModelo.length; i++) {
    var it = itensModelo[i];
    inserirRegistro(SHEETS.PACOTES_SALDOS, {
      id: gerarId(),
      pacote_vendido_id: vendaId,
      servico_id: it.servico_id,
      qtd_total: parseInt(it.quantidade, 10),
      qtd_usada: 0
    });
  }

  registrarLog('vender_pacote', tokenPayload.uid, 'Venda: ' + vendaId + ' cliente: ' + dados.cliente_id);
  return { ok: true, data: { id: vendaId }, msg: 'Pacote vendido com sucesso.' };
}

// ─── LISTAR PACOTES DO CLIENTE ────────────────────────────────────────────────

function listarPacotesCliente(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.cliente_id) {
    return { ok: false, msg: 'cliente_id é obrigatório.' };
  }

  var vendas = buscarPorFiltro(SHEETS.PACOTES_VENDIDOS, { cliente_id: dados.cliente_id });
  var saldos = listarTodos(SHEETS.PACOTES_SALDOS, true);
  var modelos = listarTodos(SHEETS.PACOTES_MODELO, true);
  var servicos = listarTodos(SHEETS.SERVICOS, true);

  var modelosMap = {};
  for (var m = 0; m < modelos.length; m++) modelosMap[modelos[m].id] = modelos[m];
  var servicosMap = {};
  for (var s = 0; s < servicos.length; s++) servicosMap[servicos[s].id] = servicos[s];

  for (var i = 0; i < vendas.length; i++) {
    vendas[i].modelo_nome = modelosMap[vendas[i].pacote_modelo_id] ? modelosMap[vendas[i].pacote_modelo_id].nome : '';
    vendas[i].saldos = [];

    for (var j = 0; j < saldos.length; j++) {
      if (String(saldos[j].pacote_vendido_id) === String(vendas[i].id)) {
        var saldo = {
          servico_id: saldos[j].servico_id,
          servico_nome: servicosMap[saldos[j].servico_id] ? servicosMap[saldos[j].servico_id].nome : '',
          qtd_total: parseInt(saldos[j].qtd_total, 10) || 0,
          qtd_usada: parseInt(saldos[j].qtd_usada, 10) || 0,
          qtd_restante: (parseInt(saldos[j].qtd_total, 10) || 0) - (parseInt(saldos[j].qtd_usada, 10) || 0)
        };
        vendas[i].saldos.push(saldo);
      }
    }
  }

  return { ok: true, data: vendas };
}

// ─── BAIXA POR AGENDAMENTO ───────────────────────────────────────────────────

function darBaixaPorAgendamento(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['pacote_vendido_id', 'servico_id', 'agendamento_id']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  // Verificar se já houve baixa para este agendamento
  var usosExistentes = buscarPorFiltro(SHEETS.PACOTES_USOS, { agendamento_id: dados.agendamento_id });
  if (usosExistentes.length > 0) {
    return { ok: false, msg: 'Já foi dada baixa para este agendamento.' };
  }

  // Buscar saldo
  var saldos = listarTodos(SHEETS.PACOTES_SALDOS, false);
  var saldoEncontrado = null;
  for (var i = 0; i < saldos.length; i++) {
    if (String(saldos[i].pacote_vendido_id) === String(dados.pacote_vendido_id) &&
        String(saldos[i].servico_id) === String(dados.servico_id)) {
      saldoEncontrado = saldos[i];
      break;
    }
  }

  if (!saldoEncontrado) {
    return { ok: false, msg: 'Saldo não encontrado para este serviço no pacote.' };
  }

  var total = parseInt(saldoEncontrado.qtd_total, 10) || 0;
  var usada = parseInt(saldoEncontrado.qtd_usada, 10) || 0;
  if (usada >= total) {
    return { ok: false, msg: 'Saldo esgotado para este serviço.' };
  }

  // Dar baixa
  atualizarRegistro(SHEETS.PACOTES_SALDOS, saldoEncontrado.id, {
    qtd_usada: usada + 1
  });

  // Registrar uso
  inserirRegistro(SHEETS.PACOTES_USOS, {
    id: gerarId(),
    pacote_vendido_id: dados.pacote_vendido_id,
    agendamento_id: dados.agendamento_id,
    servico_id: dados.servico_id,
    qtd: 1,
    data_uso_iso: agora()
  });

  registrarLog('baixa_pacote', tokenPayload.uid, 'Pacote: ' + dados.pacote_vendido_id + ' Serviço: ' + dados.servico_id);
  return { ok: true, msg: 'Baixa realizada.' };
}

// ─── EXTRATO DO PACOTE ───────────────────────────────────────────────────────

function extratoPacote(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.pacote_vendido_id) {
    return { ok: false, msg: 'pacote_vendido_id é obrigatório.' };
  }

  var venda = buscarPorId(SHEETS.PACOTES_VENDIDOS, dados.pacote_vendido_id);
  if (!venda) return { ok: false, msg: 'Pacote vendido não encontrado.' };

  var saldos = buscarPorFiltro(SHEETS.PACOTES_SALDOS, { pacote_vendido_id: dados.pacote_vendido_id });
  var usos = buscarPorFiltro(SHEETS.PACOTES_USOS, { pacote_vendido_id: dados.pacote_vendido_id });

  var servicos = listarTodos(SHEETS.SERVICOS, true);
  var profissionais = listarTodos(SHEETS.PROFISSIONAIS, true);
  var servicosMap = {};
  for (var s = 0; s < servicos.length; s++) servicosMap[servicos[s].id] = servicos[s];
  var profsMap = {};
  for (var p = 0; p < profissionais.length; p++) profsMap[profissionais[p].id] = profissionais[p];

  // Enriquecer saldos
  for (var i = 0; i < saldos.length; i++) {
    saldos[i].servico_nome = servicosMap[saldos[i].servico_id] ? servicosMap[saldos[i].servico_id].nome : '';
    saldos[i].qtd_restante = (parseInt(saldos[i].qtd_total, 10) || 0) - (parseInt(saldos[i].qtd_usada, 10) || 0);
  }

  // Enriquecer usos com dados do agendamento
  for (var j = 0; j < usos.length; j++) {
    usos[j].servico_nome = servicosMap[usos[j].servico_id] ? servicosMap[usos[j].servico_id].nome : '';
    // Buscar agendamento para pegar profissional
    var agendamento = buscarPorId(SHEETS.AGENDAMENTOS, usos[j].agendamento_id);
    if (agendamento) {
      usos[j].profissional_nome = profsMap[agendamento.profissional_id] ? profsMap[agendamento.profissional_id].nome : '';
      usos[j].data_agendamento = agendamento.inicio_iso;
    }
  }

  return {
    ok: true,
    data: {
      venda: venda,
      saldos: saldos,
      usos: usos
    }
  };
}
