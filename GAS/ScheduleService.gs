function scheduleList(session, payload) {
  payload = payload || {};
  var startIso = payload.start_iso;
  var endIso = payload.end_iso;
  var profFilter = payload.profissional_id || '';

  var items = listRows('AGENDAMENTOS').filter(function (a) {
    if (!a.inicio_iso || !a.fim_iso) return false;
    var isMine = session.role === APP_CONFIG.ROLES.PROFISSIONAL ? String(a.profissional_id) === String(session.profissional_id) : true;
    var byProf = profFilter ? String(a.profissional_id) === String(profFilter) : true;
    var inRange = true;
    if (startIso) inRange = inRange && new Date(a.fim_iso).getTime() >= new Date(startIso).getTime();
    if (endIso) inRange = inRange && new Date(a.inicio_iso).getTime() <= new Date(endIso).getTime();
    return isMine && byProf && inRange;
  });

  return okResponse({ items: items });
}

function scheduleSave(session, payload) {
  payload = payload || {};
  if (!payload.cliente_id || !payload.servico_id || !payload.inicio_iso) {
    throw new Error('cliente_id, servico_id e inicio_iso são obrigatórios');
  }

  var profissionalId = payload.profissional_id || session.profissional_id;
  if (!profissionalId) throw new Error('Profissional não definido para agenda ativa');

  if (session.role === APP_CONFIG.ROLES.PROFISSIONAL && String(profissionalId) !== String(session.profissional_id)) {
    throw new Error('Você só pode criar agendamentos para si mesmo');
  }

  var services = listRows('SERVICOS');
  var service = services.find(function (s) { return String(s.id) === String(payload.servico_id); });
  if (!service) throw new Error('Serviço não encontrado');

  var cfg = settingsGet(session).data.settings;
  var start = new Date(payload.inicio_iso);
  var duration = Number(service.duracao_minutos || 0);
  var end = new Date(start.getTime() + duration * 60 * 1000);

  validateScheduleConflict(payload.id || null, profissionalId, start, end, cfg, payload.encaixe === true);

  var now = toIsoUtc(new Date());
  var row = {
    profissional_id: profissionalId,
    cliente_id: payload.cliente_id,
    servico_id: payload.servico_id,
    pacote_vendido_id: payload.pacote_vendido_id || '',
    pacote_item_nome: payload.pacote_item_nome || '',
    inicio_iso: toIsoUtc(start),
    fim_iso: toIsoUtc(end),
    status: payload.status || APP_CONFIG.APPOINTMENT_STATUS.MARCADO,
    observacoes: payload.observacoes || '',
    tags: payload.tags || '',
    valor: payload.valor !== undefined ? Number(payload.valor) : Number(service.preco || 0),
    updated_by: session.user_id,
    updated_at: now
  };

  if (payload.id) {
    var updated = updateRowById('AGENDAMENTOS', payload.id, row);
    return okResponse({ item: updated });
  }

  row.id = uid('agd');
  row.created_by = session.user_id;
  row.created_at = now;
  var inserted = appendRow('AGENDAMENTOS', row);
  return okResponse({ item: inserted });
}

function scheduleCancel(session, payload) {
  payload = payload || {};
  if (!payload.id) throw new Error('id é obrigatório');
  var item = updateRowById('AGENDAMENTOS', payload.id, {
    status: APP_CONFIG.APPOINTMENT_STATUS.CANCELADO,
    updated_by: session.user_id,
    updated_at: toIsoUtc(new Date())
  });
  return okResponse({ item: item });
}

function blocksList(session, payload) {
  payload = payload || {};
  var profFilter = payload.profissional_id || '';
  var items = listRows('BLOQUEIOS').filter(function (b) {
    var byRole = session.role === APP_CONFIG.ROLES.ADMIN ? true : String(b.profissional_id) === String(session.profissional_id);
    var byProf = profFilter ? String(b.profissional_id) === String(profFilter) : true;
    return byRole && byProf;
  });
  return okResponse({ items: items });
}

function blocksSave(session, payload) {
  payload = payload || {};
  if (!payload.profissional_id || !payload.inicio_iso || !payload.fim_iso) throw new Error('Campos obrigatórios ausentes');
  if (session.role === APP_CONFIG.ROLES.PROFISSIONAL && String(payload.profissional_id) !== String(session.profissional_id)) {
    throw new Error('Você só pode bloquear sua própria agenda');
  }
  var now = toIsoUtc(new Date());
  var obj = {
    profissional_id: payload.profissional_id,
    inicio_iso: payload.inicio_iso,
    fim_iso: payload.fim_iso,
    motivo: payload.motivo || 'Bloqueio',
    created_by: session.user_id,
    updated_at: now
  };
  if (payload.id) {
    var updated = updateRowById('BLOQUEIOS', payload.id, obj);
    return okResponse({ item: updated });
  }
  obj.id = uid('blk');
  obj.created_at = now;
  var inserted = appendRow('BLOQUEIOS', obj);
  return okResponse({ item: inserted });
}

function validateScheduleConflict(ignoreId, profissionalId, start, end, cfg, isEncaixe) {
  var schedules = listRows('AGENDAMENTOS');
  var blocks = listRows('BLOQUEIOS');

  var maxSimultaneos = Number((cfg && cfg.agendamentos_simultaneos_max) || 1);
  var permitirEncaixe = !!(cfg && cfg.permitir_encaixe);
  if (isEncaixe && permitirEncaixe) maxSimultaneos = Math.max(maxSimultaneos, 2);

  var overlappingCount = schedules.filter(function (a) {
    if (ignoreId && String(a.id) === String(ignoreId)) return false;
    if (String(a.profissional_id) !== String(profissionalId)) return false;
    if (String(a.status) === APP_CONFIG.APPOINTMENT_STATUS.CANCELADO) return false;
    return overlap(start, end, new Date(a.inicio_iso), new Date(a.fim_iso));
  }).length;

  if (overlappingCount >= maxSimultaneos) {
    throw new Error('Conflito de horário: limite de simultâneos atingido');
  }

  var blocked = blocks.some(function (b) {
    if (String(b.profissional_id) !== String(profissionalId)) return false;
    return overlap(start, end, new Date(b.inicio_iso), new Date(b.fim_iso));
  });
  if (blocked) throw new Error('Horário bloqueado para esse profissional');
}
