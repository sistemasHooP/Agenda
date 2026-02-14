function hashPassword(plain) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain));
  return raw.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function authLogin(payload) {
  payload = payload || {};
  var email = sanitizeEmail(payload.email);
  var senha = String(payload.senha || '');
  var users = listRows('USUARIOS');
  var user = users.find(function (u) {
    return sanitizeEmail(u.email) === email && asBool(u.ativo);
  });
  if (!user) throw new Error('Usuário não encontrado');
  if (user.senha_hash !== hashPassword(senha)) throw new Error('Credenciais inválidas');

  var token = uid('tok');
  var exp = new Date(Date.now() + APP_CONFIG.SECURITY.TOKEN_TTL_MINUTES * 60 * 1000);
  PropertiesService.getScriptProperties().setProperty(
    APP_CONFIG.PROPERTY_KEYS.SESSION_PREFIX + token,
    JSON.stringify({
      token: token,
      user_id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      profissional_id: user.profissional_id || '',
      exp_iso: toIsoUtc(exp)
    })
  );
  logEvent('INFO', 'auth.login', { email: email }, user.id);
  return okResponse({ token: token, user: authSessionPublic(mustGetSession(token)) });
}

function authMe(token) {
  var session = mustGetSession(token);
  return okResponse({ user: authSessionPublic(session) });
}

function authLogout(token) {
  var key = APP_CONFIG.PROPERTY_KEYS.SESSION_PREFIX + token;
  PropertiesService.getScriptProperties().deleteProperty(key);
  return okResponse({ logged_out: true });
}

function mustGetSession(token) {
  if (!token) throw new Error('Token obrigatório');
  var key = APP_CONFIG.PROPERTY_KEYS.SESSION_PREFIX + token;
  var raw = PropertiesService.getScriptProperties().getProperty(key);
  var session = parseJsonSafe(raw, null);
  if (!session) throw new Error('Sessão inválida');
  if (new Date(session.exp_iso).getTime() < Date.now()) {
    PropertiesService.getScriptProperties().deleteProperty(key);
    throw new Error('Sessão expirada');
  }
  return session;
}

function authSessionPublic(session) {
  return {
    id: session.user_id,
    nome: session.nome,
    email: session.email,
    role: session.role,
    profissional_id: session.profissional_id
  };
}

function usersList() {
  var users = listRows('USUARIOS').map(function (u) {
    delete u.senha_hash;
    return u;
  });
  return okResponse({ items: users });
}
