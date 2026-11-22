# PING.COM — backend TypeScript + Express + MVC + SQLite

## Instalação
```bash
npm install
```

Coloque os arquivos existentes `index.html`, `style.css` e `script.js` dentro da pasta `public/` (crie essa pasta). O frontend original usa os mesmos caminhos `/api`, portanto não precisa ser reescrito.

## Desenvolvimento
```bash
npm run dev
```
Acesse http://localhost:3000.

## Compilar e executar
```bash
npm run build
npm start
```

O SQLite cria automaticamente `pingcom.db`. O utilitário `ping` precisa estar instalado no computador servidor.

## Estrutura
- `models/`: consultas SQL.
- `controllers/`: regras das requisições.
- `routes/`: endpoints Express.
- `middleware/`: autenticação.
- `services/`: execução e interpretação do ping.
- `database.ts`: criação das tabelas SQLite.

## Observações
O projeto mantém os endpoints usados pelo frontend original: autenticação, dispositivos, dashboard, problemas e histórico. O monitoramento roda a cada minuto.
Para produção, defina `SESSION_SECRET`, habilite HTTPS e configure `cookie.secure: true`. O armazenamento padrão de sessão do Express é apenas para desenvolvimento; use um store persistente em produção.
