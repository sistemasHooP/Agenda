/**
 * MinhaAgenda 2.0 — ClientesService.gs
 * CRUD de clientes + pesquisa + importação CSV/Excel
 */

function listarClientes(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);
  var lista = listarTodos(SHEETS.CLIENTES, true);

  // Paginação
  if (dados && dados.pagina) {
    return { ok: true, data: paginar(lista, dados.pagina, dados.porPagina) };
  }

  return { ok: true, data: lista };
}

function pesquisarClientes(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var termo = String(dados.termo || '').toLowerCase().trim();
  if (termo.length < 2) {
    return { ok: false, msg: 'Termo deve ter pelo menos 2 caracteres.' };
  }

  var lista = listarTodos(SHEETS.CLIENTES, true);
  var resultado = lista.filter(function(c) {
    var nome = String(c.nome || '').toLowerCase();
    var telefone = String(c.telefone || '').replace(/\D/g, '');
    var email = String(c.email || '').toLowerCase();
    var termoLimpo = termo.replace(/\D/g, '');

    return nome.indexOf(termo) >= 0 ||
           (termoLimpo && telefone.indexOf(termoLimpo) >= 0) ||
           email.indexOf(termo) >= 0;
  });

  return { ok: true, data: resultado.slice(0, 20) }; // máx 20 resultados
}

function criarCliente(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['nome']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campo obrigatório: nome' };
  }

  // Verificar duplicidade por telefone (se informado)
  if (dados.telefone) {
    var telLimpo = String(dados.telefone).replace(/\D/g, '');
    if (telLimpo) {
      var existentes = listarTodos(SHEETS.CLIENTES, true);
      for (var i = 0; i < existentes.length; i++) {
        var existTel = String(existentes[i].telefone || '').replace(/\D/g, '');
        if (existTel && existTel === telLimpo) {
          return { ok: false, msg: 'Já existe um cliente com este telefone.', data: { existente: existentes[i] } };
        }
      }
    }
  }

  var id = gerarId();
  var registro = {
    id: id,
    nome: sanitizar(dados.nome),
    telefone: dados.telefone ? sanitizar(String(dados.telefone).trim()) : '',
    email: dados.email ? sanitizar(String(dados.email).trim().toLowerCase()) : '',
    obs: dados.obs ? sanitizar(String(dados.obs).substring(0, 500)) : '',
    tags: dados.tags ? sanitizar(dados.tags) : '',
    criado_em: agora()
  };

  inserirRegistro(SHEETS.CLIENTES, registro);
  registrarLog('criar_cliente', tokenPayload.uid, 'Cliente: ' + dados.nome);

  return { ok: true, data: { id: id, nome: registro.nome }, msg: 'Cliente criado.' };
}

function atualizarCliente(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var updates = {};
  if (dados.nome) updates.nome = sanitizar(dados.nome);
  if (dados.telefone !== undefined) updates.telefone = sanitizar(String(dados.telefone).trim());
  if (dados.email !== undefined) updates.email = sanitizar(String(dados.email).trim().toLowerCase());
  if (dados.obs !== undefined) updates.obs = sanitizar(String(dados.obs).substring(0, 500));
  if (dados.tags !== undefined) updates.tags = sanitizar(dados.tags);

  var ok = atualizarRegistro(SHEETS.CLIENTES, dados.id, updates);
  if (!ok) return { ok: false, msg: 'Cliente não encontrado.' };

  registrarLog('atualizar_cliente', tokenPayload.uid, 'ID: ' + dados.id);
  return { ok: true, msg: 'Cliente atualizado.' };
}

/**
 * Importação em massa (CSV/Excel processado no front)
 * Recebe array de objetos { nome, telefone, email }
 */
function importarClientes(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  if (!dados.clientes || !Array.isArray(dados.clientes) || dados.clientes.length === 0) {
    return { ok: false, msg: 'Nenhum cliente para importar.' };
  }

  if (dados.clientes.length > 500) {
    return { ok: false, msg: 'Máximo de 500 clientes por importação.' };
  }

  var existentes = listarTodos(SHEETS.CLIENTES, false);
  var telefones = {};
  var emails = {};
  for (var i = 0; i < existentes.length; i++) {
    var tel = String(existentes[i].telefone || '').replace(/\D/g, '');
    var email = String(existentes[i].email || '').toLowerCase();
    if (tel) telefones[tel] = true;
    if (email) emails[email] = true;
  }

  var importados = 0;
  var duplicados = 0;
  var erros = 0;
  var detalhes = [];

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getSheet(SHEETS.CLIENTES);

    for (var j = 0; j < dados.clientes.length; j++) {
      var c = dados.clientes[j];
      if (!c.nome || String(c.nome).trim() === '') {
        erros++;
        detalhes.push({ linha: j + 1, status: 'erro', motivo: 'Nome vazio' });
        continue;
      }

      var telClean = c.telefone ? String(c.telefone).replace(/\D/g, '') : '';
      var emailClean = c.email ? String(c.email).trim().toLowerCase() : '';

      // Deduplicar
      if ((telClean && telefones[telClean]) || (emailClean && emails[emailClean])) {
        duplicados++;
        detalhes.push({ linha: j + 1, status: 'duplicado', nome: c.nome });
        continue;
      }

      var id = gerarId();
      var headers = HEADERS[SHEETS.CLIENTES];
      var row = [id, sanitizar(c.nome), telClean, emailClean, '', '', agora()];
      sheet.appendRow(row);

      if (telClean) telefones[telClean] = true;
      if (emailClean) emails[emailClean] = true;
      importados++;
    }

    invalidarCache(SHEETS.CLIENTES);
  } finally {
    lock.releaseLock();
  }

  registrarLog('importar_clientes', tokenPayload.uid, 'Importados: ' + importados + ', Dup: ' + duplicados + ', Erros: ' + erros);

  return {
    ok: true,
    data: {
      importados: importados,
      duplicados: duplicados,
      erros: erros,
      detalhes: detalhes.slice(0, 50) // limitar detalhes
    },
    msg: importados + ' clientes importados.'
  };
}
