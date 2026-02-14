/**
 * MinhaAgenda 2.0 — Auth.gs
 * Autenticação, tokens HMAC, RBAC
 */

// ─── HASH DE SENHA ────────────────────────────────────────────────────────────

function hashSenha(senha) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha + CONFIG.TOKEN_SECRET);
  return raw.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// ─── GERAÇÃO DE TOKEN HMAC ───────────────────────────────────────────────────

function gerarToken(userId, role, profissionalId) {
  var payload = {
    uid: userId,
    role: role,
    pid: profissionalId || '',
    exp: Date.now() + CONFIG.TOKEN_EXPIRATION_MS,
    iat: Date.now()
  };

  var payloadStr = JSON.stringify(payload);
  var payloadB64 = Utilities.base64Encode(payloadStr);

  // HMAC-SHA256
  var signature = Utilities.computeHmacSha256Signature(payloadB64, CONFIG.TOKEN_SECRET);
  var sigB64 = Utilities.base64Encode(signature);

  return payloadB64 + '.' + sigB64;
}

// ─── VERIFICAÇÃO DE TOKEN ─────────────────────────────────────────────────────

function verificarToken(token) {
  if (!token) return null;

  // Verificar no cache primeiro
  var cache = CacheService.getScriptCache();
  var cacheKey = 'tk_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, token)
    .map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var parts = token.split('.');
  if (parts.length !== 2) return null;

  var payloadB64 = parts[0];
  var sigB64 = parts[1];

  // Verificar assinatura
  var expectedSig = Utilities.computeHmacSha256Signature(payloadB64, CONFIG.TOKEN_SECRET);
  var expectedB64 = Utilities.base64Encode(expectedSig);

  if (sigB64 !== expectedB64) return null;

  // Decodificar payload
  var payloadStr = Utilities.newBlob(Utilities.base64Decode(payloadB64)).getDataAsString();
  var payload = JSON.parse(payloadStr);

  // Verificar expiração
  if (payload.exp < Date.now()) return null;

  // Cachear token válido
  try {
    cache.put(cacheKey, JSON.stringify(payload), CONFIG.CACHE_TTL_TOKEN);
  } catch (e) {}

  return payload;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function login(email, senha) {
  // Rate limit
  if (!verificarRateLimit('login_' + (email || 'unknown'))) {
    return { ok: false, msg: 'Muitas tentativas. Aguarde um minuto.' };
  }

  if (!email || !senha) {
    return { ok: false, msg: 'Email e senha são obrigatórios.' };
  }

  email = String(email).trim().toLowerCase();
  var senhaH = hashSenha(senha);

  var usuarios = listarTodos(SHEETS.USUARIOS, false);
  for (var i = 0; i < usuarios.length; i++) {
    var u = usuarios[i];
    if (String(u.email).toLowerCase() === email &&
        String(u.senha_hash) === senhaH &&
        String(u.ativo) === 'true') {

      var token = gerarToken(u.id, u.role, u.profissional_id);
      registrarLog('login', u.id, 'Login bem-sucedido');

      return {
        ok: true,
        data: {
          token: token,
          usuario: {
            id: u.id,
            nome: u.nome,
            email: u.email,
            role: u.role,
            profissional_id: u.profissional_id
          }
        }
      };
    }
  }

  registrarLog('login_falha', '', 'Tentativa falha: ' + email);
  return { ok: false, msg: 'Email ou senha inválidos.' };
}

// ─── GET ME (dados do usuário logado) ─────────────────────────────────────────

function getMe(tokenPayload) {
  var usuario = buscarPorId(SHEETS.USUARIOS, tokenPayload.uid);
  if (!usuario) return { ok: false, msg: 'Usuário não encontrado.' };

  return {
    ok: true,
    data: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      profissional_id: usuario.profissional_id
    }
  };
}

// ─── RBAC (verificação de permissão) ──────────────────────────────────────────

function verificarPermissao(tokenPayload, roleNecessaria) {
  if (!tokenPayload) return false;
  if (tokenPayload.role === CONFIG.ROLES.ADMIN) return true;
  if (roleNecessaria === CONFIG.ROLES.PROFISSIONAL && tokenPayload.role === CONFIG.ROLES.PROFISSIONAL) return true;
  return false;
}

function exigirAdmin(tokenPayload) {
  if (!tokenPayload || tokenPayload.role !== CONFIG.ROLES.ADMIN) {
    throw new Error('Acesso restrito a administradores.');
  }
}

function exigirAutenticado(tokenPayload) {
  if (!tokenPayload) {
    throw new Error('Token inválido ou expirado.');
  }
}

// ─── ALTERAR SENHA ────────────────────────────────────────────────────────────

function alterarSenha(tokenPayload, senhaAtual, novaSenha) {
  exigirAutenticado(tokenPayload);

  if (!senhaAtual || !novaSenha) {
    return { ok: false, msg: 'Senha atual e nova senha são obrigatórias.' };
  }

  if (novaSenha.length < 6) {
    return { ok: false, msg: 'Nova senha deve ter pelo menos 6 caracteres.' };
  }

  var usuario = buscarPorId(SHEETS.USUARIOS, tokenPayload.uid);
  if (!usuario) return { ok: false, msg: 'Usuário não encontrado.' };

  if (hashSenha(senhaAtual) !== String(usuario.senha_hash)) {
    return { ok: false, msg: 'Senha atual incorreta.' };
  }

  atualizarRegistro(SHEETS.USUARIOS, tokenPayload.uid, {
    senha_hash: hashSenha(novaSenha)
  });

  registrarLog('alterar_senha', tokenPayload.uid, 'Senha alterada');
  return { ok: true, msg: 'Senha alterada com sucesso.' };
}

// ─── GERENCIAMENTO DE USUÁRIOS (ADMIN) ────────────────────────────────────────

function criarUsuario(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['nome', 'email', 'senha', 'role']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  if (!validarEmail(dados.email)) {
    return { ok: false, msg: 'Email inválido.' };
  }

  // Verificar duplicidade de email
  var existentes = listarTodos(SHEETS.USUARIOS, false);
  for (var i = 0; i < existentes.length; i++) {
    if (String(existentes[i].email).toLowerCase() === String(dados.email).toLowerCase()) {
      return { ok: false, msg: 'Já existe um usuário com este email.' };
    }
  }

  var id = gerarId();
  var registro = {
    id: id,
    nome: sanitizar(dados.nome),
    email: String(dados.email).trim().toLowerCase(),
    senha_hash: hashSenha(dados.senha),
    role: dados.role === CONFIG.ROLES.ADMIN ? CONFIG.ROLES.ADMIN : CONFIG.ROLES.PROFISSIONAL,
    profissional_id: dados.profissional_id || '',
    ativo: 'true',
    criado_em: agora()
  };

  inserirRegistro(SHEETS.USUARIOS, registro);
  registrarLog('criar_usuario', tokenPayload.uid, 'Usuário criado: ' + dados.email);

  return { ok: true, data: { id: id }, msg: 'Usuário criado com sucesso.' };
}
