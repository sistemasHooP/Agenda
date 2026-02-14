/**
 * MinhaAgenda 2.0 — Config.gs
 * Configurações globais do sistema
 */

// ─── CONFIGURAÇÕES DO SISTEMA ────────────────────────────────────────────────

var CONFIG = {
  // Timezone padrão
  TIMEZONE: 'America/Recife',

  // Versão da API
  VERSION: '2.0.0',

  // Chave secreta para assinatura HMAC de tokens (TROCAR EM PRODUÇÃO!)
  TOKEN_SECRET: 'MA2_SECRET_KEY_CHANGE_IN_PRODUCTION_2024',

  // Expiração do token em milissegundos (24 horas)
  TOKEN_EXPIRATION_MS: 24 * 60 * 60 * 1000,

  // Rate limit: máximo de tentativas por janela
  RATE_LIMIT_MAX_ATTEMPTS: 10,
  RATE_LIMIT_WINDOW_SECONDS: 60,

  // Cache TTL em segundos
  CACHE_TTL_LISTAS: 300,       // 5 min para listas estáveis
  CACHE_TTL_AGENDA: 120,       // 2 min para agenda
  CACHE_TTL_TOKEN: 300,        // 5 min para tokens verificados

  // Lock timeout em ms
  LOCK_TIMEOUT_MS: 10000,

  // Logs: retenção em dias
  LOGS_RETENTION_DAYS: 90,

  // Horários da agenda
  AGENDA_HORA_INICIO: 7,
  AGENDA_HORA_FIM: 21,
  AGENDA_INTERVALO_MIN: 30,

  // Roles
  ROLES: {
    ADMIN: 'ADMIN',
    PROFISSIONAL: 'PROFISSIONAL'
  }
};

// ─── NOMES DAS ABAS DO GOOGLE SHEETS ─────────────────────────────────────────

var SHEETS = {
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
};

// ─── CABEÇALHOS DAS ABAS (ordem das colunas) ─────────────────────────────────

var HEADERS = {
  USUARIOS: ['id', 'nome', 'email', 'senha_hash', 'role', 'profissional_id', 'ativo', 'criado_em'],
  PROFISSIONAIS: ['id', 'nome', 'cor', 'ativo'],
  CLIENTES: ['id', 'nome', 'telefone', 'email', 'obs', 'tags', 'criado_em'],
  SERVICOS: ['id', 'nome', 'preco', 'duracao_min', 'cor', 'ativo'],
  AGENDAMENTOS: ['id', 'semana_key', 'dia_key', 'profissional_id', 'cliente_id', 'servico_id',
    'pacote_vendido_id', 'pacote_servico_id', 'inicio_iso', 'fim_iso',
    'status', 'obs', 'tags', 'criado_por', 'criado_em', 'atualizado_em'],
  BLOQUEIOS: ['id', 'semana_key', 'profissional_id', 'inicio_iso', 'fim_iso',
    'motivo', 'criado_por', 'criado_em'],
  PACOTES_MODELO: ['id', 'nome', 'descricao', 'ativo'],
  PACOTES_MODELO_ITENS: ['id', 'pacote_modelo_id', 'servico_id', 'quantidade'],
  PACOTES_VENDIDOS: ['id', 'cliente_id', 'pacote_modelo_id', 'data_venda', 'valor_bruto', 'desconto_tipo', 'desconto_valor', 'desconto_percent', 'valor_total', 'obs'],
  PACOTES_SALDOS: ['id', 'pacote_vendido_id', 'servico_id', 'qtd_total', 'qtd_usada'],
  PACOTES_USOS: ['id', 'pacote_vendido_id', 'agendamento_id', 'servico_id', 'qtd', 'data_uso_iso'],
  LEMBRETES_LOG: ['id', 'agendamento_id', 'enviado_por', 'canal', 'mensagem', 'criado_em'],
  LOGS: ['id', 'acao', 'user_id', 'detalhe', 'criado_em']
};

// ─── STATUS DE AGENDAMENTO ────────────────────────────────────────────────────

var STATUS_AGENDAMENTO = {
  MARCADO: 'marcado',
  CONFIRMADO: 'confirmado',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
  FALTOU: 'faltou'
};

// ─── TAGS PADRÃO ──────────────────────────────────────────────────────────────

var TAGS_PADRAO = ['RETORNO', 'PAGO', 'A_RECEBER', 'CORTESIA', 'URGENTE'];
