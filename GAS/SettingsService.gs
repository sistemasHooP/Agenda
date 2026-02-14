function settingsDefault() {
  return {
    empresa_nome: 'MinhaAgenda 2.0',
    intervalo_minutos: 0,
    permitir_encaixe: false,
    agendamentos_simultaneos_max: 1
  };
}

function settingsGet(_session) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('APP_SETTINGS_JSON');
  var cfg = parseJsonSafe(raw, null) || settingsDefault();
  return okResponse({ settings: cfg });
}

function settingsSave(payload) {
  payload = payload || {};
  var cfg = {
    empresa_nome: String(payload.empresa_nome || 'MinhaAgenda 2.0').trim(),
    intervalo_minutos: Number(payload.intervalo_minutos || 0),
    permitir_encaixe: !!payload.permitir_encaixe,
    agendamentos_simultaneos_max: Math.max(1, Number(payload.agendamentos_simultaneos_max || 1))
  };

  PropertiesService.getScriptProperties().setProperty('APP_SETTINGS_JSON', JSON.stringify(cfg));
  return okResponse({ settings: cfg, saved: true });
}
