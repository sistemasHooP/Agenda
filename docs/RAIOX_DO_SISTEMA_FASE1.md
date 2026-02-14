# RAIO-X DO SISTEMA — FASE 1

## A) Visão geral da arquitetura (frontend ↔ backend ↔ dados)

- **Frontend (GitHub Pages, SPA):** `index.html` carrega scripts JS modulares, mantém estado global em `Store`, autentica com token salvo no `localStorage` e navega por hash (`#agenda`, `#clientes`, etc.).
- **Tela de login separada:** `login.html` chama login no backend e grava token/usuário no browser.
- **Backend (Google Apps Script):** `doPost` roteia ações por `action`; `doGet` responde healthcheck e setup inicial.
- **Banco de dados:** Google Sheets (abas lógicas para usuários, clientes, serviços, agendamentos, bloqueios, pacotes, logs).
- **Infra de apoio no GAS:** CacheService (cache de listas e agenda), LockService (escritas), Logger/aba LOGS (auditoria), utilitários de validação/sanitização.

Fluxo macro:
1. Usuário loga (email/senha) → backend valida hash e devolve token HMAC.
2. Front envia `action + token + dados` para GAS.
3. GAS valida token e RBAC (admin/profissional), executa service correspondente e lê/escreve no Sheets.
4. Front renderiza telas (agenda, clientes, serviços, pacotes, etc.).

## B) Estrutura de pastas e arquivos por responsabilidade

### Raiz (frontend)
- `index.html`: shell principal, menu desktop/mobile, boot da SPA.
- `login.html`: autenticação inicial.
- `css/style.css`: estilos complementares ao Tailwind CDN.
- `js/config.js`: URL da API, timezone, horários, status e paleta.
- `js/store.js`: estado global + TTL de cache no cliente.
- `js/ui.js`: toasts, modal, helpers de data/hora, slots da agenda.
- `js/api.js`: wrapper de fetch, retry/backoff, timeout, envio `text/plain`.
- `js/auth.js`: sessão (token/user), login/logout e guard de rota.
- `js/router.js`: roteamento SPA por hash com bloqueio de páginas admin.
- `js/agenda.js`: visão semanal/diária, criação/cancelamento/status de agendamento, bloqueios, lembretes.
- `js/clientes.js`: CRUD de clientes + importação CSV/XLSX.
- `js/servicos.js`: CRUD de serviços.
- `js/pacotes.js`: modelos de pacote, venda, consulta de saldos e extrato.
- `js/profissionais.js`: CRUD de profissionais + criação de login do profissional.
- `js/relatorios.js`: dashboards de agenda e pacotes (admin).
- `js/lembretes.js`: templates e histórico de envios.
- `js/pwa.js`: registro de service worker + banner de instalação.
- `sw.js`: cache estático/offline da PWA.
- `manifest.webmanifest`: metadados PWA.

### Pasta `GAS/` (backend Apps Script)
- `Code.gs`: `doGet`, `doPost` e roteamento de ações.
- `Config.gs`: constantes globais (timezone, segredo token, TTLs, roles, headers das abas).
- `Database.gs`: camada de persistência no Sheets, cache e lock de concorrência.
- `Utils.gs`: jsonOk/jsonErro, datas, validações, sanitização, rate-limit, logs.
- `Auth.gs`: hash de senha, token HMAC, login, RBAC, criação de usuário.
- `ProfissionaisService.gs`: CRUD de profissionais.
- `ClientesService.gs`: listar/pesquisar/criar/atualizar/importar clientes.
- `ServicosService.gs`: CRUD de serviços.
- `AgendaService.gs`: agenda semanal/diária, conflito, CRUD/status de agendamento.
- `BloqueiosService.gs`: CRUD de bloqueios de horário.
- `PacotesService.gs`: modelos, vendas, saldos, usos e extrato.
- `LembretesService.gs`: templates, geração de mensagem WhatsApp e log de envio.
- `RelatoriosService.gs`: resumos administrativos.

## C) Fluxo das principais funcionalidades de agendamento

### 1) Login e sessão
1. `login.html` coleta email/senha e chama `Auth.doLogin`.
2. Front envia `{ action:'login', email, senha }`.
3. `Auth.gs` valida credenciais na aba `USUARIOS`, gera token HMAC com expiração e retorna `usuario`.
4. Front salva token no `localStorage` e entra na SPA.

### 2) Abertura da Agenda
1. `AgendaPage.render` define `semanaKey` atual e monta layout.
2. Carrega (com TTL client-side) profissionais e serviços.
3. Busca agenda da semana (`listarAgendaSemana`) com filtro opcional de profissional.
4. Renderiza grade semanal ou diária.

### 3) Navegação da agenda (dia/semana e datas futuras)
- Botões **prev/next/hoje** alteram `semanaKey` no estado.
- Alternância **Semana/Dia** troca a renderização sem mudar backend.
- Cálculo de semana e datas usa funções simétricas no front (`UI.getSemanaKey`, `UI.getDatasDaSemana`) e backend (`getSemanaKey`, `getDatasDaSemana`).

### 4) Criar agendamento
1. Clique em slot vazio abre modal.
2. Usuário escolhe cliente/profissional/serviço/data/hora.
3. Front chama `criarAgendamento` com `inicio_iso`.
4. Backend busca duração do serviço, calcula `fim_iso`, valida RBAC (profissional só na própria agenda), verifica conflito com agendamentos e bloqueios e grava na aba `AGENDAMENTOS`.

### 5) Alterar status / cancelar
- Front chama `marcarStatus` ou `cancelarAgendamento`.
- Backend valida permissão e atualiza status.
- Se status virar `concluido` e houver pacote vinculado, tenta baixa automática no pacote.

### 6) Bloquear horário
- Front abre modal de bloqueio e envia `criarBloqueio`.
- Backend impede bloqueio sobre período que já tenha agendamento ativo.
- Gravado em `BLOQUEIOS` e cache da agenda invalidado.

## D) Rotas/actions backend, payloads e regras

## Públicas (sem token)
- `ping`
- `login` (`email`, `senha`)

## Autenticadas (token obrigatório)
- Auth: `getMe`, `verificarToken`, `alterarSenha`, `criarUsuario`
- Profissionais: `listarProfissionais`, `criarProfissional`, `atualizarProfissional`, `ativarDesativarProfissional`
- Clientes: `listarClientes`, `pesquisarClientes`, `criarCliente`, `atualizarCliente`, `importarClientes`
- Serviços: `listarServicos`, `criarServico`, `atualizarServico`, `ativarDesativarServico`
- Agenda: `listarAgendaSemana`, `listarAgendaDia`, `criarAgendamento`, `atualizarAgendamento`, `cancelarAgendamento`, `marcarStatus`, `checarConflito`
- Bloqueios: `listarBloqueios`, `criarBloqueio`, `removerBloqueio`
- Pacotes: `listarModelosPacote`, `criarModeloPacote`, `atualizarModeloPacote`, `venderPacote`, `listarPacotesCliente`, `darBaixaPorAgendamento`, `extratoPacote`
- Lembretes: `gerarMensagemLembrete`, `listarTemplatesLembrete`, `registrarEnvioLembrete`, `listarLogLembretes`
- Relatórios: `resumoAgenda`, `resumoPacotes`

### RBAC (permissões)
- **ADMIN**: acesso total.
- **PROFISSIONAL**: acesso restrito; na agenda e bloqueios só para o próprio `profissional_id`.
- Ações administrativas (ex.: criação de usuário, importação, venda de pacote, relatórios) exigem admin.

### Validações relevantes
- Campos obrigatórios com `validarCamposObrigatorios`.
- Sanitização de texto (`sanitizar`) antes de gravar em Sheets.
- Validação de preço/duração de serviço e conflitos de agenda.
- Rate limit em login e ações sensíveis.

## E) Persistência, dependências e configurações importantes

## Onde os dados ficam
- **Google Sheets** (aba por domínio): `USUARIOS`, `PROFISSIONAIS`, `CLIENTES`, `SERVICOS`, `AGENDAMENTOS`, `BLOQUEIOS`, `PACOTES_*`, `LEMBRETES_LOG`, `LOGS`.
- **CacheService**: listas e agenda semanal com TTL curto.
- **LockService**: serialize de escrita em insert/update/delete/import.
- **LocalStorage (frontend):** token e usuário (`ma2_token`, `ma2_user`).
- **Service Worker cache:** assets estáticos do front.

## Configs sensíveis e dependências
- URL da API GAS: `js/config.js` (`APP_CONFIG.API_URL`).
- `TOKEN_SECRET` em `GAS/Config.gs` (hardcoded; precisa trocar em produção).
- Timezone em front e backend (`America/Recife`).
- Horário operacional da agenda (07:00–21:00 e intervalo 30 min) em front e backend.
- Credencial padrão de setup: `admin@agenda.com / admin123` (criada por `criarAdminPadrao`).
- Dependências externas CDN:
  - Tailwind via `cdn.tailwindcss.com`
  - Google Fonts (Inter)
  - SheetJS carregado dinamicamente na importação de clientes

## F) Pontos sensíveis / riscos para alteração

1. **Segurança de credenciais/token**
   - `TOKEN_SECRET` está no código e há usuário/senha admin padrão previsível.
2. **XSS no frontend**
   - Vários pontos usam `UI.escapeHtml`, mas também há muitos `innerHTML` dinâmicos; risco ao esquecer escape em mudanças futuras.
3. **Concorrência e consistência**
   - Escritas com lock ajudam, mas regras de negócio que fazem múltiplas operações podem gerar inconsistência parcial em falhas intermediárias.
4. **Limites do GAS/Sheets**
   - Leitura frequente de `getDataRange().getValues()` em abas grandes pode ficar lenta.
5. **Cache parcial**
   - Cache de agenda depende de TTL curto; não há invalidação por prefixo no CacheService.
6. **Sem anti-CSRF / origem estrita**
   - API depende basicamente de token no body e não valida origem/referer.
7. **Sem refresh token**
   - Sessão expira e força novo login; fluxo simples, mas UX pode sofrer.
8. **Sem testes automatizados no repositório**
   - risco maior ao evoluir funcionalidades.

## G) Melhorias sugeridas (sem alterar agora)

1. Mover `TOKEN_SECRET` e segredos para `PropertiesService` (não hardcoded).
2. Forçar troca da senha admin no primeiro login.
3. Padronizar construção de HTML para reduzir `innerHTML` em conteúdo dinâmico sensível.
4. Criar camada de validação mais forte no backend (schemas de payload por action).
5. Otimizar leitura de Sheets (filtros por intervalo/colunas, paginação real em listas grandes).
6. Melhorar observabilidade: IDs de correlação por request + logs estruturados.
7. Criar suite mínima de testes (contrato de actions e regras de conflito da agenda).
8. Centralizar tratamento de erros de rede no front com mensagens amigáveis por tipo.

## H) O que está faltando / limitações encontradas

- Não há arquivo de infraestrutura/deploy do GAS (ex.: `appsscript.json` dentro de `GAS/`) neste repositório para confirmar escopos OAuth e configuração de publicação do Web App.
- Não há documentação operacional (README preenchido, runbook, diagrama).
- Não há testes automatizados nem fixtures de dados.

