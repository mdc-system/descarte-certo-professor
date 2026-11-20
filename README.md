# ♻️ Descarte Certo

Site para incentivar o **descarte correto de lixo eletrônico**. Produto da disciplina
**Prática de Extensão Interdisciplinar II** (tema: *Sustentabilidade, Meio Ambiente e
Desenvolvimento Social*).

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
5. **Avaliação**: link opcional para um Google Forms de satisfação (útil para a PEI).

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

Precisa do [Node.js](https://nodejs.org) 22.5 ou mais novo. Na pasta do projeto:

```bash
node servidor.js
```

Abra http://localhost:5173. O mesmo servidor entrega o site e a API, e o banco local fica em `data/descarte.db`.

## Banco de dados e API

`servidor.js` é a API (Node puro, sem `npm install`): usa `node:sqlite` (SQLite) e `node:crypto`.

| Tabela | Conteúdo |
|---|---|
| `usuarios` | nome, e-mail (único), senha com hash **scrypt** + sal |
| `sessoes` | hash SHA-256 do token de sessão, validade de 30 dias |
| `descartes` | ponto de coleta, peso total e data, ligado ao usuário |
| `descarte_itens` | itens de cada descarte (nome, quantidade, peso unitário) |

Rotas: `GET /api/me`, `POST /api/cadastro`, `POST /api/login`, `POST /api/logout`,
`POST /api/descartes`, `DELETE /api/conta`, `GET /api/estatisticas`, `GET /api/saude`.

Segurança: cookie de sessão `HttpOnly` + `Secure` + `SameSite=Lax`, a API só aceita JSON,
limite de 10 tentativas de login/cadastro a cada 15 min por IP, e excluir a conta apaga tudo em cascata.

## Publicado em

**https://technologyhm.com.br/descarte-certo/**

| Parte | Onde fica na VPS |
|---|---|
| Site (HTML/CSS/JS) | `/var/www/descarte-certo/` (servido pelo nginx) |
| API | `/opt/descarte-certo/servidor.js`, serviço **systemd** `descarte-certo-api` (usuário `www-data`, `127.0.0.1:3010`) |
| Banco | `/opt/descarte-certo/data/descarte.db` |
| nginx | blocos `/descarte-certo/api/` e `/descarte-certo/` em `/etc/nginx/sites-available/pfl` (backups em `/root/nginx-backups/`) |

Comandos úteis na VPS: `systemctl status descarte-certo-api`, `journalctl -u descarte-certo-api -f`.

Antes de usar os comandos abaixo, defina no terminal o acesso SSH da VPS. Esses dados não ficam no repositório:

```bash
export VPS="root@IP_DA_VPS"; export CHAVE=~/.ssh/SUA_CHAVE
```

Atualizar o **site** (na pasta do projeto). Depois de mudar CSS/JS, troque o número em `?v=` no `index.html` e no `conta.html` para forçar o navegador a baixar de novo:

```bash
tar -czf /tmp/dc.tgz index.html css js && scp -i "$CHAVE" /tmp/dc.tgz "$VPS":/tmp/ && ssh -i "$CHAVE" "$VPS" 'tar -xzf /tmp/dc.tgz -C /var/www/descarte-certo && chown -R www-data:www-data /var/www/descarte-certo && rm /tmp/dc.tgz'
```

Atualizar a **API** e/ou a **lista de pontos**:

```bash
scp -i "$CHAVE" servidor.js "$VPS":/opt/descarte-certo/ && scp -i "$CHAVE" pontos/pontos-grande-vitoria.json "$VPS":/opt/descarte-certo/pontos/ && ssh -i "$CHAVE" "$VPS" 'systemctl restart descarte-certo-api'
```

Backup do banco:

```bash
scp -i "$CHAVE" "$VPS":/opt/descarte-certo/data/descarte.db ./backup-descarte.db
```

## Outras formas de publicar de graça

**Netlify (mais fácil):** acesse https://app.netlify.com/drop e arraste a pasta `descarte-certo`.
Você recebe um link público na hora.

**GitHub Pages:** crie um repositório, envie os arquivos e ative *Settings → Pages*.

> A localização do navegador só funciona em `https://` ou `localhost`. Netlify e GitHub Pages já usam https.

## Personalizar (arquivo `js/config.js`)

- `FORM_URL`: link do Google Forms de avaliação (a seção aparece sozinha quando preenchido).
- `PONTOS_EXTRAS`: pontos de coleta confirmados por vocês (ex.: **a própria instituição parceira**,
  ecoponto da prefeitura). Eles aparecem sempre, mesmo se o servidor de mapas cair.
- `RAIO_PADRAO_KM`: raio inicial da busca.

Pesos e itens ficam em `js/itens.js`, com o peso médio aproximado de cada unidade em kg.

## Estrutura

```
descarte-certo/
├── index.html      página
├── css/style.css   visual (responsivo, funciona no celular)
├── js/config.js    configurações editáveis
├── js/itens.js     catálogo de itens e pesos médios
├── js/app.js       lógica (calculadora, localização, mapa, perfil)
└── servidor.js     servidor local para testes
```
