/**
 * MinhaAgenda 2.0 — RelatoriosService.gs
 * Relatórios de agenda e pacotes (admin)
 */

// ─── RESUMO DA AGENDA ────────────────────────────────────────────────────────

function resumoAgenda(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var dataInicio = dados.data_inicio || getDiaKey();
  var dataFim = dados.data_fim || getDiaKey();
  var profissionalId = dados.profissional_id || null;

  // Buscar todos os agendamentos (sem cache para garantir dados frescos)
  var todos = listarTodos(SHEETS.AGENDAMENTOS, false);

  // Filtrar por período
  var filtrados = todos.filter(function(a) {
    var dia = String(a.dia_key);
    if (dia < dataInicio || dia > dataFim) return false;
    if (profissionalId && String(a.profissional_id) !== String(profissionalId)) return false;
    return true;
  });

  // Contadores por status
  var porStatus = {};
  var statusList = Object.values(STATUS_AGENDAMENTO);
  for (var s = 0; s < statusList.length; s++) {
    porStatus[statusList[s]] = 0;
  }

  // Contadores por profissional
  var porProfissional = {};

  // Contadores por serviço
  var porServico = {};

  // Receita estimada
  var receitaTotal = 0;
  var receitaConcluida = 0;

  var servicos = listarTodos(SHEETS.SERVICOS, true);
  var servicosMap = {};
  for (var sv = 0; sv < servicos.length; sv++) servicosMap[servicos[sv].id] = servicos[sv];

  var profissionais = listarTodos(SHEETS.PROFISSIONAIS, true);
  var profsMap = {};
  for (var p = 0; p < profissionais.length; p++) profsMap[profissionais[p].id] = profissionais[p];

  for (var i = 0; i < filtrados.length; i++) {
    var a = filtrados[i];
    var status = String(a.status);
    if (porStatus[status] !== undefined) {
      porStatus[status]++;
    }

    // Por profissional
    var profNome = profsMap[a.profissional_id] ? profsMap[a.profissional_id].nome : 'Desconhecido';
    if (!porProfissional[profNome]) porProfissional[profNome] = { total: 0, concluidos: 0 };
    porProfissional[profNome].total++;
    if (status === STATUS_AGENDAMENTO.CONCLUIDO) porProfissional[profNome].concluidos++;

    // Por serviço
    var servNome = servicosMap[a.servico_id] ? servicosMap[a.servico_id].nome : 'Desconhecido';
    if (!porServico[servNome]) porServico[servNome] = 0;
    porServico[servNome]++;

    // Receita
    var preco = servicosMap[a.servico_id] ? parseFloat(servicosMap[a.servico_id].preco) || 0 : 0;
    if (status !== STATUS_AGENDAMENTO.CANCELADO) {
      receitaTotal += preco;
    }
    if (status === STATUS_AGENDAMENTO.CONCLUIDO) {
      receitaConcluida += preco;
    }
  }

  return {
    ok: true,
    data: {
      periodo: { inicio: dataInicio, fim: dataFim },
      total_agendamentos: filtrados.length,
      por_status: porStatus,
      por_profissional: porProfissional,
      por_servico: porServico,
      receita_estimada: receitaTotal,
      receita_concluida: receitaConcluida,
      taxa_falta: filtrados.length > 0 ? ((porStatus[STATUS_AGENDAMENTO.FALTOU] / filtrados.length) * 100).toFixed(1) + '%' : '0%'
    }
  };
}

// ─── RESUMO DE PACOTES ───────────────────────────────────────────────────────

function resumoPacotes(tokenPayload, dados) {
  exigirAdmin(tokenPayload);

  var vendas = listarTodos(SHEETS.PACOTES_VENDIDOS, false);
  var saldos = listarTodos(SHEETS.PACOTES_SALDOS, false);
  var usos = listarTodos(SHEETS.PACOTES_USOS, false);
  var modelos = listarTodos(SHEETS.PACOTES_MODELO, true);
  var servicos = listarTodos(SHEETS.SERVICOS, true);

  var servicosMap = {};
  for (var s = 0; s < servicos.length; s++) servicosMap[servicos[s].id] = servicos[s];
  var modelosMap = {};
  for (var m = 0; m < modelos.length; m++) modelosMap[modelos[m].id] = modelos[m];

  // Filtrar por período se informado
  if (dados && dados.data_inicio) {
    vendas = vendas.filter(function(v) {
      var dv = String(v.data_venda).substring(0, 10);
      if (dados.data_inicio && dv < dados.data_inicio) return false;
      if (dados.data_fim && dv > dados.data_fim) return false;
      return true;
    });
  }

  var receitaTotalPacotes = 0;
  for (var i = 0; i < vendas.length; i++) {
    receitaTotalPacotes += parseFloat(vendas[i].valor_total) || 0;
  }

  // Saldos agregados
  var totalCreditos = 0;
  var totalUsados = 0;
  var porServico = {};

  for (var j = 0; j < saldos.length; j++) {
    var qtdTotal = parseInt(saldos[j].qtd_total, 10) || 0;
    var qtdUsada = parseInt(saldos[j].qtd_usada, 10) || 0;
    totalCreditos += qtdTotal;
    totalUsados += qtdUsada;

    var sn = servicosMap[saldos[j].servico_id] ? servicosMap[saldos[j].servico_id].nome : 'Desconhecido';
    if (!porServico[sn]) porServico[sn] = { total: 0, usado: 0 };
    porServico[sn].total += qtdTotal;
    porServico[sn].usado += qtdUsada;
  }

  // Pacotes por modelo
  var porModelo = {};
  for (var k = 0; k < vendas.length; k++) {
    var mn = modelosMap[vendas[k].pacote_modelo_id] ? modelosMap[vendas[k].pacote_modelo_id].nome : 'Desconhecido';
    if (!porModelo[mn]) porModelo[mn] = 0;
    porModelo[mn]++;
  }

  return {
    ok: true,
    data: {
      total_vendas: vendas.length,
      receita_pacotes: receitaTotalPacotes,
      total_creditos: totalCreditos,
      total_usados: totalUsados,
      total_pendentes: totalCreditos - totalUsados,
      por_servico: porServico,
      por_modelo: porModelo,
      total_usos: usos.length
    }
  };
}
