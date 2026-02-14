function professionalsList(session) {
  var all = listRows('PROFISSIONAIS').filter(function (p) { return asBool(p.ativo) || p.ativo === ''; });
  if (session.role === APP_CONFIG.ROLES.ADMIN) return okResponse({ items: all });
  var mine = all.filter(function (p) { return String(p.id) === String(session.profissional_id); });
  return okResponse({ items: mine });
}

function professionalsSave(payload) {
  payload = payload || {};
  if (!payload.nome) throw new Error('Nome é obrigatório');
  var now = toIsoUtc(new Date());

  if (payload.id) {
    var updated = updateRowById('PROFISSIONAIS', payload.id, {
      nome: payload.nome,
      telefone: sanitizePhone(payload.telefone),
      email: sanitizeEmail(payload.email),
      ativo: payload.ativo !== undefined ? payload.ativo : true,
      updated_at: now
    });
    return okResponse({ item: updated });
  }

  var inserted = appendRow('PROFISSIONAIS', {
    id: uid('pro'),
    nome: payload.nome,
    telefone: sanitizePhone(payload.telefone),
    email: sanitizeEmail(payload.email),
    ativo: true,
    created_at: now,
    updated_at: now
  });

  return okResponse({ item: inserted });
}
