export const state = {
  route: 'agendamentos',
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  agendamentos: [],
  clientes: [],
  servicos: [],
  report: null
};
