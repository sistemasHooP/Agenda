/**
 * MinhaAgenda 2.0 — Utils.gs
 * Funções utilitárias: respostas, validação, sanitização, datas
 */

// ─── RESPOSTAS HTTP ───────────────────────────────────────────────────────────

function jsonOk(data, msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data || null, msg: msg || 'OK' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErro(msg, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, data: null, msg: msg || 'Erro', code: code || 400 }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── GERAÇÃO DE ID ────────────────────────────────────────────────────────────

function gerarId() {
  return Utilities.getUuid();
}

// ─── DATA/HORA ────────────────────────────────────────────────────────────────

function agora() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

function agoraDate() {
  return new Date();
}

function formatarData(date, formato) {
  formato = formato || "yyyy-MM-dd'T'HH:mm:ss";
  return Utilities.formatDate(date, CONFIG.TIMEZONE, formato);
}

/**
 * Retorna a semana_key no formato YYYY-WW
 */
function getSemanaKey(dateStr) {
  var d = dateStr ? new Date(dateStr) : new Date();
  var tz = CONFIG.TIMEZONE;
  var oneJan = new Date(d.getFullYear(), 0, 1);
  var dayOfYear = Math.ceil((d - oneJan) / 86400000);
  var weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
  var wk = weekNum < 10 ? '0' + weekNum : '' + weekNum;
  return d.getFullYear() + '-' + wk;
}

/**
 * Retorna dia_key no formato YYYY-MM-DD
 */
function getDiaKey(dateStr) {
  var d = dateStr ? new Date(dateStr) : new Date();
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Retorna as datas (YYYY-MM-DD) de uma semana_key
 */
function getDatasDaSemana(semanaKey) {
  var parts = semanaKey.split('-');
  var year = parseInt(parts[0], 10);
  var week = parseInt(parts[1], 10);

  // Encontrar o primeiro dia do ano
  var jan1 = new Date(year, 0, 1);
  // Ajustar para segunda-feira da semana 1
  var dayOfWeek = jan1.getDay(); // 0=dom
  var daysToMonday = (dayOfWeek === 0) ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  var monday = new Date(year, 0, 1 + daysToMonday + (week - 2) * 7);

  // Se a semana 1 começa antes de jan1
  if (week === 1) {
    // Volta para a segunda-feira mais próxima
    var d = new Date(year, 0, 1);
    var dow = d.getDay();
    if (dow === 0) dow = 7;
    d.setDate(d.getDate() - (dow - 1));
    monday = d;
  }

  var datas = [];
  for (var i = 0; i < 7; i++) {
    var dia = new Date(monday.getTime() + i * 86400000);
    datas.push(Utilities.formatDate(dia, CONFIG.TIMEZONE, 'yyyy-MM-dd'));
  }
  return datas;
}

/**
 * Calcula semana_key a partir de uma data ISO
 */
function calcSemanaKey(isoDate) {
  return getSemanaKey(isoDate);
}

// ─── VALIDAÇÃO ────────────────────────────────────────────────────────────────

function validarEmail(email) {
  if (!email) return false;
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validarTelefone(tel) {
  if (!tel) return false;
  var limpo = String(tel).replace(/\D/g, '');
  return limpo.length >= 10 && limpo.length <= 13;
}

function validarCamposObrigatorios(obj, campos) {
  var faltando = [];
  for (var i = 0; i < campos.length; i++) {
    var val = obj[campos[i]];
    if (val === undefined || val === null || String(val).trim() === '') {
      faltando.push(campos[i]);
    }
  }
  return faltando;
}

// ─── SANITIZAÇÃO (Anti-XSS) ──────────────────────────────────────────────────

function sanitizar(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizarObjeto(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var result = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var val = obj[key];
      if (typeof val === 'string') {
        result[key] = sanitizar(val);
      } else if (typeof val === 'object' && val !== null) {
        result[key] = sanitizarObjeto(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────

function verificarRateLimit(chave) {
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + chave;
  var dados = cache.get(key);

  if (!dados) {
    cache.put(key, JSON.stringify({ count: 1, ts: Date.now() }), CONFIG.RATE_LIMIT_WINDOW_SECONDS);
    return true;
  }

  var parsed = JSON.parse(dados);
  if (parsed.count >= CONFIG.RATE_LIMIT_MAX_ATTEMPTS) {
    return false; // bloqueado
  }

  parsed.count++;
  cache.put(key, JSON.stringify(parsed), CONFIG.RATE_LIMIT_WINDOW_SECONDS);
  return true;
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────

function registrarLog(acao, userId, detalhe) {
  try {
    var db = getSheet(SHEETS.LOGS);
    var id = gerarId();
    var ts = agora();
    db.appendRow([id, sanitizar(acao), userId || '', sanitizar(String(detalhe || '').substring(0, 500)), ts]);
  } catch (e) {
    // Falha silenciosa em log - não deve quebrar fluxo principal
    Logger.log('Erro ao registrar log: ' + e.message);
  }
}

/**
 * Limpa logs antigos (rodar periodicamente via trigger)
 */
function limparLogsAntigos() {
  var db = getSheet(SHEETS.LOGS);
  var data = db.getDataRange().getValues();
  if (data.length <= 1) return;

  var limite = new Date();
  limite.setDate(limite.getDate() - CONFIG.LOGS_RETENTION_DAYS);

  var linhasRemover = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var criadoEm = new Date(data[i][4]); // coluna criado_em
    if (criadoEm < limite) {
      linhasRemover.push(i + 1); // +1 porque Sheet é 1-indexed
    }
  }

  // Remover de baixo para cima para não afetar índices
  for (var j = 0; j < linhasRemover.length; j++) {
    db.deleteRow(linhasRemover[j]);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Verifica se dois intervalos de tempo se sobrepõem
 */
function temConflito(inicio1, fim1, inicio2, fim2) {
  var s1 = new Date(inicio1).getTime();
  var e1 = new Date(fim1).getTime();
  var s2 = new Date(inicio2).getTime();
  var e2 = new Date(fim2).getTime();
  return s1 < e2 && s2 < e1;
}

/**
 * Parse seguro de JSON
 */
function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

/**
 * Paginação simples
 */
function paginar(array, pagina, porPagina) {
  pagina = pagina || 1;
  porPagina = porPagina || 50;
  var inicio = (pagina - 1) * porPagina;
  return {
    itens: array.slice(inicio, inicio + porPagina),
    total: array.length,
    pagina: pagina,
    porPagina: porPagina,
    totalPaginas: Math.ceil(array.length / porPagina)
  };
}
