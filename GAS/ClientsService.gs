function clientsList(session, payload) {
  var q = String((payload || {}).q || '').toLowerCase().trim();
  var items = listRows('CLIENTES').filter(function (c) { return asBool(c.ativo) || c.ativo === ''; });
  if (q) {
    items = items.filter(function (c) {
      return String(c.nome || '').toLowerCase().indexOf(q) >= 0 ||
        String(c.telefone || '').indexOf(q) >= 0 ||
        String(c.email || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  return okResponse({ items: items.slice(0, 200) });
}

function clientsSave(session, payload) {
  payload = payload || {};
  if (!payload.nome) throw new Error('Nome é obrigatório');
  var now = toIsoUtc(new Date());

  if (payload.id) {
    var updated = updateRowById('CLIENTES', payload.id, {
      nome: payload.nome,
      telefone: sanitizePhone(payload.telefone),
      email: sanitizeEmail(payload.email),
      data_nascimento: payload.data_nascimento || '',
      observacoes: payload.observacoes || '',
      tags: payload.tags || '',
      ativo: payload.ativo !== undefined ? payload.ativo : true,
      updated_at: now
    });
    return okResponse({ item: updated });
  }

  var inserted = appendRow('CLIENTES', {
    id: uid('cli'),
    nome: payload.nome,
    telefone: sanitizePhone(payload.telefone),
    email: sanitizeEmail(payload.email),
    data_nascimento: payload.data_nascimento || '',
    observacoes: payload.observacoes || '',
    tags: payload.tags || '',
    ativo: true,
    created_at: now,
    updated_at: now
  });

  return okResponse({ item: inserted });
}
