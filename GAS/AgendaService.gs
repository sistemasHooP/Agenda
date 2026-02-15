/**
 * MinhaAgenda 2.0 — AgendaService.gs
 * Agendamentos: CRUD, conflitos, status
 */

// ─── LISTAR SEMANA ────────────────────────────────────────────────────────────

function listarAgendaSemana(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var semanaKey = dados.semana_key;
  if (!semanaKey) {
    semanaKey = getSemanaKey();
  }

  var profId = null;
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL) {
    profId = tokenPayload.pid;
  } else if (dados.profissional_id) {
    profId = dados.profissional_id;
  }

  var agendamentos = buscarAgendaSemana(semanaKey, profId);
  var bloqueios = buscarBloqueiosSemana(semanaKey, profId);
  var datas = getDatasDaSemana(semanaKey);

  return {
    ok: true,
    data: {
      semana_key: semanaKey,
      datas: datas,
      agendamentos: agendamentos,
      bloqueios: bloqueios
    }
  };
}

// ─── LISTAR DIA ───────────────────────────────────────────────────────────────

function listarAgendaDia(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var diaKey = dados.dia_key;
  if (!diaKey) {
    diaKey = getDiaKey();
  }

  var semanaKey = calcSemanaKey(diaKey);

  var profId = null;
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL) {
    profId = tokenPayload.pid;
  } else if (dados.profissional_id) {
    profId = dados.profissional_id;
  }

  var todosAgendamentos = buscarAgendaSemana(semanaKey, profId);
  var agendamentos = todosAgendamentos.filter(function(a) {
    return String(a.dia_key) === String(diaKey);
  });

  var todosBloqueios = buscarBloqueiosSemana(semanaKey, profId);
  var bloqueios = todosBloqueios.filter(function(b) {
    var bDia = getDiaKey(b.inicio_iso);
    return bDia === diaKey;
  });

  return {
    ok: true,
    data: {
      dia_key: diaKey,
      semana_key: semanaKey,
      agendamentos: agendamentos,
      bloqueios: bloqueios
    }
  };
}

// ─── CHECAR CONFLITO ──────────────────────────────────────────────────────────

function checarConflito(profissionalId, inicioIso, fimIso, excluirAgendamentoId) {
  var semanaKey = calcSemanaKey(inicioIso);
  var agendamentos = buscarAgendaSemana(semanaKey, profissionalId);
  var bloqueios = buscarBloqueiosSemana(semanaKey, profissionalId);

  var cfg = getConfiguracoesSistema();
  if (String(cfg.permitir_multiplos) === 'true') {
    return { conflito: false };
  }

  // Verificar conflito com agendamentos existentes
  for (var i = 0; i < agendamentos.length; i++) {
    var a = agendamentos[i];
    if (excluirAgendamentoId && String(a.id) === String(excluirAgendamentoId)) continue;
    if (String(a.status) === STATUS_AGENDAMENTO.CANCELADO) continue;

    if (temConflito(inicioIso, fimIso, a.inicio_iso, a.fim_iso)) {
      return { conflito: true, tipo: 'agendamento', com: a };
    }
  }

  // Verificar conflito com bloqueios
  for (var j = 0; j < bloqueios.length; j++) {
    var b = bloqueios[j];
    if (temConflito(inicioIso, fimIso, b.inicio_iso, b.fim_iso)) {
      return { conflito: true, tipo: 'bloqueio', com: b };
    }
  }

  return { conflito: false };
}

function checarConflitoAction(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['profissional_id', 'inicio_iso', 'fim_iso']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  var resultado = checarConflito(dados.profissional_id, dados.inicio_iso, dados.fim_iso, dados.excluir_id);
  return { ok: true, data: resultado };
}

// ─── CRIAR AGENDAMENTO ───────────────────────────────────────────────────────

function criarAgendamento(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['profissional_id', 'cliente_id', 'servico_id', 'inicio_iso']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  // RBAC: profissional só agenda para si
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(dados.profissional_id)) {
    return { ok: false, msg: 'Você só pode agendar na sua própria agenda.' };
  }

  // Buscar serviço para calcular fim
  var servico = buscarPorId(SHEETS.SERVICOS, dados.servico_id);
  if (!servico) return { ok: false, msg: 'Serviço não encontrado.' };

  var inicio = new Date(dados.inicio_iso);
  var duracao = parseInt(servico.duracao_min, 10) || 30;
  var fim = new Date(inicio.getTime() + duracao * 60000);
  var fimIso = dados.fim_iso || formatarData(fim);

  // Checar conflito
  var conf = checarConflito(dados.profissional_id, dados.inicio_iso, fimIso);
  if (conf.conflito) {
    return { ok: false, msg: 'Conflito de horário (' + conf.tipo + ').', data: conf };
  }

  var semanaKey = calcSemanaKey(dados.inicio_iso);
  var diaKey = getDiaKey(dados.inicio_iso);

  var id = gerarId();
  var registro = {
    id: id,
    semana_key: semanaKey,
    dia_key: diaKey,
    profissional_id: dados.profissional_id,
    cliente_id: dados.cliente_id,
    servico_id: dados.servico_id,
    pacote_vendido_id: dados.pacote_vendido_id || '',
    pacote_servico_id: dados.pacote_servico_id || '',
    inicio_iso: dados.inicio_iso,
    fim_iso: fimIso,
    status: STATUS_AGENDAMENTO.MARCADO,
    obs: dados.obs ? sanitizar(String(dados.obs).substring(0, 500)) : '',
    tags: dados.tags ? sanitizar(dados.tags) : '',
    criado_por: tokenPayload.uid,
    criado_em: agora(),
    atualizado_em: agora()
  };

  inserirRegistro(SHEETS.AGENDAMENTOS, registro);
  invalidarCacheAgenda(semanaKey, dados.profissional_id);

  // Se vinculado a pacote, dar baixa imediata
  if (dados.pacote_vendido_id && (dados.pacote_servico_id || dados.servico_id)) {
    try {
      darBaixaPorAgendamento(tokenPayload, {
        agendamento_id: id,
        pacote_vendido_id: dados.pacote_vendido_id,
        servico_id: dados.pacote_servico_id || dados.servico_id
      });
    } catch (e) {
      Logger.log('Erro na baixa imediata do pacote: ' + e.message);
    }
  }

  registrarLog('criar_agendamento', tokenPayload.uid, 'Agendamento: ' + id);

  return { ok: true, data: { id: id }, msg: 'Agendamento criado.' };
}

// ─── ATUALIZAR AGENDAMENTO ───────────────────────────────────────────────────

function atualizarAgendamento(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var existente = buscarPorId(SHEETS.AGENDAMENTOS, dados.id);
  if (!existente) return { ok: false, msg: 'Agendamento não encontrado.' };

  // RBAC
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(existente.profissional_id)) {
    return { ok: false, msg: 'Sem permissão para alterar este agendamento.' };
  }

  var updates = { atualizado_em: agora() };

  // Se alterou horário, checar conflito
  if (dados.inicio_iso) {
    var servico = buscarPorId(SHEETS.SERVICOS, dados.servico_id || existente.servico_id);
    var duracao = servico ? parseInt(servico.duracao_min, 10) : 30;
    var inicio = new Date(dados.inicio_iso);
    var fim = new Date(inicio.getTime() + duracao * 60000);
    var fimIso = dados.fim_iso || formatarData(fim);

    var profId = dados.profissional_id || existente.profissional_id;
    var conf = checarConflito(profId, dados.inicio_iso, fimIso, dados.id);
    if (conf.conflito) {
      return { ok: false, msg: 'Conflito de horário (' + conf.tipo + ').', data: conf };
    }

    updates.inicio_iso = dados.inicio_iso;
    updates.fim_iso = fimIso;
    updates.semana_key = calcSemanaKey(dados.inicio_iso);
    updates.dia_key = getDiaKey(dados.inicio_iso);
  }

  if (dados.profissional_id) updates.profissional_id = dados.profissional_id;
  if (dados.cliente_id) updates.cliente_id = dados.cliente_id;
  if (dados.servico_id) updates.servico_id = dados.servico_id;
  if (dados.obs !== undefined) updates.obs = sanitizar(String(dados.obs).substring(0, 500));
  if (dados.tags !== undefined) updates.tags = sanitizar(dados.tags);
  if (dados.pacote_vendido_id !== undefined) updates.pacote_vendido_id = dados.pacote_vendido_id;
  if (dados.pacote_servico_id !== undefined) updates.pacote_servico_id = dados.pacote_servico_id;

  atualizarRegistro(SHEETS.AGENDAMENTOS, dados.id, updates);
  invalidarCacheAgenda(existente.semana_key, existente.profissional_id);
  if (updates.semana_key) invalidarCacheAgenda(updates.semana_key, updates.profissional_id || existente.profissional_id);

  registrarLog('atualizar_agendamento', tokenPayload.uid, 'ID: ' + dados.id);
  return { ok: true, msg: 'Agendamento atualizado.' };
}

// ─── CANCELAR AGENDAMENTO ────────────────────────────────────────────────────

function cancelarAgendamento(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var existente = buscarPorId(SHEETS.AGENDAMENTOS, dados.id);
  if (!existente) return { ok: false, msg: 'Agendamento não encontrado.' };

  // RBAC
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(existente.profissional_id)) {
    return { ok: false, msg: 'Sem permissão.' };
  }

  atualizarRegistro(SHEETS.AGENDAMENTOS, dados.id, {
    status: STATUS_AGENDAMENTO.CANCELADO,
    atualizado_em: agora()
  });

  invalidarCacheAgenda(existente.semana_key, existente.profissional_id);
  registrarLog('cancelar_agendamento', tokenPayload.uid, 'ID: ' + dados.id);

  return { ok: true, msg: 'Agendamento cancelado.' };
}

// ─── MARCAR STATUS ────────────────────────────────────────────────────────────

function marcarStatus(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.id || !dados.status) {
    return { ok: false, msg: 'ID e status são obrigatórios.' };
  }

  var statusValidos = Object.values(STATUS_AGENDAMENTO);
  if (statusValidos.indexOf(dados.status) < 0) {
    return { ok: false, msg: 'Status inválido. Válidos: ' + statusValidos.join(', ') };
  }

  var existente = buscarPorId(SHEETS.AGENDAMENTOS, dados.id);
  if (!existente) return { ok: false, msg: 'Agendamento não encontrado.' };

  // RBAC
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(existente.profissional_id)) {
    return { ok: false, msg: 'Sem permissão.' };
  }

  atualizarRegistro(SHEETS.AGENDAMENTOS, dados.id, {
    status: dados.status,
    atualizado_em: agora()
  });

  invalidarCacheAgenda(existente.semana_key, existente.profissional_id);
  registrarLog('marcar_status', tokenPayload.uid, dados.id + ' -> ' + dados.status);

  // Se concluído e vinculado a pacote, dar baixa automática
  if (dados.status === STATUS_AGENDAMENTO.CONCLUIDO && existente.pacote_vendido_id) {
    try {
      darBaixaPorAgendamento(tokenPayload, {
        agendamento_id: dados.id,
        pacote_vendido_id: existente.pacote_vendido_id,
        servico_id: existente.pacote_servico_id || existente.servico_id
      });
    } catch (e) {
      Logger.log('Erro ao dar baixa no pacote: ' + e.message);
    }
  }

  return { ok: true, msg: 'Status atualizado para: ' + dados.status };
}


function excluirAgendamento(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var existente = buscarPorId(SHEETS.AGENDAMENTOS, dados.id);
  if (!existente) return { ok: false, msg: 'Agendamento não encontrado.' };

  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(existente.profissional_id)) {
    return { ok: false, msg: 'Sem permissão.' };
  }

  // Estornar baixas de pacote vinculadas ao agendamento
  var usos = buscarPorFiltro(SHEETS.PACOTES_USOS, { agendamento_id: dados.id }, false);
  for (var i = 0; i < usos.length; i++) {
    var uso = usos[i];
    var saldos = buscarPorFiltro(SHEETS.PACOTES_SALDOS, {
      pacote_vendido_id: uso.pacote_vendido_id,
      servico_id: uso.servico_id
    }, false);

    if (saldos.length > 0) {
      var saldo = saldos[0];
      var usada = parseInt(saldo.qtd_usada, 10) || 0;
      var qtdUso = parseInt(uso.qtd, 10) || 1;
      atualizarRegistro(SHEETS.PACOTES_SALDOS, saldo.id, {
        qtd_usada: Math.max(0, usada - qtdUso)
      });
    }

    removerRegistro(SHEETS.PACOTES_USOS, uso.id);
  }

  removerRegistro(SHEETS.AGENDAMENTOS, dados.id);
  invalidarCacheAgenda(existente.semana_key, existente.profissional_id);
  registrarLog('excluir_agendamento', tokenPayload.uid, 'ID: ' + dados.id);

  return { ok: true, msg: 'Agendamento excluído.' };
}
