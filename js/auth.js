/**
 * MinhaAgenda 2.0 — auth.js
 * Gerenciamento de autenticação no frontend
 */

const Auth = {
  TOKEN_KEY: 'ma2_token',
  USER_KEY: 'ma2_user',

  /**
   * Salva dados de login
   */
  saveLogin(token, usuario) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
    Store.set('usuario', usuario);
    Store.set('loggedIn', true);
  },

  /**
   * Retorna o token atual
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * Retorna os dados do usuário
   */
  getUser() {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Verifica se está logado
   */
  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  /**
   * Verifica se é admin
   */
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'ADMIN';
  },

  /**
   * Verifica se é profissional
   */
  isProfissional() {
    const user = this.getUser();
    return user && user.role === 'PROFISSIONAL';
  },

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    Store.reset();
    window.location.href = 'login.html';
  },

  /**
   * Redireciona se não estiver logado
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /**
   * Verifica token no backend
   */
  async verify() {
    if (!this.getToken()) return false;

    const result = await Api.call('verificarToken');
    if (!result.ok) {
      this.logout();
      return false;
    }
    return true;
  },

  /**
   * Faz login
   */
  async doLogin(email, senha) {
    const result = await Api.doLogin(email, senha);

    if (result.ok && result.data) {
      this.saveLogin(result.data.token, result.data.usuario);
      return { ok: true };
    }

    return { ok: false, msg: result.msg || 'Credenciais inválidas.' };
  }
};
