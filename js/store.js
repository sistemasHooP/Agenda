/**
 * MinhaAgenda 2.0 — store.js
 * Estado global reativo e cache local
 */

const Store = {
  _state: {
    loggedIn: false,
    usuario: null,
    paginaAtual: 'agenda',

    // Dados carregados
    profissionais: [],
    servicos: [],
    clientes: [],

    // Agenda
    semanaKey: '',
    datas: [],
    agendamentos: [],
    bloqueios: [],
    visao: 'semana', // 'semana' | 'dia'
    diaAtual: '',
    profissionalFiltro: 'all',

    // Loading states
    loading: {},

    // Cache timestamps
    _cacheTs: {}
  },

  _listeners: [],

  /**
   * Obter valor
   */
  get(key) {
    return this._state[key];
  },

  /**
   * Definir valor e notificar listeners
   */
  set(key, value) {
    this._state[key] = value;
    this._notify(key);
  },

  /**
   * Definir múltiplos valores
   */
  setMultiple(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        this._state[key] = obj[key];
      }
    }
    this._notify('*');
  },

  /**
   * Resetar estado
   */
  reset() {
    const defaults = {
      loggedIn: false,
      usuario: null,
      paginaAtual: 'agenda',
      profissionais: [],
      servicos: [],
      clientes: [],
      semanaKey: '',
      datas: [],
      agendamentos: [],
      bloqueios: [],
      visao: 'semana',
      diaAtual: '',
      profissionalFiltro: 'all',
      loading: {},
      _cacheTs: {}
    };
    this._state = defaults;
  },

  /**
   * Registrar listener
   */
  on(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  },

  _notify(key) {
    this._listeners.forEach(fn => {
      try { fn(key, this._state); } catch (e) { console.error('Store listener error:', e); }
    });
  },

  /**
   * Loading helpers
   */
  setLoading(key, value) {
    const loading = { ...this._state.loading };
    loading[key] = value;
    this.set('loading', loading);
  },

  isLoading(key) {
    return !!this._state.loading[key];
  },

  /**
   * Cache helper: verifica se precisa recarregar (TTL em ms)
   */
  needsRefresh(key, ttlMs = 300000) {
    const ts = this._state._cacheTs[key];
    if (!ts) return true;
    return Date.now() - ts > ttlMs;
  },

  markRefreshed(key) {
    this._state._cacheTs[key] = Date.now();
  }
};
