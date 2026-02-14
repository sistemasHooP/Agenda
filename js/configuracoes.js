/**
 * MinhaAgenda 2.0 — configuracoes.js
 * Configurações gerais do sistema (admin)
 */

const ConfiguracoesPage = {
  async render(container) {
    container.innerHTML = this._layout();
    await this._carregar();
    this._bind();
  },

  _layout() {
    return `
      <div class="space-y-4">
        <h1 class="text-xl font-bold text-white">Configurações</h1>
        <form id="form-config" class="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Nome da empresa</label>
              <input id="cfg-empresa" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">WhatsApp da empresa</label>
              <input id="cfg-whats" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" placeholder="5584999999999">
            </div>
          </div>

          <div class="grid sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Hora início da agenda</label>
              <input type="number" min="0" max="23" id="cfg-hora-inicio" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Hora fim da agenda</label>
              <input type="number" min="1" max="24" id="cfg-hora-fim" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Intervalo</label>
              <select id="cfg-intervalo" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white">
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="20">20 min</option>
                <option value="30">30 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" id="cfg-multiplos" class="rounded border-gray-600"> Permitir múltiplos agendamentos no mesmo horário
          </label>

          <div>
            <label class="block text-sm text-gray-400 mb-1">Mensagem padrão de lembrete</label>
            <textarea id="cfg-msg-lembrete" rows="3" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white"></textarea>
          </div>

          <div>
            <label class="block text-sm text-gray-400 mb-1">Mensagem rápida padrão</label>
            <textarea id="cfg-msg-rapida" rows="3" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white"></textarea>
          </div>

          <div class="flex justify-end">
            <button id="cfg-salvar" type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Salvar configurações</button>
          </div>
        </form>
      </div>
    `;
  },

  async _carregar() {
    const r = await Api.call('listarConfiguracoes');
    if (!r.ok) {
      UI.error(r.msg);
      return;
    }
    const c = r.data || {};
    document.getElementById('cfg-empresa').value = c.empresa_nome || '';
    document.getElementById('cfg-whats').value = c.whatsapp_empresa || '';
    document.getElementById('cfg-hora-inicio').value = c.agenda_hora_inicio ?? 7;
    document.getElementById('cfg-hora-fim').value = c.agenda_hora_fim ?? 21;
    document.getElementById('cfg-intervalo').value = c.agenda_intervalo_min ?? 30;
    document.getElementById('cfg-multiplos').checked = String(c.permitir_multiplos) === 'true';
    document.getElementById('cfg-msg-lembrete').value = c.mensagem_lembrete_padrao || '';
    document.getElementById('cfg-msg-rapida').value = c.mensagem_rapida_padrao || '';

    APP_CONFIG.applyRuntimeSettings(c);
  },

  _bind() {
    document.getElementById('form-config')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        empresa_nome: document.getElementById('cfg-empresa').value.trim(),
        whatsapp_empresa: document.getElementById('cfg-whats').value.trim(),
        agenda_hora_inicio: document.getElementById('cfg-hora-inicio').value,
        agenda_hora_fim: document.getElementById('cfg-hora-fim').value,
        agenda_intervalo_min: document.getElementById('cfg-intervalo').value,
        permitir_multiplos: document.getElementById('cfg-multiplos').checked,
        mensagem_lembrete_padrao: document.getElementById('cfg-msg-lembrete').value.trim(),
        mensagem_rapida_padrao: document.getElementById('cfg-msg-rapida').value.trim()
      };

      const r = await Api.call('salvarConfiguracoes', payload);
      if (!r.ok) return UI.error(r.msg);

      APP_CONFIG.applyRuntimeSettings(r.data || payload);
      UI.success('Configurações salvas com sucesso.');
    });
  }
};
