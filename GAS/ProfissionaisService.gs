/**
 * MinhaAgenda 2.0 — ProfissionaisService.gs
 * CRUD de profissionais
 */

function listarProfissionais(tokenPayload) {
  exigirAutenticado(tokenPayload);
  var lista = listarTodos(SHEETS.PROFISSIONAIS, true);
  return { ok: true, data: lista };
}

function criarProfissional(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['nome']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campo obrigatório: nome' };
  }

  var id = gerarId();
  var registro = {
    id: id,
    nome: sanitizar(dados.nome),
    cor: dados.cor || '#3B82F6',
    ativo: 'true'
  };

  inserirRegistro(SHEETS.PROFISSIONAIS, registro);
  registrarLog('criar_profissional', tokenPayload.uid, 'Profissional: ' + dados.nome);

  return { ok: true, data: { id: id }, msg: 'Profissional criado.' };
}

function atualizarProfissional(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var updates = {};
  if (dados.nome) updates.nome = sanitizar(dados.nome);
  if (dados.cor) updates.cor = dados.cor;

  var ok = atualizarRegistro(SHEETS.PROFISSIONAIS, dados.id, updates);
  if (!ok) return { ok: false, msg: 'Profissional não encontrado.' };

  registrarLog('atualizar_profissional', tokenPayload.uid, 'ID: ' + dados.id);
  return { ok: true, msg: 'Profissional atualizado.' };
}

function ativarDesativarProfissional(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var prof = buscarPorId(SHEETS.PROFISSIONAIS, dados.id);
  if (!prof) return { ok: false, msg: 'Profissional não encontrado.' };

  var novoStatus = String(prof.ativo) === 'true' ? 'false' : 'true';
  atualizarRegistro(SHEETS.PROFISSIONAIS, dados.id, { ativo: novoStatus });

  registrarLog('toggle_profissional', tokenPayload.uid, dados.id + ' -> ' + novoStatus);
  return { ok: true, data: { ativo: novoStatus }, msg: novoStatus === 'true' ? 'Ativado.' : 'Desativado.' };
}
