/**
 * MinhaAgenda 2.0 - Configurações globais
 *
 * Arquivo central para constantes do sistema:
 * - timezone
 * - nomes de abas do Google Sheets
 * - perfis/permissões
 * - status de agendamento
 * - chaves de propriedades e segurança
 */

var APP_CONFIG = {
  APP_NAME: 'MinhaAgenda 2.0',
  VERSION: '1.0.0',
  TIMEZONE: 'America/Recife',

  SECURITY: {
    TOKEN_TTL_MINUTES: 60 * 12,
    MAX_REQUEST_SIZE: 1024 * 256,
    DEFAULT_RATE_LIMIT_PER_MINUTE: 120,
    PASSWORD_MIN_LENGTH: 6
  },

  ROLES: {
    ADMIN: 'ADMIN',
    PROFISSIONAL: 'PROFISSIONAL'
  },

  APPOINTMENT_STATUS: {
    MARCADO: 'marcado',
    CONFIRMADO: 'confirmado',
    CONCLUIDO: 'concluido',
    CANCELADO: 'cancelado',
    FALTOU: 'faltou'
  },

  DEFAULTS: {
    SLOT_MINUTES: 15,
    DAY_START_HOUR: 7,
    DAY_END_HOUR: 21,
    LOCALE: 'pt-BR'
  },

  SHEETS: {
    USUARIOS: 'USUARIOS',
    PROFISSIONAIS: 'PROFISSIONAIS',
    CLIENTES: 'CLIENTES',
    SERVICOS: 'SERVICOS',
    AGENDAMENTOS: 'AGENDAMENTOS',
    BLOQUEIOS: 'BLOQUEIOS',
    PACOTES_MODELO: 'PACOTES_MODELO',
    PACOTES_MODELO_ITENS: 'PACOTES_MODELO_ITENS',
    PACOTES_VENDIDOS: 'PACOTES_VENDIDOS',
    PACOTES_SALDOS: 'PACOTES_SALDOS',
    PACOTES_USOS: 'PACOTES_USOS',
    LEMBRETES_LOG: 'LEMBRETES_LOG',
    LOGS: 'LOGS'
  },

  SHEET_HEADERS: {
    USUARIOS: [
      'id',
      'nome',
      'email',
      'telefone',
      'senha_hash',
      'role',
      'profissional_id',
      'ativo',
      'created_at',
      'updated_at'
    ],
    PROFISSIONAIS: [
      'id',
      'nome',
      'telefone',
      'email',
      'ativo',
      'created_at',
      'updated_at'
    ],
    CLIENTES: [
      'id',
      'nome',
      'telefone',
      'email',
      'data_nascimento',
      'observacoes',
      'tags',
      'ativo',
      'created_at',
      'updated_at'
    ],
    SERVICOS: [
      'id',
      'nome',
      'preco',
      'duracao_minutos',
      'cor',
      'ativo',
      'created_at',
      'updated_at'
    ],
    AGENDAMENTOS: [
      'id',
      'profissional_id',
      'cliente_id',
      'servico_id',
      'pacote_vendido_id',
      'pacote_item_nome',
      'inicio_iso',
      'fim_iso',
      'status',
      'observacoes',
      'tags',
      'valor',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at'
    ],
    BLOQUEIOS: [
      'id',
      'profissional_id',
      'inicio_iso',
      'fim_iso',
      'motivo',
      'created_by',
      'created_at',
      'updated_at'
    ],
    PACOTES_MODELO: [
      'id',
      'nome',
      'descricao',
      'preco',
      'ativo',
      'created_at',
      'updated_at'
    ],
    PACOTES_MODELO_ITENS: [
      'id',
      'pacote_modelo_id',
      'servico_id',
      'servico_nome',
      'quantidade',
      'created_at',
      'updated_at'
    ],
    PACOTES_VENDIDOS: [
      'id',
      'pacote_modelo_id',
      'cliente_id',
      'valor_vendido',
      'status',
      'data_venda_iso',
      'observacoes',
      'created_by',
      'created_at',
      'updated_at'
    ],
    PACOTES_SALDOS: [
      'id',
      'pacote_vendido_id',
      'servico_id',
      'servico_nome',
      'quantidade_total',
      'quantidade_usada',
      'quantidade_saldo',
      'updated_at'
    ],
    PACOTES_USOS: [
      'id',
      'pacote_vendido_id',
      'agendamento_id',
      'servico_id',
      'servico_nome',
      'profissional_id',
      'data_uso_iso',
      'observacoes',
      'created_by',
      'created_at'
    ],
    LEMBRETES_LOG: [
      'id',
      'agendamento_id',
      'cliente_id',
      'telefone_destino',
      'mensagem',
      'template_nome',
      'enviado_por',
      'canal',
      'link_wa',
      'created_at'
    ],
    LOGS: [
      'id',
      'nivel',
      'acao',
      'detalhes_json',
      'usuario_id',
      'created_at'
    ]
  },

  PROPERTY_KEYS: {
    SESSION_PREFIX: 'SESSION_',
    RATE_LIMIT_PREFIX: 'RATE_',
    APP_SECRET: 'APP_SECRET',
    SHEET_ID: 'SHEET_ID',
    INITIALIZED: 'APP_INITIALIZED'
  }
};

/**
 * Retorna um Date formatado em ISO (UTC) para armazenamento padronizado.
 * @param {Date|string|number} dateInput
 * @return {string}
 */
function toIsoUtc(dateInput) {
  var dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return Utilities.formatDate(dateObj, 'Etc/UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/**
 * Retorna timestamp local no timezone do sistema para logs legíveis.
 * @return {string}
 */
function nowLocalString() {
  return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Lista os status válidos de agendamento.
 * @return {string[]}
 */
function getAppointmentStatuses() {
  return [
    APP_CONFIG.APPOINTMENT_STATUS.MARCADO,
    APP_CONFIG.APPOINTMENT_STATUS.CONFIRMADO,
    APP_CONFIG.APPOINTMENT_STATUS.CONCLUIDO,
    APP_CONFIG.APPOINTMENT_STATUS.CANCELADO,
    APP_CONFIG.APPOINTMENT_STATUS.FALTOU
  ];
}

/**
 * Verifica se um role é válido.
 * @param {string} role
 * @return {boolean}
 */
function isValidRole(role) {
  return role === APP_CONFIG.ROLES.ADMIN || role === APP_CONFIG.ROLES.PROFISSIONAL;
}
