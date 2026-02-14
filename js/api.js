/**
 * MinhaAgenda 2.0 — api.js
 * Fetch wrapper com retentativas, token e Content-Type: text/plain
 */

const Api = {
  /**
   * Chamada POST à API GAS
   * Usa Content-Type: text/plain para evitar preflight CORS
   */
  async call(action, dados = {}, options = {}) {
    const token = Auth.getToken();
    const payload = {
      action,
      token: token || '',
      dados
    };

    const maxRetries = options.retries || 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

        const response = await fetch(APP_CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (e) {
          throw new Error('Resposta inválida do servidor.');
        }

        // Token expirado → redirect login
        if (result.code === 401 && action !== 'login') {
          Auth.logout();
          return result;
        }

        return result;

      } catch (error) {
        lastError = error;
        if (error.name === 'AbortError') {
          lastError = new Error('Tempo limite excedido.');
        }

        // Retry com backoff
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    return {
      ok: false,
      msg: lastError ? lastError.message : 'Erro de conexão.',
      data: null
    };
  },

  // ─── Atalhos ────────────────────────────────────────────────────────

  async ping() {
    return this.call('ping');
  },

  async login(email, senha) {
    return this.call('login', {}, { retries: 1 }).then(() => {
      // O login é tratado direto no payload
    });
  },

  // Método especial para login (campos no nível raiz)
  async doLogin(email, senha) {
    const payload = { action: 'login', email, senha };

    try {
      const response = await fetch(APP_CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      return JSON.parse(text);
    } catch (error) {
      return { ok: false, msg: 'Erro de conexão: ' + error.message };
    }
  }
};
