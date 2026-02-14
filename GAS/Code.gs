function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'health';
  return jsonOutput(routeAction(action, null, null));
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    if (raw.length > APP_CONFIG.SECURITY.MAX_REQUEST_SIZE) throw new Error('Payload muito grande');
    var req = JSON.parse(raw);
    var action = req.action;
    var token = req.token || '';
    var payload = req.payload || {};
    return jsonOutput(routeAction(action, token, payload));
  } catch (err) {
    logEvent('ERROR', 'doPost', { message: String(err) }, null);
    return jsonOutput(failResponse('Erro na requisição: ' + err.message));
  }
}

function routeAction(action, token, payload) {
  try {
    if (!action || action === 'health') {
      return okResponse({
        app: APP_CONFIG.APP_NAME,
        version: APP_CONFIG.VERSION,
        tz: APP_CONFIG.TIMEZONE,
        now: nowLocalString()
      });
    }

    if (action === 'setup.init') return handleSetupInit(payload);
    if (action === 'auth.login') return authLogin(payload);
    if (action === 'auth.me') return authMe(token);
    if (action === 'auth.logout') return authLogout(token);

    var session = mustGetSession(token);

    if (action === 'users.list') return adminOnly(session, function () { return usersList(); });
    if (action === 'clients.list') return clientsList(session, payload);
    if (action === 'clients.save') return clientsSave(session, payload);

    if (action === 'services.list') return servicesList();
    if (action === 'services.save') return adminOnly(session, function () { return servicesSave(payload); });

    if (action === 'professionals.list') return professionalsList(session);
    if (action === 'professionals.save') return adminOnly(session, function () { return professionalsSave(payload); });

    if (action === 'schedule.list') return scheduleList(session, payload);
    if (action === 'schedule.save') return scheduleSave(session, payload);
    if (action === 'schedule.cancel') return scheduleCancel(session, payload);

    if (action === 'blocks.list') return blocksList(session, payload);
    if (action === 'blocks.save') return blocksSave(session, payload);

    if (action === 'settings.get') return settingsGet(session);
    if (action === 'settings.save') return adminOnly(session, function () { return settingsSave(payload); });

    if (action === 'reports.summary') return adminOnly(session, function () { return reportsSummary(payload); });

    return failResponse('Ação inválida: ' + action);
  } catch (err) {
    return failResponse(err.message || String(err));
  }
}
