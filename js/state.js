export const state = {
  route: 'agendamentos',
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  agendamentos: [],
  clientes: [],
  servicos: [],
  profissionais: [],
  report: null,
  settings: {
    empresa_nome: 'MinhaAgenda 2.0',
    intervalo_minutos: 0,
    permitir_encaixe: false,
    agendamentos_simultaneos_max: 1
  },
  agenda_profissional_id: localStorage.getItem('agenda_profissional_id') || ''
};
