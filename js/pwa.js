/**
 * MinhaAgenda 2.0 — pwa.js
 * Registro do Service Worker e instalação PWA
 */

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('SW registrado:', reg.scope);

        // Verificar atualizações
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              if (navigator.serviceWorker.controller) {
                UI.info('Nova versão disponível. Recarregue a página.');
              }
            }
          });
        });
      })
      .catch((err) => {
        console.log('Erro ao registrar SW:', err);
      });
  });
}

// Prompt de instalação PWA
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostrar botão de instalação após 5 segundos
  setTimeout(() => {
    if (deferredPrompt) {
      showInstallBanner();
    }
  }, 5000);
});

function showInstallBanner() {
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'fixed bottom-24 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-50 bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-2xl transform translate-y-full transition-transform duration-300';
  banner.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      </div>
      <div class="flex-1">
        <h3 class="text-white font-semibold text-sm">Instalar MinhaAgenda</h3>
        <p class="text-gray-400 text-xs mt-0.5">Acesse mais rápido direto da tela inicial</p>
        <div class="flex gap-2 mt-3">
          <button id="pwa-install-btn" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors">Instalar</button>
          <button id="pwa-dismiss-btn" class="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors">Agora não</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.remove('translate-y-full'));

  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('PWA install:', outcome);
      deferredPrompt = null;
    }
    banner.remove();
  });

  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    banner.classList.add('translate-y-full');
    setTimeout(() => banner.remove(), 300);
  });
}

// Detectar instalação
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  console.log('PWA instalada com sucesso!');
});
