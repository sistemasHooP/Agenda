function servicesList() {
  var items = listRows('SERVICOS').filter(function (s) { return asBool(s.ativo) || s.ativo === ''; });
  return okResponse({ items: items });
}

function servicesSave(payload) {
  payload = payload || {};
  if (!payload.nome) throw new Error('Nome do serviço é obrigatório');
  if (!payload.duracao_minutos) throw new Error('Duração é obrigatória');
  var now = toIsoUtc(new Date());

  if (payload.id) {
    var updated = updateRowById('SERVICOS', payload.id, {
      nome: payload.nome,
      preco: Number(payload.preco || 0),
      duracao_minutos: Number(payload.duracao_minutos),
      cor: payload.cor || '#0ea5e9',
      ativo: payload.ativo !== undefined ? payload.ativo : true,
      updated_at: now
    });
    return okResponse({ item: updated });
  }

  var inserted = appendRow('SERVICOS', {
    id: uid('srv'),
    nome: payload.nome,
    preco: Number(payload.preco || 0),
    duracao_minutos: Number(payload.duracao_minutos),
    cor: payload.cor || '#0ea5e9',
    ativo: true,
    created_at: now,
    updated_at: now
  });
  return okResponse({ item: inserted });
}
