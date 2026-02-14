/**
 * MinhaAgenda 2.0 — ServicosService.gs
 * CRUD de serviços
 */

function listarServicos(tokenPayload) {
  exigirAutenticado(tokenPayload);
  var lista = listarTodos(SHEETS.SERVICOS, true);
  return { ok: true, data: lista };
}

function criarServico(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['nome', 'preco', 'duracao_min']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  var preco = parseFloat(dados.preco);
  if (isNaN(preco) || preco < 0) {
    return { ok: false, msg: 'Preço inválido.' };
  }

  var duracao = parseInt(dados.duracao_min, 10);
  if (isNaN(duracao) || duracao < 5 || duracao > 480) {
    return { ok: false, msg: 'Duração deve ser entre 5 e 480 minutos.' };
  }

  var id = gerarId();
  var registro = {
    id: id,
    nome: sanitizar(dados.nome),
    preco: preco,
    duracao_min: duracao,
    cor: dados.cor || '#8B5CF6',
    ativo: 'true'
  };

  inserirRegistro(SHEETS.SERVICOS, registro);
  registrarLog('criar_servico', tokenPayload.uid, 'Serviço: ' + dados.nome);

  return { ok: true, data: { id: id }, msg: 'Serviço criado.' };
}

function atualizarServico(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var updates = {};
  if (dados.nome) updates.nome = sanitizar(dados.nome);
  if (dados.preco !== undefined) {
    var preco = parseFloat(dados.preco);
    if (isNaN(preco) || preco < 0) return { ok: false, msg: 'Preço inválido.' };
    updates.preco = preco;
  }
  if (dados.duracao_min !== undefined) {
    var duracao = parseInt(dados.duracao_min, 10);
    if (isNaN(duracao) || duracao < 5) return { ok: false, msg: 'Duração inválida.' };
    updates.duracao_min = duracao;
  }
  if (dados.cor) updates.cor = dados.cor;

  var ok = atualizarRegistro(SHEETS.SERVICOS, dados.id, updates);
  if (!ok) return { ok: false, msg: 'Serviço não encontrado.' };

  registrarLog('atualizar_servico', tokenPayload.uid, 'ID: ' + dados.id);
  return { ok: true, msg: 'Serviço atualizado.' };
}

function ativarDesativarServico(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var servico = buscarPorId(SHEETS.SERVICOS, dados.id);
  if (!servico) return { ok: false, msg: 'Serviço não encontrado.' };

  var novoStatus = String(servico.ativo) === 'true' ? 'false' : 'true';
  atualizarRegistro(SHEETS.SERVICOS, dados.id, { ativo: novoStatus });

  registrarLog('toggle_servico', tokenPayload.uid, dados.id + ' -> ' + novoStatus);
  return { ok: true, data: { ativo: novoStatus }, msg: novoStatus === 'true' ? 'Ativado.' : 'Desativado.' };
}
