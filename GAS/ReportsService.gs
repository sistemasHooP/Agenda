function reportsSummary(payload) {
  payload = payload || {};
  var startIso = payload.start_iso;
  var endIso = payload.end_iso;

  var ag = listRows('AGENDAMENTOS').filter(function (a) {
    if (!a.inicio_iso) return false;
    var ok = true;
    if (startIso) ok = ok && new Date(a.inicio_iso) >= new Date(startIso);
    if (endIso) ok = ok && new Date(a.inicio_iso) <= new Date(endIso);
    return ok;
  });

  var total = ag.length;
  var concluido = ag.filter(function (a) { return a.status === APP_CONFIG.APPOINTMENT_STATUS.CONCLUIDO; }).length;
  var cancelado = ag.filter(function (a) { return a.status === APP_CONFIG.APPOINTMENT_STATUS.CANCELADO; }).length;
  var faturamentoEstimado = ag.reduce(function (acc, a) { return acc + Number(a.valor || 0); }, 0);
  var faturamentoReal = ag.filter(function (a) { return a.status === APP_CONFIG.APPOINTMENT_STATUS.CONCLUIDO; })
    .reduce(function (acc, a) { return acc + Number(a.valor || 0); }, 0);

  return okResponse({
    kpis: {
      total_agendamentos: total,
      concluidos: concluido,
      cancelados: cancelado,
      ocupacao_percent: total ? Math.round((concluido / total) * 100) : 0,
      faturamento_estimado: faturamentoEstimado,
      faturamento_real: faturamentoReal
    }
  });
}
