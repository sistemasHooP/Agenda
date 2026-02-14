/**
 * MinhaAgenda 2.0 — lembretes.js
 * Página de Lembretes (admin)
 */

const LembretesPage = {
  async render(container) {
    container.innerHTML = this._layoutHTML();
    await this._carregar();
  },

  _layoutHTML() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-white">Lembretes</h1>
        </div>

        <!-- Templates -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h2 class="text-white font-semibold mb-3">Templates Disponíveis</h2>
          <div id="templates-lista" class="space-y-2">${UI.skeleton(3)}</div>
        </div>

        <!-- Log de Lembretes -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h2 class="text-white font-semibold mb-3">Histórico de Envios</h2>
          <div id="lembretes-log" class="space-y-2">${UI.skeleton(3)}</div>
        </div>
      </div>
    `;
  },

  async _carregar() {
    const [rTemplates, rLog] = await Promise.all([
      Api.call('listarTemplatesLembrete'),
      Api.call('listarLogLembretes')
    ]);

    if (rTemplates.ok) this._renderTemplates(rTemplates.data);
    if (rLog.ok) this._renderLog(rLog.data);
  },

  _renderTemplates(templates) {
    const container = document.getElementById('templates-lista');
    if (!container) return;

    if (templates.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template disponível</p>';
      return;
    }

    container.innerHTML = templates.map(t => `
      <div class="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
        <div class="flex items-center justify-between mb-2">
          <span class="text-white font-medium text-sm capitalize">${UI.escapeHtml(t.nome)}</span>
          <button onclick="LembretesPage.previewTemplate('${t.id}')" class="text-blue-400 text-xs hover:underline">Ver preview</button>
        </div>
        <p class="text-gray-500 text-xs line-clamp-2">${UI.escapeHtml(t.texto.substring(0, 100))}...</p>
      </div>
    `).join('');
  },

  _renderLog(logs) {
    const container = document.getElementById('lembretes-log');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-sm">Nenhum lembrete enviado ainda</p>';
      return;
    }

    container.innerHTML = `
      <div class="divide-y divide-gray-700/50 max-h-80 overflow-y-auto">
        ${logs.map(l => `
          <div class="py-2 flex items-center justify-between">
            <div>
              <span class="text-gray-300 text-sm">${UI.escapeHtml(l.canal || '')}</span>
              <span class="text-gray-500 text-xs ml-2">${UI.formatarDataHora(l.criado_em)}</span>
            </div>
            <span class="text-gray-500 text-xs truncate max-w-[200px]">${UI.escapeHtml((l.mensagem || '').substring(0, 50))}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  previewTemplate(templateId) {
    const content = `
      <div class="space-y-4">
        <p class="text-gray-400 text-sm">Preview com dados de exemplo:</p>
        <div id="template-preview-text" class="bg-gray-900 rounded-xl p-4 text-gray-300 text-sm whitespace-pre-wrap">${UI.loader()}</div>
      </div>
    `;

    UI.modal({ title: 'Preview do Template', content, size: 'md' });

    // Gerar mensagem com placeholders de exemplo
    Api.call('gerarMensagemLembrete', {
      template: templateId,
      placeholders: {
        cliente_nome: 'Maria Silva',
        servico_nome: 'Limpeza de Pele',
        data: '15/01/2026',
        hora: '14:00',
        profissional_nome: 'Ana Paula',
        valor: '150.00'
      }
    }).then(r => {
      const el = document.getElementById('template-preview-text');
      if (el) {
        el.textContent = r.ok ? r.data.mensagem : 'Erro ao gerar preview';
      }
    });
  }
};
