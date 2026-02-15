/**
 * MinhaAgenda 2.0 — router.js
 * Roteamento SPA (single page application)
 */

const Router = {
  _routes: {},
  _currentPage: null,

  /**
   * Registrar rota
   */
  register(name, renderFn) {
    this._routes[name] = renderFn;
  },

  /**
   * Navegar para uma página
   */
  navigate(page) {
    if (!this._routes[page]) {
      console.warn('Página não encontrada:', page);
      page = 'agenda';
    }

    // Verificar permissão (páginas admin)
    const adminPages = ['profissionais', 'relatorios', 'lembretes', 'configuracoes', 'admin'];
    if (adminPages.includes(page) && !Auth.isAdmin()) {
      UI.warning('Acesso restrito a administradores.');
      page = 'agenda';
    }

    this._currentPage = page;
    Store.set('paginaAtual', page);

    // Atualizar URL (hash)
    window.location.hash = '#' + page;

    // Atualizar nav ativa
    this._updateNav(page);

    // Renderizar página
    const container = document.getElementById('page-content');
    if (container) {
      container.innerHTML = UI.loader();
      try {
        this._routes[page](container);
      } catch (e) {
        console.error('Erro ao renderizar página:', e);
        container.innerHTML = `<div class="p-8 text-center text-red-400">Erro ao carregar página: ${UI.escapeHtml(e.message)}</div>`;
      }
    }
  },

  /**
   * Atualiza highlight da nav
   */
  _updateNav(page) {
    // Bottom nav (mobile)
    document.querySelectorAll('[data-nav]').forEach(el => {
      const isActive = el.dataset.nav === page;
      el.classList.toggle('text-blue-400', isActive);
      el.classList.toggle('text-gray-400', !isActive);
    });

    // Sidebar (desktop)
    document.querySelectorAll('[data-sidebar]').forEach(el => {
      const isActive = el.dataset.sidebar === page;
      el.classList.toggle('bg-blue-600/20', isActive);
      el.classList.toggle('text-blue-400', isActive);
      el.classList.toggle('text-gray-400', !isActive);
      el.classList.toggle('hover:bg-gray-800', !isActive);
    });
  },

  /**
   * Inicializar roteamento
   */
  init() {
    // Registrar páginas
    this.register('agenda', (c) => AgendaPage.render(c));
    this.register('clientes', (c) => ClientesPage.render(c));
    this.register('servicos', (c) => ServicosPage.render(c));
    this.register('pacotes', (c) => PacotesPage.render(c));
    this.register('profissionais', (c) => ProfissionaisPage.render(c));
    this.register('relatorios', (c) => RelatoriosPage.render(c));
    this.register('lembretes', (c) => LembretesPage.render(c));
    this.register('configuracoes', (c) => ConfiguracoesPage.render(c));

    // Listeners de navegação
    document.querySelectorAll('[data-nav], [data-sidebar]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const page = el.dataset.nav || el.dataset.sidebar;
        if (page) this.navigate(page);
      });
    });

    // Hash change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'agenda';
      if (hash !== this._currentPage) {
        this.navigate(hash);
      }
    });

    // Página inicial
    const hash = window.location.hash.replace('#', '') || 'agenda';
    this.navigate(hash);
  }
};
