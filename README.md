# projetoPING.COM

> Este site se trata de um projeto disciplinar de Desenvolvimento Web, ministrada pelo professor Luiz Carlos, com fins acadêmicos educacionais.
> É um projeto em grupo com ,  e .

## Equipe
- **Wilson Filipe** - 20251380021 | [GitHub](https://github.com/wfillipe) | [LinkedIn](https://linkedin.com/in/fillipe-lima)
- **Samuel Menezes** - 20251380002 | [GitHub](https://github.com/SamuelMenezes20252) | [LinkedIn](https://linkedin.com/in/samuel-menezes-a2a09826b)
- **Kalel Aleksander** - 20251380030 | [GitHub](https://github.com/usuario3) | [LinkedIn](https://linkedin.com/in/usuario3)

## Documentação & Recursos
- **Pitch / Apresentação:** [Link dos slides da proposta]
- **Protótipos / Design de Interface:** [Ver protótipos](docs/prototypes/) | [Link no Figma](https://www.figma.com/file/exemplo)
- **Documentação do Projeto:** [Ver pasta de documentação](docs/)

## Páginas / Telas da Aplicação (GitHub Pages)
- 🏠 **Índice / Home:** [https://usuario.github.io/nome-do-projeto/](https://usuario.github.io/nome-do-projeto/) (ou `index.html`)
- 📊 **Dashboard:** [https://usuario.github.io/nome-do-projeto/dashboard.html](https://usuario.github.io/nome-do-projeto/dashboard.html)
- 🔑 **Autenticação:** [https://usuario.github.io/nome-do-projeto/login.html](https://usuario.github.io/nome-do-projeto/login.html)
- 📋 **Relatórios:** [https://usuario.github.io/nome-do-projeto/reports.html](https://usuario.github.io/nome-do-projeto/reports.html)

## Funcionalidades Planejadas (Features)
- [x] Visualização de métricas (CPU, Memória, Latência) e status de servidores no Dashboard com dados fictícios
- [x] Layout responsivo para as telas do sistema (Dashboard, Nós/Servidores, Alertas e Configurações)
- [ ] Filtro e busca dinâmica por IP, host e status dos serviços de rede (HTTP, DNS, SSH, DHCP)
- [ ] Consumo de API simulada via `json-server` com dados dinâmicos de servidores e incidentes (Projeto 1.1)
- [ ] Autenticação e controle de acesso de operadores de rede (Login/Logout com JWT)
- [ ] Servidor de API RESTful em Express.js para coleta e gerenciamento dos nós de rede (Projeto 1.2)
- [ ] Persistência de registros de métricas, histórico de uptime e incidentes em Banco de Dados com Prisma ORM
- [ ] Notificação automática de falhas de serviço e exportação de relatórios de tráfego/disponibilidade

## Estratégia para Obtenção de Dados Reais (Hipóteses Técnicas)
Descreva as hipóteses e estratégias iniciais da equipe para converter os dados fictícios (*mock data*) exibidos na interface em dados reais nas etapas futuras do projeto:
- **Fontes de Dados & Coleta:** [ex: execução de comandos de rede via CLI/Bash no SO, parsing de arquivos de log do Linux, chamadas de sistema, uso de bibliotecas de monitoramento ou consumo de APIs/SNMP];
- **Armazenamento & API:** [ex: criação de rotas HTTP em Express.js consumindo serviços do sistema operacional e persistência em banco de dados relacional com Prisma ORM].