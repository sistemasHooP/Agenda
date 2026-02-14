function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(APP_CONFIG.PROPERTY_KEYS.SHEET_ID);
  if (sheetId) return SpreadsheetApp.openById(sheetId);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureSheetHeader(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var valid = headers.every(function (h, i) { return current[i] === h; });
  if (!valid) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function listRows(name) {
  var headers = APP_CONFIG.SHEET_HEADERS[name];
  var sheet = getSheet(APP_CONFIG.SHEETS[name]);
  ensureSheetHeader(sheet, headers);
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(function (r) {
    var obj = {};
    headers.forEach(function (h, idx) { obj[h] = r[idx]; });
    return obj;
  });
}

function appendRow(name, obj) {
  var headers = APP_CONFIG.SHEET_HEADERS[name];
  var sheet = getSheet(APP_CONFIG.SHEETS[name]);
  ensureSheetHeader(sheet, headers);
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
  return obj;
}

function updateRowById(name, id, patch) {
  var headers = APP_CONFIG.SHEET_HEADERS[name];
  var sheet = getSheet(APP_CONFIG.SHEETS[name]);
  ensureSheetHeader(sheet, headers);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      headers.forEach(function (h, idx) {
        if (patch[h] !== undefined) rows[i][idx] = patch[h];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rows[i]]);
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = rows[i][idx]; });
      return obj;
    }
  }
  throw new Error('Registro não encontrado: ' + id);
}

function handleSetupInit(payload) {
  payload = payload || {};
  Object.keys(APP_CONFIG.SHEETS).forEach(function (k) {
    var sheetName = APP_CONFIG.SHEETS[k];
    var sheet = getSheet(sheetName);
    ensureSheetHeader(sheet, APP_CONFIG.SHEET_HEADERS[k]);
  });

  var users = listRows('USUARIOS');
  if (!users.length) {
    var adminName = payload.admin_nome || 'Administrador';
    var adminEmail = sanitizeEmail(payload.admin_email || 'admin@agenda.local');
    var adminPass = String(payload.admin_senha || '123456');
    appendRow('USUARIOS', {
      id: uid('usr'), nome: adminName, email: adminEmail, telefone: '',
      senha_hash: hashPassword(adminPass), role: APP_CONFIG.ROLES.ADMIN, profissional_id: '',
      ativo: true, created_at: toIsoUtc(new Date()), updated_at: toIsoUtc(new Date())
    });
  }

  return okResponse({ initialized: true, sheets: Object.keys(APP_CONFIG.SHEETS).length });
}
