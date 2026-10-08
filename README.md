# PING.COM

> Sistema web acadêmico para monitoramento de dispositivos de rede por
> meio de verificações ICMP (ping).
>
> Projeto desenvolvido na disciplina de Desenvolvimento Web, com
> finalidade educacional.

## Sobre o projeto

O **PING.COM** é uma aplicação web para cadastrar dispositivos de uma
rede e acompanhar sua disponibilidade, latência e perda de pacotes.

A aplicação possui um frontend executado no navegador e um backend
desenvolvido em **Node.js**. O navegador não executa o `ping`
diretamente: ele envia requisições para a API do servidor, e o backend
executa o utilitário `ping` do sistema operacional.

O projeto foi desenvolvido como um MVP acadêmico. O armazenamento
utiliza um arquivo JSON local (`db.json`) e o monitoramento automático
acontece enquanto o servidor Node.js estiver em execução.

------------------------------------------------------------------------

## Funcionalidades

-   Cadastro de usuários.
-   Login e logout com sessão.
-   Senhas armazenadas com hash e salt utilizando `scrypt`.
-   Cadastro de dispositivos para monitoramento.
-   Exclusão de dispositivos.
-   Suporte a computadores, servidores, roteadores, switches e outros
    tipos de dispositivos.
-   Validação de endereços IPv4 permitidos.
-   Verificação ICMP automática.
-   Verificação imediata ao cadastrar um dispositivo.
-   Verificação manual pelo painel do dispositivo.
-   Monitoramento automático a cada **60 segundos**.
-   Classificação dos dispositivos como:
    -   **Online**
    -   **Offline**
    -   **Latência elevada**
-   Cálculo da latência média das respostas.
-   Cálculo estimado da perda de pacotes.
-   Dashboard com resumo do estado da rede.
-   Lista de problemas atuais.
-   Histórico das verificações.
-   Gráfico simples de latência por dispositivo.
-   Testes automatizados das principais funções do módulo de
    monitoramento.
-   Interface responsiva para diferentes tamanhos de tela.

------------------------------------------------------------------------

## Tecnologias utilizadas

### Frontend

-   HTML5
-   CSS3
-   JavaScript
-   SVG para o gráfico de latência
-   Fetch API para comunicação com o backend

### Backend

-   Node.js
-   API HTTP utilizando os módulos nativos do Node.js
-   `child_process` para executar o utilitário `ping`
-   `crypto` para hash de senhas e assinatura das sessões
-   `fs` para leitura e gravação do banco JSON
-   `net` para validação de endereços IP

### Testes

-   `node:test`
-   `node:assert/strict`

### Armazenamento

-   JSON (`db.json`)

O projeto não depende de frameworks externos para o funcionamento
principal do servidor.

------------------------------------------------------------------------

## Estrutura do projeto

``` text
projetoPING.COM/
├── index.html
├── style.css
├── script.js
├── server.js
├── monitoring.js
├── monitoring.test.js
├── package.json
├── db.json
├── README.md
└── .gitignore
```

### Responsabilidade de cada arquivo

  -----------------------------------------------------------------------
  Arquivo                             Função
  ----------------------------------- -----------------------------------
  `index.html`                        Estrutura das telas e elementos da
                                      interface

  `style.css`                         Estilos, layout, responsividade e
                                      aparência

  `script.js`                         Lógica do frontend e comunicação
                                      com a API

  `server.js`                         Servidor HTTP, autenticação, API,
                                      persistência e agendamento

  `monitoring.js`                     Execução, interpretação e
                                      classificação dos pings

  `monitoring.test.js`                Testes automatizados do módulo de
                                      monitoramento

  `package.json`                      Configuração do projeto e scripts
                                      do Node.js

  `db.json`                           Armazenamento local dos usuários,
                                      dispositivos e verificações

  `README.md`                         Documentação do projeto

  `.gitignore`                        Arquivos que não devem ser enviados
                                      para o Git
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Arquitetura da aplicação

O fluxo principal pode ser representado assim:

``` text
┌──────────────────────┐
│      Navegador       │
│ index.html           │
│ style.css            │
│ script.js            │
└──────────┬───────────┘
           │ HTTP / API
           ▼
┌──────────────────────┐
│      Node.js         │
│      server.js       │
│                      │
│ Autenticação         │
│ API                   │
│ Sessões              │
│ Persistência         │
│ Agendamento          │
└──────────┬───────────┘
           │
           │ chama
           ▼
┌──────────────────────┐
│    monitoring.js     │
│                      │
│ Executa o ping       │
│ Interpreta respostas │
│ Calcula latência     │
│ Calcula perda        │
│ Classifica status    │
└──────────┬───────────┘
           │
           │ ping
           ▼
┌──────────────────────┐
│ Dispositivo de rede  │
│ 192.168.x.x etc.     │
└──────────────────────┘

           │
           ▼
┌──────────────────────┐
│       db.json        │
│ Usuários             │
│ Dispositivos         │
│ Verificações         │
│ Histórico            │
└──────────────────────┘
```

------------------------------------------------------------------------

## Como executar localmente

### 1. Instalar o Node.js

É necessário ter **Node.js 18 ou superior** instalado.

Depois de instalar, verifique:

``` bash
node --version
```

e:

``` bash
npm --version
```

------------------------------------------------------------------------

### 2. Baixar o projeto

Caso o projeto esteja no GitHub:

``` bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta:

``` bash
cd projetoPING.COM
```

------------------------------------------------------------------------

### 3. Instalar as dependências

Execute:

``` bash
npm install
```

Atualmente o projeto utiliza principalmente módulos nativos do Node.js,
portanto não há uma grande quantidade de dependências externas.

------------------------------------------------------------------------

### 4. Iniciar o servidor

Execute:

``` bash
npm start
```

O servidor será iniciado na porta:

``` text
3000
```

Acesse no navegador:

``` text
http://localhost:3000
```

> **Importante:** não abra o `index.html` diretamente pelo navegador. A
> aplicação depende do backend Node.js para autenticação, API,
> persistência e monitoramento.

------------------------------------------------------------------------

## Executando os testes

O projeto possui testes automatizados para as principais funções do
monitoramento.

Execute:

``` bash
npm test
```

O script configurado no `package.json` é:

``` json
"test": "node --test"
```

Os testes verificam, entre outros pontos:

-   validação de IPv4;
-   aceitação de redes privadas e loopback;
-   rejeição de endereços não permitidos;
-   interpretação da saída do `ping`;
-   classificação como online;
-   classificação como offline;
-   classificação como latência elevada;
-   cálculo de perda de pacotes.

------------------------------------------------------------------------

# Como funciona o monitoramento

## 1. Cadastro do dispositivo

O usuário informa:

-   nome do dispositivo;
-   endereço IPv4;
-   tipo do dispositivo.

O frontend envia os dados para:

``` http
POST /api/devices
```

O backend valida as informações, registra o dispositivo e executa uma
primeira verificação imediatamente.

------------------------------------------------------------------------

## 2. Execução do ping

O arquivo `monitoring.js` executa o utilitário `ping` do sistema
operacional.

A aplicação utiliza **3 pacotes ICMP** por verificação.

No Windows, o comando é equivalente a:

``` text
ping.exe -n 3 -w 1000 IP
```

O endereço IP é passado como argumento separado para o processo, em vez
de ser concatenado em um comando de shell.

Isso evita que o endereço informado pelo usuário seja interpretado como
parte de um comando de shell.

------------------------------------------------------------------------

## 3. Disponibilidade

Se nenhum dos três pacotes receber resposta, o resultado é classificado
como:

``` text
offline
```

Se houver respostas, o dispositivo é considerado disponível, podendo ser
classificado como:

``` text
online
```

ou:

``` text
high_latency
```

> **Atenção:** um dispositivo pode estar ligado e bloquear mensagens
> ICMP. Portanto, ausência de resposta ao ping não comprova que o
> equipamento esteja desligado.

------------------------------------------------------------------------

## 4. Latência

A latência utilizada pelo projeto é baseada no **RTT (Round Trip Time)**
informado pelas respostas ICMP.

Quando existem respostas, a aplicação calcula a média dos tempos
recebidos.

A regra utilizada é:

``` text
média < 100 ms
→ Online
```

``` text
média >= 100 ms
→ Latência elevada
```

Portanto, **100 ms é o limite utilizado pelo projeto para classificar
uma latência como elevada**.

------------------------------------------------------------------------

## 5. Perda de pacotes

A aplicação utiliza três pacotes por verificação.

A fórmula é:

``` text
perda (%) =
(pacotes sem resposta / 3) × 100
```

Exemplos:

``` text
3 respostas
→ 0% de perda
```

``` text
2 respostas
→ 33,33% de perda
```

``` text
1 resposta
→ 66,67% de perda
```

``` text
0 respostas
→ 100% de perda
```

Os três pacotes representam uma amostra curta para fins didáticos e não
uma análise estatística abrangente da rede.

------------------------------------------------------------------------

# Monitoramento automático

O backend executa verificações automaticamente a cada:

``` text
60 segundos
```

Isso acontece enquanto o `server.js` estiver em execução.

Além do monitoramento automático, existem duas situações em que uma
verificação é executada imediatamente:

1.  quando um dispositivo é cadastrado;
2.  quando o usuário solicita uma verificação manual.

O frontend também atualiza as informações exibidas periodicamente, mas
isso é diferente do monitoramento.

### Backend

``` text
A cada 60 segundos
        ↓
server.js
        ↓
lista de dispositivos
        ↓
monitoring.js
        ↓
ping
        ↓
salva resultado
```

### Frontend

``` text
Navegador
    ↓
consulta a API periodicamente
    ↓
atualiza Dashboard / Histórico / Detalhes
```

O frontend consultar a API não significa que um novo ping esteja sendo
executado a cada consulta. O monitoramento real é controlado pelo
backend.

------------------------------------------------------------------------

# Dashboard

O Dashboard apresenta uma visão resumida da rede monitorada.

Entre as informações exibidas estão:

-   quantidade de dispositivos online;
-   quantidade de dispositivos offline;
-   quantidade de dispositivos com latência elevada;
-   horário da última verificação;
-   problemas atuais;
-   dispositivos cadastrados.

O Dashboard utiliza o **último resultado disponível de cada
dispositivo** para representar seu estado atual.

------------------------------------------------------------------------

# Histórico

As verificações anteriores são armazenadas no `db.json`.

O histórico permite consultar informações como:

-   dispositivo;
-   endereço IP;
-   data e hora;
-   latência média;
-   perda de pacotes;
-   status.

O histórico não é substituído pelo resultado mais recente. Cada nova
verificação gera um novo registro.

------------------------------------------------------------------------

# Gráfico de latência

Na página de detalhes de um dispositivo, o frontend utiliza JavaScript e
SVG para construir um gráfico com os resultados recentes de latência.

O gráfico:

-   utiliza os resultados históricos do dispositivo;
-   apresenta os valores de latência;
-   considera os registros mais recentes;
-   exibe uma referência de **100 ms**, correspondente ao limite de
    latência elevada.

O gráfico é gerado no navegador e não depende de uma biblioteca externa
de gráficos.

------------------------------------------------------------------------

# Autenticação

O sistema possui:

-   cadastro;
-   login;
-   logout;
-   sessão por cookie;
-   separação dos dispositivos por usuário.

As senhas não são armazenadas diretamente em texto puro.

O backend utiliza:

``` text
scrypt
```

para gerar o hash da senha juntamente com um salt.

A sessão é associada a um cookie chamado:

``` text
pingsid
```

e utiliza assinatura HMAC com SHA-256.

------------------------------------------------------------------------

# API principal

A aplicação possui uma API HTTP utilizada pelo frontend.

## Autenticação

### Cadastro

``` http
POST /api/auth/register
```

Cria uma nova conta.

### Login

``` http
POST /api/auth/login
```

Autentica o usuário e cria a sessão.

### Sessão atual

``` http
GET /api/auth/session
```

Verifica se existe uma sessão autenticada.

### Logout

``` http
POST /api/auth/logout
```

Encerra a sessão.

------------------------------------------------------------------------

## Dispositivos

### Listar dispositivos

``` http
GET /api/devices
```

Retorna os dispositivos pertencentes ao usuário autenticado.

### Cadastrar dispositivo

``` http
POST /api/devices
```

Cria um dispositivo e executa uma primeira verificação.

### Consultar dispositivo

``` http
GET /api/devices/:id
```

Retorna informações de um dispositivo específico.

### Verificar dispositivo

``` http
POST /api/devices/:id/check
```

Executa uma nova verificação imediatamente.

### Excluir dispositivo

``` http
DELETE /api/devices/:id
```

Remove o dispositivo.

Os registros históricos podem permanecer armazenados de acordo com a
lógica de persistência do projeto.

------------------------------------------------------------------------

## Dashboard e problemas

### Dashboard

``` http
GET /api/dashboard
```

Retorna os dados utilizados pelo painel principal.

### Problemas

``` http
GET /api/problems
```

Retorna os dispositivos que apresentam situações que exigem atenção.

------------------------------------------------------------------------

## Histórico

``` http
GET /api/history
```

Retorna as verificações armazenadas.

Também é possível filtrar o histórico por dispositivo utilizando o
parâmetro correspondente da API.

------------------------------------------------------------------------

# Endereços IP aceitos

O MVP foi desenvolvido para monitorar dispositivos em redes privadas e
loopback.

São aceitos:

``` text
10.x.x.x
```

``` text
172.16.x.x até 172.31.x.x
```

``` text
192.168.x.x
```

``` text
127.x.x.x
```

Endereços IPv4 públicos não fazem parte do escopo atual da validação.

Além de ser permitido pelo código, o endereço precisa ser realmente
alcançável a partir da máquina que executa o servidor Node.js.

------------------------------------------------------------------------

# Requisitos para o monitoramento

O computador que executa o backend precisa:

1.  ter Node.js instalado;
2.  possuir o utilitário de sistema `ping`;
3.  conseguir alcançar o endereço IP monitorado;
4.  possuir rota adequada para a rede;
5.  ter permissão para realizar as operações ICMP necessárias.

Por isso, executar o projeto em um computador diferente pode produzir
resultados diferentes.

Por exemplo:

``` text
PC A
  ↓
Node.js + PING.COM
  ↓
192.168.1.1
  ↓
responde
```

Mas, se o servidor estiver em outra rede sem rota para `192.168.1.1`, o
monitoramento poderá falhar.

------------------------------------------------------------------------

# Banco de dados

O projeto utiliza:

``` text
db.json
```

como armazenamento simples.

O arquivo mantém informações relacionadas a:

-   usuários;
-   dispositivos;
-   verificações;
-   outros registros utilizados pelo projeto.

Essa solução foi escolhida por simplicidade e finalidade acadêmica.

### Limitações

O `db.json` não é indicado para:

-   múltiplos servidores escrevendo simultaneamente;
-   aplicações de grande escala;
-   grandes volumes de histórico;
-   alta concorrência;
-   ambientes de produção.

Uma evolução natural seria utilizar um banco de dados real, como
PostgreSQL ou outro banco relacional.

------------------------------------------------------------------------

# Segurança e configuração

Para desenvolvimento local, o projeto possui um valor padrão para o
segredo utilizado nas sessões.

Em um ambiente real, recomenda-se configurar uma variável de ambiente:

``` text
SESSION_SECRET
```

com um valor forte, aleatório e persistente.

Também é recomendado utilizar HTTPS em uma implantação real.

O segredo utilizado em produção não deve ser colocado diretamente no
código-fonte ou publicado no GitHub.

------------------------------------------------------------------------

# Publicação no GitHub

O GitHub deve ser utilizado para armazenar e versionar o código do
projeto.

A estrutura recomendada do repositório é:

``` text
projetoPING.COM/
├── index.html
├── style.css
├── script.js
├── server.js
├── monitoring.js
├── monitoring.test.js
├── package.json
├── db.json
├── README.md
└── .gitignore
```

Todos esses arquivos podem ficar na pasta principal do repositório.

Não é necessário criar uma página diferente no GitHub para cada arquivo.

------------------------------------------------------------------------

## `.gitignore`

Recomenda-se criar um arquivo chamado:

``` text
.gitignore
```

com pelo menos:

``` gitignore
node_modules/
.env
*.log
```

A pasta `node_modules` não precisa ser enviada ao GitHub, pois pode ser
recriada com:

``` bash
npm install
```

------------------------------------------------------------------------

## Atenção ao `db.json`

Antes de publicar um repositório público, não é recomendado enviar dados
pessoais ou dados reais utilizados durante testes.

O `db.json` do repositório pode ser mantido com uma estrutura inicial
vazia, por exemplo:

``` json
{
  "usuarios": [],
  "testes": [],
  "dispositivos": [],
  "verificacoes": []
}
```

Isso evita publicar contas, hashes, e-mails, endereços IP ou históricos
de testes utilizados durante o desenvolvimento.

------------------------------------------------------------------------

# GitHub Pages

**GitHub Pages não executa o projeto completo.**

Isso acontece porque o GitHub Pages serve arquivos estáticos, enquanto o
PING.COM depende de um backend Node.js.

O projeto precisa do `server.js` para:

-   executar a API;
-   autenticar usuários;
-   acessar `db.json`;
-   executar o `ping`;
-   realizar o monitoramento automático;
-   salvar os resultados.

Portanto:

``` text
GitHub Pages
    ↓
HTML + CSS + JavaScript
    ↓
não executa server.js
    ↓
não executa o monitoramento ICMP
```

Para executar a aplicação completa, é necessário um ambiente que consiga
executar Node.js.

------------------------------------------------------------------------

# Como clonar e executar o projeto pelo GitHub

Depois que o projeto estiver publicado:

``` bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta:

``` bash
cd projetoPING.COM
```

Instale as dependências:

``` bash
npm install
```

Execute os testes:

``` bash
npm test
```

Inicie o servidor:

``` bash
npm start
```

Depois abra:

``` text
http://localhost:3000
```

------------------------------------------------------------------------

# Limitações atuais

Este projeto é um MVP acadêmico e possui algumas limitações
intencionais.

Atualmente ele não possui:

-   descoberta automática de dispositivos;
-   monitoramento por SNMP;
-   notificações por e-mail;
-   notificações por aplicativos de mensagem;
-   banco de dados relacional;
-   alta disponibilidade;
-   cluster de servidores;
-   análise estatística avançada;
-   monitoramento enquanto o backend estiver desligado;
-   garantia de que um dispositivo está desligado apenas porque não
    respondeu ao ICMP.

O limite atual de cadastro é de **25 dispositivos por conta**.

------------------------------------------------------------------------

# Possíveis evoluções

Algumas funcionalidades que podem ser implementadas em versões futuras:

-   utilização de PostgreSQL ou outro banco de dados;
-   descoberta automática de dispositivos;
-   monitoramento por SNMP;
-   alertas por e-mail;
-   notificações em tempo real;
-   autenticação mais avançada;
-   gráficos históricos mais completos;
-   filtros por período;
-   relatórios de disponibilidade;
-   monitoramento distribuído;
-   suporte a IPv6;
-   execução em ambiente de produção com HTTPS;
-   sistema de permissões e usuários administrativos.

Essas funcionalidades não fazem parte do MVP atual.

------------------------------------------------------------------------

# Equipe

-   **Wilson Filipe** --- 20251380021
-   **Samuel Menezes** --- 20251380002
-   **Kalel Aleksander** --- 20251380030

Os links individuais de GitHub, LinkedIn, apresentação e protótipos
podem ser adicionados posteriormente caso sejam definidos para a
entrega.

------------------------------------------------------------------------

# Licença

Projeto desenvolvido para fins acadêmicos e educacionais.

------------------------------------------------------------------------

## Resumo rápido

Para executar o projeto:

``` bash
npm install
npm test
npm start
```

Depois:

``` text
http://localhost:3000
```

O servidor Node.js executa o backend, realiza os pings, salva os
resultados no `db.json` e disponibiliza os dados para a interface web.
