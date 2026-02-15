/**
 * MinhaAgenda 2.0 — config.js
 * Configurações do frontend
 */

const APP_CONFIG = {
  // URL da API GAS — TROCAR após deploy do Web App
  API_URL: 'https://script.google.com/macros/s/AKfycbxmu37XOcW73-wl30SN3ixKm4TOvr8WIOWHP51s30bihCTR3By1D_dIGFfAKuh8FPHp/exec',

  // Timezone
  TIMEZONE: 'America/Recife',

  // Versão
  VERSION: '2.0.0',

  // Horários da agenda
  HORA_INICIO: 7,
  HORA_FIM: 21,
  INTERVALO_MIN: 30,

  // Status de agendamento
  STATUS: {
    MARCADO: 'marcado',
    CONFIRMADO: 'confirmado',
    CONCLUIDO: 'concluido',
    CANCELADO: 'cancelado',
    FALTOU: 'faltou'
  },

  // Cores dos status
  STATUS_CORES: {
    marcado: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500', dot: 'bg-blue-500' },
    confirmado: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500', dot: 'bg-emerald-500' },
    concluido: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500', dot: 'bg-gray-500' },
    cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500', dot: 'bg-red-500' },
    faltou: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500', dot: 'bg-amber-500' }
  },

  // Tags padrão
  TAGS: ['RETORNO', 'PAGO', 'A_RECEBER', 'CORTESIA', 'URGENTE'],

  // Dias da semana
  DIAS_SEMANA: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  DIAS_SEMANA_FULL: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],

  // Paleta de cores para serviços/profissionais
  PALETA_CORES: [
    '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
    '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#6366F1',
    '#A855F7', '#D946EF', '#F43F5E', '#FB923C', '#84CC16'
  ]
};


APP_CONFIG.applyRuntimeSettings = function(settings = {}) {
  if (settings.agenda_hora_inicio !== undefined) this.HORA_INICIO = parseInt(settings.agenda_hora_inicio, 10) || this.HORA_INICIO;
  if (settings.agenda_hora_fim !== undefined) this.HORA_FIM = parseInt(settings.agenda_hora_fim, 10) || this.HORA_FIM;
  if (settings.agenda_intervalo_min !== undefined) this.INTERVALO_MIN = parseInt(settings.agenda_intervalo_min, 10) || this.INTERVALO_MIN;
  this.PERMITIR_MULTIPLOS = String(settings.permitir_multiplos || 'false') === 'true';
  this.EMPRESA_NOME = settings.empresa_nome || 'MinhaAgenda';
  this.WHATSAPP_EMPRESA = settings.whatsapp_empresa || '';
  this.MSG_LEMBRETE_PADRAO = settings.mensagem_lembrete_padrao || '';
  this.MSG_RAPIDA_PADRAO = settings.mensagem_rapida_padrao || '';
};

APP_CONFIG.applyRuntimeSettings();
