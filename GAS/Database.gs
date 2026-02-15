/**
 * MinhaAgenda 2.0 — Database.gs
 * Camada de acesso ao Google Sheets com cache e lock
 */

// ─── REFERÊNCIA À PLANILHA ───────────────────────────────────────────────────

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(nome) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = criarAba(nome);
  }
  return sheet;
}

// ─── CRIAÇÃO AUTOMÁTICA DE ABAS ──────────────────────────────────────────────

function criarAba(nome) {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet(nome);
  var headers = HEADERS[nome];
  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Inicializa todas as abas do sistema (rodar uma vez)
 */
function inicializarAbas() {
  var nomes = Object.keys(SHEETS);
  for (var i = 0; i < nomes.length; i++) {
    getSheet(SHEETS[nomes[i]]);
  }
  return 'Abas inicializadas: ' + nomes.join(', ');
}

/**
 * Cria usuário admin padrão se não existir
 */
function criarAdminPadrao() {
  var sheet = getSheet(SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();

  // Verificar se já existe admin
  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === CONFIG.ROLES.ADMIN) {
      return 'Admin já existe: ' + data[i][2];
    }
  }

  var id = gerarId();
  var senhaHash = hashSenha('admin123');
  var ts = agora();
  sheet.appendRow([id, 'Administrador', 'admin@agenda.com', senhaHash, CONFIG.ROLES.ADMIN, '', 'true', ts]);
  return 'Admin criado: admin@agenda.com / admin123';
}

// ─── LEITURA COM CACHE ────────────────────────────────────────────────────────

/**
 * Lê todos os registros de uma aba, retornando array de objetos
 * Usa cache para listas estáveis
 */
function listarTodos(nomeAba, useCache) {
  var cacheKey = 'list_' + nomeAba;

  if (useCache !== false) {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  var sheet = getSheet(nomeAba);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  // Cachear resultado
  if (useCache !== false) {
    try {
      var cache = CacheService.getScriptCache();
      var jsonStr = JSON.stringify(result);
      if (jsonStr.length < 100000) { // limite do CacheService é ~100KB
        cache.put(cacheKey, jsonStr, CONFIG.CACHE_TTL_LISTAS);
      }
    } catch (e) {
      Logger.log('Erro ao cachear ' + nomeAba + ': ' + e.message);
    }
  }

  return result;
}

/**
 * Busca registros por filtro (coluna = valor)
 */
function buscarPorFiltro(nomeAba, filtros, useCache) {
  var todos = listarTodos(nomeAba, useCache);
  return todos.filter(function(item) {
    for (var key in filtros) {
      if (filtros.hasOwnProperty(key)) {
        if (String(item[key]) !== String(filtros[key])) return false;
      }
    }
    return true;
  });
}

/**
 * Busca um registro por ID
 */
function buscarPorId(nomeAba, id) {
  var todos = listarTodos(nomeAba);
  for (var i = 0; i < todos.length; i++) {
    if (String(todos[i].id) === String(id)) return todos[i];
  }
  return null;
}

/**
 * Busca registros da agenda por semana_key e profissional_id (otimizado)
 */
function buscarAgendaSemana(semanaKey, profissionalId) {
  var cacheKey = 'agenda_' + semanaKey + '_' + (profissionalId || 'all');
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var sheet = getSheet(SHEETS.AGENDAMENTOS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var colSemana = headers.indexOf('semana_key');
  var colProf = headers.indexOf('profissional_id');
  var colDia = headers.indexOf('dia_key');
  var colInicio = headers.indexOf('inicio_iso');

  var datasSemana = getDatasDaSemana(semanaKey);
  var datasMap = {};
  for (var d = 0; d < datasSemana.length; d++) datasMap[String(datasSemana[d])] = true;

  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (profissionalId && String(data[i][colProf]) !== String(profissionalId)) continue;

    var rowSemana = String(data[i][colSemana] || '');
    var rowDia = String(colDia >= 0 ? (data[i][colDia] || '') : '').substring(0, 10);
    var rowInicio = String(colInicio >= 0 ? (data[i][colInicio] || '') : '');
    var rowInicioDia = rowInicio ? rowInicio.substring(0, 10) : '';

    var pertenceSemana = (rowSemana === String(semanaKey)) || !!datasMap[rowDia] || !!datasMap[rowInicioDia];
    if (!pertenceSemana) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  try {
    var jsonStr = JSON.stringify(result);
    if (jsonStr.length < 100000) {
      cache.put(cacheKey, jsonStr, CONFIG.CACHE_TTL_AGENDA);
    }
  } catch (e) {}

  return result;
}

/**
 * Busca bloqueios por semana_key e profissional_id
 */
function buscarBloqueiosSemana(semanaKey, profissionalId) {
  var cacheKey = 'bloq_' + semanaKey + '_' + (profissionalId || 'all');
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var sheet = getSheet(SHEETS.BLOQUEIOS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var colSemana = headers.indexOf('semana_key');
  var colProf = headers.indexOf('profissional_id');

  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colSemana]) !== String(semanaKey)) continue;
    if (profissionalId && String(data[i][colProf]) !== String(profissionalId)) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  try {
    var jsonStr = JSON.stringify(result);
    if (jsonStr.length < 100000) {
      cache.put(cacheKey, jsonStr, CONFIG.CACHE_TTL_AGENDA);
    }
  } catch (e) {}

  return result;
}

// ─── ESCRITA COM LOCK ─────────────────────────────────────────────────────────

/**
 * Insere uma nova linha com lock
 */
function inserirRegistro(nomeAba, dados) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);

    var sheet = getSheet(nomeAba);
    var headers = HEADERS[nomeAba];
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var val = dados[headers[i]];
      row.push(val !== undefined && val !== null ? val : '');
    }
    sheet.appendRow(row);
    invalidarCache(nomeAba);
    return true;
  } catch (e) {
    Logger.log('Erro ao inserir em ' + nomeAba + ': ' + e.message);
    throw new Error('Não foi possível salvar. Tente novamente.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Atualiza um registro existente por ID com lock
 */
function atualizarRegistro(nomeAba, id, dados) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);

    var sheet = getSheet(nomeAba);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colId = headers.indexOf('id');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colId]) === String(id)) {
        for (var key in dados) {
          if (dados.hasOwnProperty(key)) {
            var colIdx = headers.indexOf(key);
            if (colIdx >= 0 && key !== 'id') {
              sheet.getRange(i + 1, colIdx + 1).setValue(dados[key]);
            }
          }
        }
        invalidarCache(nomeAba);
        return true;
      }
    }
    return false;
  } catch (e) {
    Logger.log('Erro ao atualizar em ' + nomeAba + ': ' + e.message);
    throw new Error('Não foi possível atualizar. Tente novamente.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Remove um registro por ID com lock
 */
function removerRegistro(nomeAba, id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);

    var sheet = getSheet(nomeAba);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colId = headers.indexOf('id');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][colId]) === String(id)) {
        sheet.deleteRow(i + 1);
        invalidarCache(nomeAba);
        return true;
      }
    }
    return false;
  } catch (e) {
    Logger.log('Erro ao remover em ' + nomeAba + ': ' + e.message);
    throw new Error('Não foi possível remover. Tente novamente.');
  } finally {
    lock.releaseLock();
  }
}

// ─── CACHE ────────────────────────────────────────────────────────────────────

function invalidarCache(nomeAba) {
  var cache = CacheService.getScriptCache();
  cache.remove('list_' + nomeAba);

  // Invalidar caches de agenda/bloqueios (todas as semanas)
  if (nomeAba === SHEETS.AGENDAMENTOS || nomeAba === SHEETS.BLOQUEIOS) {
    // Não dá pra invalidar por prefixo no CacheService,
    // então a gente depende do TTL curto (2 min)
  }
}

function invalidarCacheAgenda(semanaKey, profissionalId) {
  var cache = CacheService.getScriptCache();
  cache.remove('agenda_' + semanaKey + '_' + (profissionalId || 'all'));
  cache.remove('agenda_' + semanaKey + '_all');
  cache.remove('bloq_' + semanaKey + '_' + (profissionalId || 'all'));
  cache.remove('bloq_' + semanaKey + '_all');
}

function limparTodoCache() {
  // CacheService não tem clearAll, remove manualmente os conhecidos
  var cache = CacheService.getScriptCache();
  var nomes = Object.keys(SHEETS);
  for (var i = 0; i < nomes.length; i++) {
    cache.remove('list_' + SHEETS[nomes[i]]);
  }
}
