function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function okResponse(data) {
  return { ok: true, data: data || null };
}

function failResponse(message, details) {
  return { ok: false, error: { message: message, details: details || null } };
}

function uid(prefix) {
  return (prefix || 'id') + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function parseJsonSafe(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (_err) {
    return fallback;
  }
}

function asBool(value) {
  return String(value).toLowerCase() === 'true' || value === true || value === 1 || value === '1';
}

function logEvent(level, action, details, userId) {
  try {
    var sheet = getSheet(APP_CONFIG.SHEETS.LOGS);
    var headers = APP_CONFIG.SHEET_HEADERS.LOGS;
    ensureSheetHeader(sheet, headers);
    sheet.appendRow([
      uid('log'),
      level,
      action,
      JSON.stringify(details || {}),
      userId || '',
      toIsoUtc(new Date())
    ]);
  } catch (_err) {}
}

function adminOnly(session, fn) {
  if (session.role !== APP_CONFIG.ROLES.ADMIN) throw new Error('Acesso restrito ao ADMIN');
  return fn();
}

function sanitizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function overlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}
