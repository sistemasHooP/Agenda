/**
 * MinhaAgenda 2.0 — BloqueiosService.gs
 * Bloqueios de horários
 */

function listarBloqueios(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var semanaKey = dados.semana_key || getSemanaKey();
  var profId = null;

  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL) {
    profId = tokenPayload.pid;
  } else if (dados.profissional_id) {
    profId = dados.profissional_id;
  }

  var bloqueios = buscarBloqueiosSemana(semanaKey, profId);
  return { ok: true, data: bloqueios };
}

function criarBloqueio(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  var faltando = validarCamposObrigatorios(dados, ['profissional_id', 'inicio_iso', 'fim_iso']);
  if (faltando.length > 0) {
    return { ok: false, msg: 'Campos obrigatórios: ' + faltando.join(', ') };
  }

  // RBAC: profissional só bloqueia seu próprio horário
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(dados.profissional_id)) {
    return { ok: false, msg: 'Você só pode bloquear seus próprios horários.' };
  }

  var inicio = new Date(dados.inicio_iso);
  var fim = new Date(dados.fim_iso);
  if (fim <= inicio) {
    return { ok: false, msg: 'Horário final deve ser após o inicial.' };
  }

  // Verificar se há agendamentos no período
  var semanaKey = calcSemanaKey(dados.inicio_iso);
  var agendamentos = buscarAgendaSemana(semanaKey, dados.profissional_id);
  for (var i = 0; i < agendamentos.length; i++) {
    var a = agendamentos[i];
    if (String(a.status) === STATUS_AGENDAMENTO.CANCELADO) continue;
    if (temConflito(dados.inicio_iso, dados.fim_iso, a.inicio_iso, a.fim_iso)) {
      return {
        ok: false,
        msg: 'Existe um agendamento neste período. Cancele-o primeiro.',
        data: { agendamento: a }
      };
    }
  }

  var id = gerarId();
  var registro = {
    id: id,
    semana_key: semanaKey,
    profissional_id: dados.profissional_id,
    inicio_iso: dados.inicio_iso,
    fim_iso: dados.fim_iso,
    motivo: dados.motivo ? sanitizar(String(dados.motivo).substring(0, 200)) : '',
    criado_por: tokenPayload.uid,
    criado_em: agora()
  };

  inserirRegistro(SHEETS.BLOQUEIOS, registro);
  invalidarCacheAgenda(semanaKey, dados.profissional_id);
  registrarLog('criar_bloqueio', tokenPayload.uid, 'Bloqueio: ' + id);

  return { ok: true, data: { id: id }, msg: 'Bloqueio criado.' };
}

function removerBloqueio(tokenPayload, dados) {
  exigirAutenticado(tokenPayload);

  if (!dados.id) return { ok: false, msg: 'ID é obrigatório.' };

  var bloqueio = buscarPorId(SHEETS.BLOQUEIOS, dados.id);
  if (!bloqueio) return { ok: false, msg: 'Bloqueio não encontrado.' };

  // RBAC
  if (tokenPayload.role === CONFIG.ROLES.PROFISSIONAL && String(tokenPayload.pid) !== String(bloqueio.profissional_id)) {
    return { ok: false, msg: 'Sem permissão.' };
  }

  removerRegistro(SHEETS.BLOQUEIOS, dados.id);
  invalidarCacheAgenda(bloqueio.semana_key, bloqueio.profissional_id);
  registrarLog('remover_bloqueio', tokenPayload.uid, 'ID: ' + dados.id);

  return { ok: true, msg: 'Bloqueio removido.' };
}
