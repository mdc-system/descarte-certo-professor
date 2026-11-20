/*
 * Descarte Certo — servidor (API + arquivos do site para testes locais).
 *
 * Sem dependências externas: usa apenas módulos do Node (>= 22.5):
 *   node:sqlite  → banco de dados SQLite (arquivo em data/descarte.db)
 *   node:crypto  → hash de senha (scrypt) e tokens de sessão
 *
 * Rodar localmente:   node servidor.js        → http://localhost:5173
 *
 * Variáveis de ambiente (produção):
 *   PORT=3010  HOST=127.0.0.1  DB_PATH=/opt/descarte-certo/data/descarte.db
 *   COOKIE_PATH=/descarte-certo/  COOKIE_SECURE=1  SERVIR_ESTATICOS=0
 */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const RAIZ = __dirname;
const PORTA = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || "127.0.0.1";
const DB_PATH = process.env.DB_PATH || path.join(RAIZ, "data", "descarte.db");
const COOKIE_NOME = "dc_sessao";
const COOKIE_PATH = process.env.COOKIE_PATH || "/";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "1";
const SERVIR_ESTATICOS = process.env.SERVIR_ESTATICOS !== "0";
const SESSAO_DIAS = 30;

/* ------------------------------------------------------------------ */
/* Banco de dados                                                      */
/* ------------------------------------------------------------------ */
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS usuarios (
    id          INTEGER PRIMARY KEY,
    nome        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash  TEXT    NOT NULL,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    token_hash  TEXT    PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now')),
    expira_em   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS descartes (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ponto       TEXT    NOT NULL,
    peso_kg     REAL    NOT NULL,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS descarte_itens (
    id            INTEGER PRIMARY KEY,
    descarte_id   INTEGER NOT NULL REFERENCES descartes(id) ON DELETE CASCADE,
    nome          TEXT    NOT NULL,
    quantidade    INTEGER NOT NULL,
    peso_unit_kg  REAL    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_descartes_usuario ON descartes(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_itens_descarte ON descarte_itens(descarte_id);

  -- Pontos de coleta cadastrados pelo projeto (carregados de pontos/pontos-grande-vitoria.json)
  CREATE TABLE IF NOT EXISTS pontos_coleta (
    id            INTEGER PRIMARY KEY,
    codigo        TEXT    NOT NULL UNIQUE,
    nome          TEXT    NOT NULL,
    endereco      TEXT    NOT NULL,
    bairro        TEXT,
    cidade        TEXT    NOT NULL,
    uf            TEXT    NOT NULL DEFAULT 'ES',
    lat           REAL    NOT NULL,
    lon           REAL    NOT NULL,
    aceita        TEXT    NOT NULL,          -- lista JSON de categorias (batteries, mobile_phones, ...)
    horario       TEXT,
    telefone      TEXT,
    fonte_url     TEXT,
    fonte_data    TEXT,
    confianca     TEXT,
    observacao    TEXT,
    ativo         INTEGER NOT NULL DEFAULT 1,
    atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Cache de CEPs/endereços já convertidos em coordenadas (evita repetir consultas externas)
  CREATE TABLE IF NOT EXISTS geocache (
    chave      TEXT PRIMARY KEY,
    lat        REAL NOT NULL,
    lon        REAL NOT NULL,
    rotulo     TEXT NOT NULL,
    fonte      TEXT NOT NULL,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* Migrações simples: colunas novas em bancos que já existem (não apaga nada). */
function garantirColuna(tabela, coluna, tipo) {
  const existe = db.prepare(`PRAGMA table_info(${tabela})`).all().some((c) => c.name === coluna);
  if (!existe) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
    console.log(`Coluna criada: ${tabela}.${coluna}`);
  }
}
garantirColuna("usuarios", "privacidade_aceita_em", "TEXT"); // data do aceite do aviso de privacidade (LGPD)

/* Sincroniza a tabela de pontos com o arquivo JSON do projeto (o arquivo é a "fonte da verdade"). */
const PONTOS_PATH = process.env.PONTOS_PATH || path.join(RAIZ, "pontos", "pontos-grande-vitoria.json");
function sincronizarPontos() {
  let lista;
  try { lista = JSON.parse(fs.readFileSync(PONTOS_PATH, "utf8")); }
  catch (err) { console.warn(`Pontos não carregados (${PONTOS_PATH}): ${err.message}`); return; }
  const upsert = db.prepare(`
    INSERT INTO pontos_coleta (codigo, nome, endereco, bairro, cidade, uf, lat, lon, aceita, horario, telefone,
                               fonte_url, fonte_data, confianca, observacao, ativo, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    ON CONFLICT(codigo) DO UPDATE SET nome=excluded.nome, endereco=excluded.endereco, bairro=excluded.bairro,
      cidade=excluded.cidade, uf=excluded.uf, lat=excluded.lat, lon=excluded.lon, aceita=excluded.aceita,
      horario=excluded.horario, telefone=excluded.telefone, fonte_url=excluded.fonte_url, fonte_data=excluded.fonte_data,
      confianca=excluded.confianca, observacao=excluded.observacao, ativo=1, atualizado_em=excluded.atualizado_em`);
  db.exec("BEGIN");
  try {
    db.exec("UPDATE pontos_coleta SET ativo = 0"); // o que saiu do arquivo fica inativo
    for (const p of lista) {
      if (!p.codigo || !p.nome || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      upsert.run(p.codigo, p.nome, p.endereco || "", p.bairro || "", p.cidade || "", p.uf || "ES", p.lat, p.lon,
        JSON.stringify(p.aceita || []), p.horario || "", p.telefone || "", p.fonte_url || "", p.fonte_data || "",
        p.confianca || "", p.observacao || "");
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  const n = db.prepare("SELECT COUNT(*) AS n FROM pontos_coleta WHERE ativo = 1").get().n;
  console.log(`${n} pontos de coleta ativos.`);
}
sincronizarPontos();

function distanciaKm(lat1, lon1, lat2, lon2) {
  const rad = (g) => (g * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const sql = {
  usuarioPorEmail: db.prepare("SELECT * FROM usuarios WHERE email = ?"),
  criarUsuario: db.prepare("INSERT INTO usuarios (nome, email, senha_hash, privacidade_aceita_em) VALUES (?, ?, ?, datetime('now'))"),
  usuarioPorId: db.prepare("SELECT * FROM usuarios WHERE id = ?"),
  excluirUsuario: db.prepare("DELETE FROM usuarios WHERE id = ?"),
  criarSessao: db.prepare("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)"),
  sessao: db.prepare(`SELECT u.id, u.nome, u.email, u.criado_em, u.privacidade_aceita_em FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
                      WHERE s.token_hash = ? AND s.expira_em > ?`),
  excluirSessao: db.prepare("DELETE FROM sessoes WHERE token_hash = ?"),
  limparSessoes: db.prepare("DELETE FROM sessoes WHERE expira_em <= ?"),
  criarDescarte: db.prepare("INSERT INTO descartes (usuario_id, ponto, peso_kg) VALUES (?, ?, ?)"),
  criarItem: db.prepare("INSERT INTO descarte_itens (descarte_id, nome, quantidade, peso_unit_kg) VALUES (?, ?, ?, ?)"),
  descartesDoUsuario: db.prepare("SELECT id, ponto, peso_kg, criado_em FROM descartes WHERE usuario_id = ? ORDER BY id DESC LIMIT 200"),
  itensDoUsuario: db.prepare(`SELECT i.descarte_id, i.nome, i.quantidade FROM descarte_itens i
                              JOIN descartes d ON d.id = i.descarte_id WHERE d.usuario_id = ? ORDER BY i.id`),
  geoGet: db.prepare("SELECT lat, lon, rotulo, fonte FROM geocache WHERE chave = ?"),
  geoSet: db.prepare("INSERT OR REPLACE INTO geocache (chave, lat, lon, rotulo, fonte) VALUES (?, ?, ?, ?, ?)"),
  pontosAtivos: db.prepare(`SELECT codigo, nome, endereco, bairro, cidade, uf, lat, lon, aceita, horario, telefone,
                                   fonte_url, fonte_data, confianca, observacao
                            FROM pontos_coleta WHERE ativo = 1`),
  estatisticas: db.prepare(`SELECT (SELECT COUNT(*) FROM descartes) AS descartes,
                                   (SELECT COALESCE(SUM(peso_kg), 0) FROM descartes) AS peso_kg,
                                   (SELECT COUNT(DISTINCT usuario_id) FROM descartes) AS participantes`),
};

const limparExpiradas = () => sql.limparSessoes.run(Date.now());
limparExpiradas();
setInterval(limparExpiradas, 60 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* Senhas e sessões                                                    */
/* ------------------------------------------------------------------ */
function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, sal, 64);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

function conferirSenha(senha, guardado) {
  const [alg, salHex, hashHex] = String(guardado).split("$");
  if (alg !== "scrypt" || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = crypto.scryptSync(senha, Buffer.from(salHex, "hex"), esperado.length);
  return crypto.timingSafeEqual(esperado, calculado);
}
// Hash "falso" para gastar o mesmo tempo quando o e-mail não existe (evita descobrir e-mails pelo tempo).
const HASH_FALSO = hashSenha(crypto.randomBytes(16).toString("hex"));

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function criarSessao(res, usuarioId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const maxAge = SESSAO_DIAS * 24 * 3600;
  sql.criarSessao.run(sha256(token), usuarioId, Date.now() + maxAge * 1000);
  definirCookie(res, token, maxAge);
}

function definirCookie(res, valor, maxAge) {
  const partes = [`${COOKIE_NOME}=${valor}`, `Path=${COOKIE_PATH}`, `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Lax"];
  if (COOKIE_SECURE) partes.push("Secure");
  res.setHeader("Set-Cookie", partes.join("; "));
}

function tokenDoCookie(req) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const c of cookies) {
    const [k, ...v] = c.trim().split("=");
    if (k === COOKIE_NOME) return v.join("=");
  }
  return null;
}

function usuarioDaSessao(req) {
  const token = tokenDoCookie(req);
  if (!token) return null;
  return sql.sessao.get(sha256(token), Date.now()) || null;
}

/* ------------------------------------------------------------------ */
/* Limite de tentativas (login/cadastro)                               */
/* ------------------------------------------------------------------ */
const tentativas = new Map();
function excedeuLimite(ip, max = 10, janelaMs = 15 * 60 * 1000) {
  const agora = Date.now();
  const t = tentativas.get(ip);
  if (!t || t.reinicia < agora) { tentativas.set(ip, { n: 1, reinicia: agora + janelaMs }); return false; }
  t.n += 1;
  return t.n > max;
}
setInterval(() => {
  const agora = Date.now();
  for (const [ip, t] of tentativas) if (t.reinicia < agora) tentativas.delete(ip);
}, 10 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* Utilidades HTTP                                                     */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Localização: CEP ou endereço → coordenadas (feito no servidor)      */
/* ------------------------------------------------------------------ */
// O navegador não consulta serviços externos de mapa: assim o site não é bloqueado quando
// muitas pessoas na mesma rede (ex.: uma apresentação) buscam ao mesmo tempo.
const USER_AGENT = "DescarteCerto/1.0 (projeto de extensao; +https://technologyhm.com.br/descarte-certo/)";
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const erroHttp = (status, msg) => Object.assign(new Error(msg), { status });

async function buscarJson(url, timeoutMs = 8000) {
  const r = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} em ${new URL(url).host}`), { httpStatus: r.status });
  return r.json();
}

// Nominatim permite no máximo 1 requisição por segundo: todas as chamadas passam por esta fila.
let filaNominatim = Promise.resolve();
function nominatim(params) {
  const qs = new URLSearchParams({ format: "jsonv2", limit: "5", countrycodes: "br", "accept-language": "pt-BR", ...params });
  const tarefa = () => buscarJson(`https://nominatim.openstreetmap.org/search?${qs}`);
  const resultado = filaNominatim.then(tarefa, tarefa);
  filaNominatim = resultado.then(() => esperar(1100), () => esperar(1100));
  return resultado;
}

const coordValida = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat < 6 && lat > -34 && lon < -28 && lon > -74;

async function localizarCep(cep) {
  // 1) AwesomeAPI: devolve endereço e coordenadas do CEP
  try {
    const j = await buscarJson(`https://cep.awesomeapi.com.br/json/${cep}`);
    const lat = Number(j.lat), lon = Number(j.lng);
    if (coordValida(lat, lon)) {
      const rotulo = [j.address, j.district, j.city && `${j.city}/${j.state}`].filter(Boolean).join(", ");
      return { lat, lon, rotulo, fonte: "awesomeapi" };
    }
  } catch { /* tenta o próximo */ }

  // 2) ViaCEP (endereço) + Nominatim (coordenadas), conferindo o bairro
  let d;
  try { d = await buscarJson(`https://viacep.com.br/ws/${cep}/json/`); }
  catch { throw erroHttp(503, "O serviço de CEP não respondeu. Tente novamente em instantes."); }
  if (d.erro) throw erroHttp(404, "CEP não encontrado. Confira os números.");
  const rotulo = [d.logradouro, d.bairro, `${d.localidade}/${d.uf}`].filter(Boolean).join(", ");
  const confere = (r, texto) => semAcento(r.display_name).includes(semAcento(texto));
  const tentativas = [
    d.logradouro && [{ street: d.logradouro, city: d.localidade, state: d.uf, country: "Brasil" }, d.bairro],
    d.bairro && [{ q: `${d.bairro}, ${d.localidade}, ${d.uf}` }, d.bairro],
    [{ q: `${d.localidade}, ${d.uf}` }, d.localidade],
  ].filter(Boolean);
  for (const [params, deveConter] of tentativas) {
    try {
      const res = await nominatim(params);
      const ok = res.find((r) => confere(r, d.localidade) && (!deveConter || confere(r, deveConter)));
      if (ok) return { lat: Number(ok.lat), lon: Number(ok.lon), rotulo, fonte: "viacep+nominatim" };
    } catch { /* tenta o próximo */ }
  }
  throw erroHttp(503, "Não consegui localizar esse CEP no mapa agora. Tente novamente ou use sua localização.");
}

async function localizarEndereco(texto) {
  let res;
  try { res = await nominatim({ q: texto }); }
  catch { throw erroHttp(503, "O serviço de mapas não respondeu. Tente novamente ou digite um CEP."); }
  const r = res[0];
  if (!r) throw erroHttp(404, "Endereço não encontrado. Tente incluir a cidade, ou digite o CEP.");
  return { lat: Number(r.lat), lon: Number(r.lon), rotulo: r.display_name.split(",").slice(0, 3).join(","), fonte: "nominatim" };
}

async function localizar(texto) {
  const cep = texto.replace(/\D/g, "");
  const ehCep = /^\d{8}$/.test(cep) && /^[\d\s.-]+$/.test(texto);
  const chave = ehCep ? `cep:${cep}` : `q:${semAcento(texto).replace(/\s+/g, " ").trim()}`;
  const salvo = sql.geoGet.get(chave);
  if (salvo) return { ...salvo, cache: true };
  const achado = ehCep ? await localizarCep(cep) : await localizarEndereco(texto);
  sql.geoSet.run(chave, achado.lat, achado.lon, achado.rotulo, achado.fonte);
  return achado;
}

function json(res, status, dados) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(dados === undefined ? "" : JSON.stringify(dados));
}

function lerJson(req) {
  return new Promise((resolve, reject) => {
    if (!String(req.headers["content-type"] || "").startsWith("application/json")) {
      return reject(Object.assign(new Error("Envie JSON."), { status: 415 }));
    }
    let tamanho = 0;
    const partes = [];
    req.on("data", (p) => {
      tamanho += p.length;
      if (tamanho > 32 * 1024) { reject(Object.assign(new Error("Dados grandes demais."), { status: 413 })); req.destroy(); }
      else partes.push(p);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(partes).toString("utf8") || "{}")); }
      catch { reject(Object.assign(new Error("JSON inválido."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function historicoDe(usuarioId) {
  const descartes = sql.descartesDoUsuario.all(usuarioId);
  const itens = sql.itensDoUsuario.all(usuarioId);
  const porDescarte = new Map();
  for (const i of itens) {
    if (!porDescarte.has(i.descarte_id)) porDescarte.set(i.descarte_id, []);
    porDescarte.get(i.descarte_id).push({ nome: i.nome, qtd: i.quantidade });
  }
  return descartes.map((d) => ({
    id: d.id,
    data: d.criado_em.replace(" ", "T") + "Z",
    ponto: d.ponto,
    peso: d.peso_kg,
    itens: porDescarte.get(d.id) || [],
  }));
}

const isoUtc = (sqlData) => (sqlData ? `${sqlData.replace(" ", "T")}Z` : null);
const publico = (u) => ({
  nome: u.nome,
  email: u.email,
  desde: isoUtc(u.criado_em) || new Date().toISOString(),
  privacidadeEm: isoUtc(u.privacidade_aceita_em),
});

/* ------------------------------------------------------------------ */
/* Rotas da API                                                        */
/* ------------------------------------------------------------------ */
async function api(req, res, rota) {
  const ip = req.headers["x-real-ip"] || req.socket.remoteAddress || "?";

  if (req.method === "GET" && rota === "/api/saude") return json(res, 200, { ok: true });

  if (req.method === "GET" && rota === "/api/estatisticas") {
    const e = sql.estatisticas.get();
    return json(res, 200, { descartes: e.descartes, pesoKg: Math.round(e.peso_kg * 10) / 10, participantes: e.participantes });
  }

  // CEP ou endereço → { lat, lon, rotulo }. Ex.: /api/localizar?q=29103-388
  if (req.method === "GET" && rota === "/api/localizar") {
    if (excedeuLimite(`geo:${ip}`, 60, 10 * 60 * 1000)) return json(res, 429, { erro: "Muitas buscas seguidas. Aguarde alguns minutos." });
    const texto = (new URL(req.url, "http://x").searchParams.get("q") || "").trim().slice(0, 150);
    if (texto.length < 3) return json(res, 400, { erro: "Digite um CEP ou endereço." });
    const r = await localizar(texto);
    return json(res, 200, { lat: r.lat, lon: r.lon, rotulo: r.rotulo });
  }

  // Pontos de coleta cadastrados. Com ?lat=&lon= ordena pela distância; ?limite= (1–200, padrão 5).
  if (req.method === "GET" && rota === "/api/pontos") {
    const q = new URL(req.url, "http://x").searchParams;
    const lat = Number(q.get("lat"));
    const lon = Number(q.get("lon"));
    const limite = Math.min(200, Math.max(1, Math.floor(Number(q.get("limite")) || 5)));
    const temCoord = q.has("lat") && q.has("lon") && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    let pontos = sql.pontosAtivos.all().map((p) => ({
      ...p,
      aceita: JSON.parse(p.aceita || "[]"),
      dist: temCoord ? Math.round(distanciaKm(lat, lon, p.lat, p.lon) * 100) / 100 : null,
    }));
    if (temCoord) pontos.sort((a, b) => a.dist - b.dist);
    return json(res, 200, { total: pontos.length, pontos: pontos.slice(0, limite) });
  }

  if (req.method === "GET" && rota === "/api/me") {
    const u = usuarioDaSessao(req);
    return json(res, 200, u ? { usuario: publico(u), historico: historicoDe(u.id) } : { usuario: null, historico: [] });
  }

  if (req.method === "POST" && rota === "/api/cadastro") {
    if (excedeuLimite(ip)) return json(res, 429, { erro: "Muitas tentativas. Aguarde alguns minutos." });
    const b = await lerJson(req);
    const nome = texto(b.nome, 60);
    const email = texto(b.email, 120).toLowerCase();
    const senha = typeof b.senha === "string" ? b.senha : "";
    if (nome.length < 2) return json(res, 400, { erro: "Informe seu nome." });
    if (!EMAIL_OK.test(email)) return json(res, 400, { erro: "Informe um e-mail válido." });
    if (senha.length < 8 || senha.length > 128) return json(res, 400, { erro: "A senha precisa ter de 8 a 128 caracteres." });
    if (b.aceite !== true) return json(res, 400, { erro: "Para criar a conta, aceite o aviso de privacidade." });
    if (sql.usuarioPorEmail.get(email)) return json(res, 409, { erro: "Já existe uma conta com esse e-mail. Use a aba Entrar." });
    const r = sql.criarUsuario.run(nome, email, hashSenha(senha));
    const id = Number(r.lastInsertRowid);
    criarSessao(res, id);
    return json(res, 201, { usuario: publico(sql.usuarioPorId.get(id)), historico: [] });
  }

  if (req.method === "POST" && rota === "/api/login") {
    if (excedeuLimite(ip)) return json(res, 429, { erro: "Muitas tentativas. Aguarde alguns minutos." });
    const b = await lerJson(req);
    const email = texto(b.email, 120).toLowerCase();
    const senha = typeof b.senha === "string" ? b.senha.slice(0, 128) : "";
    const u = sql.usuarioPorEmail.get(email);
    const ok = conferirSenha(senha, u ? u.senha_hash : HASH_FALSO);
    if (!u || !ok) return json(res, 401, { erro: "E-mail ou senha incorretos." });
    criarSessao(res, u.id);
    return json(res, 200, { usuario: publico(u), historico: historicoDe(u.id) });
  }

  if (req.method === "POST" && rota === "/api/logout") {
    const token = tokenDoCookie(req);
    if (token) sql.excluirSessao.run(sha256(token));
    definirCookie(res, "", 0);
    return json(res, 204);
  }

  if (req.method === "POST" && rota === "/api/descartes") {
    const u = usuarioDaSessao(req);
    if (!u) return json(res, 401, { erro: "Entre na sua conta para salvar o histórico." });
    const b = await lerJson(req);
    const ponto = texto(b.ponto, 120) || "Ponto de coleta";
    const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 50).map((i) => ({
      nome: texto(i && i.nome, 60),
      qtd: Math.floor(Number(i && i.qtd)),
      peso: Number(i && i.peso),
    })).filter((i) => i.nome && i.qtd >= 1 && i.qtd <= 999 && i.peso > 0 && i.peso <= 200);
    if (!itens.length) return json(res, 400, { erro: "Nenhum item válido para registrar." });
    const pesoTotal = Math.round(itens.reduce((s, i) => s + i.qtd * i.peso, 0) * 1000) / 1000;

    db.exec("BEGIN");
    try {
      const d = sql.criarDescarte.run(u.id, ponto, pesoTotal);
      const id = Number(d.lastInsertRowid);
      for (const i of itens) sql.criarItem.run(id, i.nome, i.qtd, i.peso);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return json(res, 201, { historico: historicoDe(u.id) });
  }

  if (req.method === "DELETE" && rota === "/api/conta") {
    const u = usuarioDaSessao(req);
    if (!u) return json(res, 401, { erro: "Você não está logado." });
    sql.excluirUsuario.run(u.id); // sessões, descartes e itens saem junto (ON DELETE CASCADE)
    definirCookie(res, "", 0);
    return json(res, 204);
  }

  return json(res, 404, { erro: "Rota não encontrada." });
}

/* ------------------------------------------------------------------ */
/* Arquivos estáticos (apenas para testes locais)                      */
/* ------------------------------------------------------------------ */
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
};
const PERMITIDOS = new Set(["/index.html", "/conta.html", "/privacidade.html", "/css/style.css", "/js/app.js", "/js/config.js", "/js/itens.js", "/js/conta.js"]);

function estatico(req, res, rota) {
  const alvo = rota === "/" ? "/index.html" : rota;
  if (!PERMITIDOS.has(alvo)) { res.writeHead(404); return res.end("Não encontrado"); }
  fs.readFile(path.join(RAIZ, alvo), (err, dados) => {
    if (err) { res.writeHead(404); return res.end("Não encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(alvo)] || "application/octet-stream" });
    res.end(dados);
  });
}

/* ------------------------------------------------------------------ */
http.createServer(async (req, res) => {
  let rota;
  try { rota = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { res.writeHead(400); return res.end(); }
  // Aceita a API com ou sem o prefixo /descarte-certo (nginx pode repassar de qualquer forma).
  rota = rota.replace(/^\/descarte-certo(?=\/)/, "");

  if (rota.startsWith("/api/")) {
    try { await api(req, res, rota); }
    catch (err) {
      if (err.status) return json(res, err.status, { erro: err.message });
      console.error(err);
      json(res, 500, { erro: "Erro interno. Tente novamente." });
    }
    return;
  }
  if (SERVIR_ESTATICOS && req.method === "GET") return estatico(req, res, rota);
  res.writeHead(404); res.end();
}).listen(PORTA, HOST, () => console.log(`Descarte Certo rodando em http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORTA}`));
