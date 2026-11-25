# ♻️ Descarte Certo

> **Cópia para avaliação do PEI II (Multivix).** Este repositório é uma cópia pública do código do Descarte Certo,
> feita em 24/11/2026 para o professor acompanhar o projeto. Ele **não é usado em produção**: o site no ar
> ([technologyhm.com.br/descarte-certo](https://technologyhm.com.br/descarte-certo/)) é publicado a partir do repositório original, que é privado.

Site para incentivar o **descarte correto de lixo eletrônico**. Produto da disciplina
**Prática de Extensão Interdisciplinar II** (tema: *Sustentabilidade, Meio Ambiente e
Desenvolvimento Social*).

O site (pasta `web/`) é feito em **React** com a biblioteca de componentes **[Mantine](https://mantine.dev)**
e os ícones **[Lucide](https://lucide.dev)**, gerado com **[Vite](https://vite.dev)**. A API (`servidor.js`) é Node puro com SQLite.
Todas as bibliotecas são gratuitas e de código aberto (licenças MIT e ISC).

## Para assistentes de IA (leia antes de mudar qualquer coisa)

Este repositório também é editado com ajuda de IA (Claude Code, Codex, Copilot, Cursor etc.).
Se você é uma IA trabalhando aqui, **leia primeiro estes dois guias**, que explicam o padrão a seguir:

- **[docs/PROJETO.md](docs/PROJETO.md)**: como o projeto é feito (arquitetura, pastas, padrão do front-end em
  React + Mantine e do back-end em `servidor.js`, fluxos que não podem quebrar, como testar);
- **[docs/BANCO.md](docs/BANCO.md)**: como o banco SQLite está feito hoje (tabelas, relações, convenções e
  como criar tabela ou coluna sem quebrar o banco de produção).

Depois, siga este fluxo do começo ao fim:

1. **Nunca faça push no `main`.** O `main` é protegido: só o dono do repositório (mdc-system) atualiza esse branch,
   e um push direto é recusado pelo GitHub. Não tente contornar a regra.
2. **Crie uma branch a partir do `main` atualizado**, com nome curto no formato `tipo/assunto`
   (ex.: `feat/filtro-por-cidade`, `fix/mapa-no-celular`, `docs/readme`):

   ```bash
   git fetch origin && git switch -c feat/assunto origin/main
   ```

3. **Use o projeto como ele é.** O site fica em `web/` (React + Mantine + Vite) e a API em `servidor.js`
   (Node + SQLite). Veja [docs/PROJETO.md](docs/PROJETO.md), [docs/BANCO.md](docs/BANCO.md),
   [Como rodar no computador](#como-rodar-no-computador), a [Estrutura](#estrutura) e
   [Personalizar](#personalizar-arquivo-websrcconfigjs). Siga o padrão que já existe: componentes do Mantine,
   ícones do `lucide-react`, cores do tema em `web/src/comum/Raiz.jsx` e textos em português.
4. **Antes de abrir o PR, confira:**
   - `cd web && npm run build` termina sem erros;
   - as telas que você mudou funcionam no navegador, inclusive na largura de celular;
   - não ficou `console.log`, código comentado ou arquivo de teste esquecido.
5. **Abra um único PR com a versão final das alterações**, apontando para o `main`:

   ```bash
   git push -u origin HEAD
   gh pr create --base main --title "Título curto do que mudou" --body "O que mudou e por quê; como testou; prints se mudou algo visual"
   ```

   Se o dono pedir ajustes, faça novos commits **na mesma branch**: o PR se atualiza sozinho. Não abra um PR novo para cada ajuste.
6. **Não faça merge e não aprove o próprio PR.** Quem revisa e faz o merge no `main` é o dono do repositório.
7. **Não publique nada no servidor (VPS).** Você não tem acesso a ele e não deve pedir. A publicação é feita só
   pelo dono, depois do merge (seção [Publicado em](#publicado-em)).
8. **Não coloque segredos no repositório**: senhas, chaves SSH, tokens, IP do servidor, arquivos `.env`.
   Também não versione `data/`, `*.db`, `node_modules/` nem `web/dist/` (já estão no `.gitignore`).
9. **A API e o banco estão em produção.** Se você mudar rota, formato de resposta ou tabela em `servidor.js`,
   explique isso no PR: a API é publicada separadamente do site, e o banco tem dados reais de usuários.

## O que o site faz

1. **Explica por que** pilhas e eletrônicos não podem ir para o lixo comum (metais pesados,
   Lei 12.305/2010 – logística reversa) e dá dicas antes de entregar (apagar dados, doar se funciona).
2. **Calculadora**: a pessoa escolhe os itens (pilhas, celulares, notebooks, TVs…), a quantidade,
   e vê o **peso total aproximado**. Se o item não estiver na lista, ela digita nome, quantidade e peso.
3. **Pontos de coleta próximos**: pela **localização do navegador** ou por **CEP/endereço**,
   mostra os **5 pontos mais próximos** da Grande Vitória, que o projeto pesquisou e cadastrou no banco.
   Cada um traz distância, endereço, o que aceita, se aceita os itens escolhidos, a fonte da informação
   e um botão **"Como chegar"**. O mapa fica escondido e só aparece no botão **"Achar pelo mapa"**,
   com todos os pontos cadastrados. Fora da Grande Vitória, o site busca ao vivo no OpenStreetMap.
4. **Conta opcional (cadastro/login)**: funciona sem cadastro, mas **sem login nada é salvo**
   (a pessoa só vê os resultados). Logado, cada descarte registrado fica salvo na conta, no banco de dados,
   e o histórico aparece em qualquer aparelho. **"Minha conta" e "Histórico"** ficam numa página própria
   (`conta.html`), em duas abas: os dados básicos com o botão de excluir a conta e os dados, e a lista de descartes.
   O site também mostra o total de kg registrado pela comunidade.
5. **Privacidade (LGPD)**: aviso em `privacidade.html`, aceite obrigatório no cadastro (data salva no banco)
   e link no rodapé e na Minha conta.
6. **Recuperação de senha por código**: no cadastro a pessoa recebe um código (`XXXX-XXXX-XXXX`) mostrado uma
   única vez. Em "Esqueci minha senha", e-mail + código + nova senha trocam a senha, desconectam os outros
   aparelhos e geram um código novo. Na Minha conta dá para gerar outro código. Não usa serviço de e-mail.
7. **Avaliação**: link opcional para um Google Forms de satisfação (útil para a PEI).

## APIs gratuitas usadas (sem chave, sem custo)

| Para quê | Serviço |
|---|---|
| Localização do usuário | Geolocation API do navegador |
| CEP/endereço → coordenadas | **API do projeto** (`GET /api/localizar?q=29103-388`), que consulta no servidor a [AwesomeAPI CEP](https://cep.awesomeapi.com.br) e, como reserva, o [ViaCEP](https://viacep.com.br) com o [Nominatim](https://nominatim.org) (no máximo 1 requisição/s). Cada resultado fica em cache na tabela `geocache`. |
| Pontos de coleta (Grande Vitória) | **API do próprio projeto** (`GET /api/pontos`), com o banco de pontos pesquisados |
| Pontos de coleta (fora da Grande Vitória) | [Overpass API / OpenStreetMap](https://wiki.openstreetmap.org/wiki/Overpass_API) (tags `amenity=recycling` e `recycling:*=yes`) |
| Mapa | [Leaflet](https://leafletjs.com) + mapas do OpenStreetMap |

## Pontos de coleta cadastrados

São **222 pontos** em Vitória, Vila Velha, Serra, Cariacica, Guarapari, Viana e Fundão, pesquisados em 19/11/2026:
59 recebem eletrônicos, 115 só pilhas e 48 só lâmpadas. As fontes foram as prefeituras (Vitória, Vila Velha, Serra e
Cariacica) e os localizadores oficiais da Green Eletron, ABREE, Reciclus e Green Recicla Pilhas.
As coordenadas vêm desses localizadores ou de mapas oficiais; quando faltavam, foram obtidas pelo Nominatim e
conferidas pelo bairro. O campo `nota_pesquisa` guarda as anotações completas da pesquisa e não aparece no site.

**Só entram pontos com informação confirmada.** Em 20/11/2026 foram retirados 22 pontos: os que vinham só do
OpenStreetMap, sem fonte oficial; coletores anunciados mas não confirmados em funcionamento; pontos com fontes
contraditórias; e pontos cuja posição no mapa não pôde ser confirmada. Também foram retirados os itens aceitos que só
fontes antigas citavam.

Ficam em **`pontos/pontos-grande-vitoria.json`**. Ao iniciar, a API copia esse arquivo para a tabela
`pontos_coleta` do banco. Para incluir, corrigir ou remover um ponto, edite o arquivo e reinicie a API.
Um ponto que sai do arquivo fica inativo no banco.

Cada ponto tem: `codigo` (único), `nome`, `endereco`, `bairro`, `cidade`, `lat`/`lon` (para pegar no
Google Maps, clique com o botão direito no local e copie as coordenadas), `aceita` (categorias:
`batteries`, `mobile_phones`, `computers`, `electrical_items`, `electrical_appliances`, `tv_monitor`,
`low_energy_bulbs`, `white_goods`, `cables`), `horario`, `telefone`, `fonte_url`, `fonte_data`,
`confianca` (`alta` = fonte oficial recente; nos outros casos o site pede para confirmar antes de ir) e `observacao`.

`GET /api/pontos?lat=-20.31&lon=-40.29&limite=5` devolve os pontos ordenados por distância.

## Como rodar no computador

Precisa do [Node.js](https://nodejs.org) 22.5 ou mais novo. Primeiro gere o site (só na primeira vez e depois de mudar algo em `web/`):

```bash
cd web && npm install && npm run build && cd ..
```

Depois, na pasta do projeto:

```bash
node servidor.js
```

Abra http://localhost:5173. O mesmo servidor entrega o site (pasta `web/dist`) e a API, e o banco local fica em `data/descarte.db`.

Para mexer no visual com recarga automática, deixe o `node servidor.js` rodando e, em outro terminal,
rode `cd web && npm run dev`: o Vite abre o site em http://localhost:5174 (ou na porta que ele mostrar) e
repassa as chamadas `/api` para o servidor da porta 5173.

## Banco de dados e API

`servidor.js` é a API (Node puro, sem `npm install`): usa `node:sqlite` (SQLite) e `node:crypto`.

| Tabela | Conteúdo |
|---|---|
| `usuarios` | nome, e-mail (único), senha e código de recuperação com hash **scrypt** + sal, data do aceite do aviso de privacidade |
| `sessoes` | hash SHA-256 do token de sessão, validade de 30 dias |
| `descartes` | ponto de coleta, peso total e data, ligado ao usuário |
| `descarte_itens` | itens de cada descarte (nome, quantidade, peso unitário) |

Rotas: `GET /api/me`, `POST /api/cadastro`, `POST /api/login`, `POST /api/logout`, `POST /api/recuperar`,
`POST /api/recuperacao/codigo`, `POST /api/descartes`, `DELETE /api/conta`, `GET /api/estatisticas`,
`GET /api/pontos`, `GET /api/localizar`, `GET /api/saude`.

Segurança: cookie de sessão `HttpOnly` + `Secure` + `SameSite=Lax`, a API só aceita JSON,
limites por IP a cada 15 min (10 senhas erradas no login, 30 cadastros e 10 recuperações; o login certo não conta,
para uma palestra na mesma rede Wi-Fi não travar), mensagens de erro que não revelam se o
e-mail existe, e excluir a conta apaga tudo em cascata. Colunas novas entram por migração automática ao iniciar
(`garantirColuna` em `servidor.js`), sem apagar dados.

## Publicado em

**https://technologyhm.com.br/descarte-certo/**

A publicação é feita só pelo dono do repositório, depois do merge no `main`. Os comandos abaixo precisam do acesso SSH à VPS, que não fica neste repositório.

| Parte | Onde fica na VPS |
|---|---|
| Site (conteúdo de `web/dist`) | `/var/www/descarte-certo/` (servido pelo nginx) |
| API | `/opt/descarte-certo/servidor.js`, serviço **systemd** `descarte-certo-api` (usuário `www-data`, `127.0.0.1:3010`) |
| Banco | `/opt/descarte-certo/data/descarte.db` |
| nginx | blocos `/descarte-certo/api/` e `/descarte-certo/` em `/etc/nginx/sites-available/pfl` (backups em `/root/nginx-backups/`) |

Comandos úteis na VPS: `systemctl status descarte-certo-api`, `journalctl -u descarte-certo-api -f`.

Antes de usar os comandos abaixo, defina no terminal o acesso SSH da VPS. Esses dados não ficam no repositório:

```bash
export VPS="root@IP_DA_VPS"; export CHAVE=~/.ssh/SUA_CHAVE
```

Atualizar o **site** (na pasta do projeto). O Vite põe um código novo no nome dos arquivos a cada build
(`assets/inicio-XXXX.js`), então o navegador sempre baixa a versão nova, sem precisar trocar `?v=`.
O comando gera o site, envia, guarda um backup do site atual em `/root/descarte-certo-backups/` e só então
troca o conteúdo da pasta na VPS:

```bash
(cd web && npm run build) && tar -czf /tmp/dc.tgz -C web/dist . && scp -i "$CHAVE" /tmp/dc.tgz "$VPS":/tmp/ && ssh -i "$CHAVE" "$VPS" 'set -e; mkdir -p /root/descarte-certo-backups && tar -czf /root/descarte-certo-backups/site-$(date +%Y%m%d-%H%M%S).tgz -C /var/www/descarte-certo . && cd /var/www/descarte-certo && find . -mindepth 1 -delete && tar -xzf /tmp/dc.tgz && chown -R www-data:www-data . && rm /tmp/dc.tgz'
```

Para voltar ao site anterior: `cd /var/www/descarte-certo && find . -mindepth 1 -delete && tar -xzf /root/descarte-certo-backups/ARQUIVO.tgz`.

Atualizar a **API** e/ou a **lista de pontos**:

```bash
scp -i "$CHAVE" servidor.js "$VPS":/opt/descarte-certo/ && scp -i "$CHAVE" pontos/pontos-grande-vitoria.json "$VPS":/opt/descarte-certo/pontos/ && ssh -i "$CHAVE" "$VPS" 'systemctl restart descarte-certo-api'
```

Backup do banco:

```bash
scp -i "$CHAVE" "$VPS":/opt/descarte-certo/data/descarte.db ./backup-descarte.db
```

## Outras formas de publicar de graça

**Netlify (mais fácil):** gere o site (`cd web && npm run build`), acesse https://app.netlify.com/drop e arraste
a pasta `web/dist`. Você recebe um link público na hora. Sem a API, a calculadora, a busca no OpenStreetMap e o
mapa funcionam, mas os pontos cadastrados, a busca por CEP e as contas não.

> A localização do navegador só funciona em `https://` ou `localhost`. Netlify e GitHub Pages já usam https.

## Personalizar (arquivo `web/src/config.js`)

- `FORM_URL`: link do Google Forms de avaliação (a seção aparece sozinha quando preenchido).
- `RAIO_PADRAO_KM`: raio da busca no OpenStreetMap (fora da Grande Vitória).

Pesos, itens e ícones ficam em `web/src/dados.js`, com o peso médio aproximado de cada unidade em kg.
As cores e a fonte ficam no tema, em `web/src/comum/Raiz.jsx`. Depois de editar, gere o site de novo (`npm run build`).

## Estrutura

```
descarte-certo/
├── servidor.js                 API (Node + SQLite) e servidor local do site
├── testes/                     testes da API (node --test testes/)
├── pontos/                     pontos de coleta pesquisados (JSON)
├── docs/
│   ├── PROJETO.md              como o projeto é feito (guia para pessoas e IA)
│   └── BANCO.md                como o banco está feito (guia para pessoas e IA)
└── web/                        site em React + Mantine (Vite)
    ├── index.html              página inicial
    ├── conta.html              Minha área (Minha conta e Histórico)
    ├── privacidade.html        aviso de privacidade
    ├── vite.config.js
    └── src/
        ├── config.js           configurações editáveis
        ├── dados.js            catálogo de itens, pesos e ícones
        ├── comum/              tema, API, cabeçalho/rodapé, janelas de login e cadastro
        ├── inicio/             calculadora, pontos de coleta, mapa (Leaflet) e seções
        ├── conta/              página Minha área
        └── privacidade/        página do aviso de privacidade
```

`npm run build` gera o site pronto em `web/dist` (não vai para o git).
