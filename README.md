# MinhaAgenda 2.0 (GAS + GitHub Pages)

Sistema completo de agenda com backend em Google Apps Script e frontend PWA estático.

## Estrutura

- `/GAS`: backend (API para Google Sheets)
- `/index.html`, `/css`, `/js`: frontend GitHub Pages
- `/manifest.json` e `/service-worker.js`: PWA

## Deploy Backend (Google Apps Script)

1. Crie uma planilha Google.
2. Abra **Extensões > Apps Script**.
3. Crie os arquivos `.gs` da pasta `/GAS`.
4. Em `Config.gs`, mantenha timezone `America/Recife`.
5. Faça deploy como **Aplicativo da Web** com acesso para quem tiver o link.
6. Copie a URL do Web App.

## Deploy Frontend (GitHub Pages)

1. No arquivo `js/config.js`, cole a URL do Web App GAS em `API_URL`.
2. Faça push do repositório.
3. Ative GitHub Pages na branch principal (root).
4. Acesse a URL publicada.

## Primeiro uso

- Na primeira abertura, o frontend chama `setup.init` e cria abas + usuário admin padrão:
  - email: `admin@agenda.local`
  - senha: `123456`
- Altere o usuário/senha no Google Sheets (aba `USUARIOS`) depois do primeiro login.

## Ações API implementadas

- `health`, `setup.init`
- `auth.login`, `auth.me`, `auth.logout`
- `users.list` (ADMIN)
- `clients.list`, `clients.save`
- `services.list`, `services.save` (ADMIN)
- `professionals.list`, `professionals.save` (ADMIN)
- `schedule.list`, `schedule.save`, `schedule.cancel`
- `blocks.list`, `blocks.save`
- `settings.get`, `settings.save` (ADMIN)
- `reports.summary` (ADMIN)

## Observação

Este entregável já cria o sistema ponta a ponta (API + interface), com base sólida para evoluir telas avançadas (pacotes, lembretes personalizados, importação CSV com mapeamento completo, relatórios detalhados e exportações).
