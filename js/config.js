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
