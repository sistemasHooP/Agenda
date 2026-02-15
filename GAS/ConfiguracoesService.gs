/**
 * MinhaAgenda 2.0 — ConfiguracoesService.gs
 * Configurações operacionais do sistema
 */

var CONFIG_DEFAULTS = {
  empresa_nome: 'MinhaAgenda',
  agenda_hora_inicio: 7,
  agenda_hora_fim: 21,
  agenda_intervalo_min: 30,
  permitir_multiplos: 'false',
  whatsapp_empresa: '',
  mensagem_lembrete_padrao: '',
  mensagem_rapida_padrao: ''
};

function getConfiguracoesSistema() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('MA2_SETTINGS');
  if (!raw) return CONFIG_DEFAULTS;

  var parsed = parseJSON(raw);
  if (!parsed || typeof parsed !== 'object') return CONFIG_DEFAULTS;

  return {
    empresa_nome: parsed.empresa_nome || CONFIG_DEFAULTS.empresa_nome,
    agenda_hora_inicio: parseInt(parsed.agenda_hora_inicio, 10) || CONFIG_DEFAULTS.agenda_hora_inicio,
    agenda_hora_fim: parseInt(parsed.agenda_hora_fim, 10) || CONFIG_DEFAULTS.agenda_hora_fim,
    agenda_intervalo_min: parseInt(parsed.agenda_intervalo_min, 10) || CONFIG_DEFAULTS.agenda_intervalo_min,
    permitir_multiplos: String(parsed.permitir_multiplos || CONFIG_DEFAULTS.permitir_multiplos),
    whatsapp_empresa: parsed.whatsapp_empresa || '',
    mensagem_lembrete_padrao: parsed.mensagem_lembrete_padrao || '',
    mensagem_rapida_padrao: parsed.mensagem_rapida_padrao || ''
  };
}

function listarConfiguracoes(tokenPayload) {
  exigirAutenticado(tokenPayload);
  return { ok: true, data: getConfiguracoesSistema() };
}

function salvarConfiguracoes(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var horaInicio = parseInt(dados.agenda_hora_inicio, 10);
  var horaFim = parseInt(dados.agenda_hora_fim, 10);
  var intervalo = parseInt(dados.agenda_intervalo_min, 10);

  if (isNaN(horaInicio) || horaInicio < 0 || horaInicio > 23) {
    return { ok: false, msg: 'Hora inicial inválida.' };
  }
  if (isNaN(horaFim) || horaFim < 1 || horaFim > 24 || horaFim <= horaInicio) {
    return { ok: false, msg: 'Hora final inválida.' };
  }
  if (isNaN(intervalo) || [5, 10, 15, 20, 30, 60].indexOf(intervalo) < 0) {
    return { ok: false, msg: 'Intervalo inválido.' };
  }

  var novo = {
    empresa_nome: sanitizar(String(dados.empresa_nome || '').substring(0, 80)) || CONFIG_DEFAULTS.empresa_nome,
    agenda_hora_inicio: horaInicio,
    agenda_hora_fim: horaFim,
    agenda_intervalo_min: intervalo,
    permitir_multiplos: String(dados.permitir_multiplos) === 'true' ? 'true' : 'false',
    whatsapp_empresa: sanitizar(String(dados.whatsapp_empresa || '').substring(0, 20)),
    mensagem_lembrete_padrao: sanitizar(String(dados.mensagem_lembrete_padrao || '').substring(0, 1000)),
    mensagem_rapida_padrao: sanitizar(String(dados.mensagem_rapida_padrao || '').substring(0, 1000))
  };

  PropertiesService.getScriptProperties().setProperty('MA2_SETTINGS', JSON.stringify(novo));
  registrarLog('salvar_configuracoes', tokenPayload.uid, 'Configurações atualizadas');

  return { ok: true, data: novo, msg: 'Configurações salvas.' };
}
