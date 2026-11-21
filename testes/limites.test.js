// Testa os limites de tentativa da API. Rodar na raiz do projeto: node --test testes/
// Sobe o servidor numa porta própria, com banco temporário (nunca o data/descarte.db).
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PORTA = 5600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORTA}/api`;
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "descarte-teste-"));
let servidor;

before(async () => {
  servidor = spawn(process.execPath, [path.join(__dirname, "..", "servidor.js")], {
    env: { ...process.env, PORT: String(PORTA), DB_PATH: path.join(pasta, "teste.db"), SERVIR_ESTATICOS: "0" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/saude`)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("O servidor não subiu.");
});

after(() => {
  servidor.kill();
  fs.rmSync(pasta, { recursive: true, force: true });
});

const post = (rota, ip, corpo) => fetch(`${BASE}/${rota}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-real-ip": ip },
  body: JSON.stringify(corpo),
});
const cadastro = (ip, n) => post("cadastro", ip, { nome: `Pessoa ${n}`, email: `p${n}.${ip}@teste.local`, senha: "senha-forte-123", aceite: true });

test("uma palestra com 25 pessoas na mesma rede consegue se cadastrar e entrar", async () => {
  const ip = "10.0.0.1";
  for (let n = 1; n <= 25; n++) assert.equal((await cadastro(ip, n)).status, 201, `cadastro ${n}`);
  for (let n = 1; n <= 25; n++) {
    const r = await post("login", ip, { email: `p${n}.${ip}@teste.local`, senha: "senha-forte-123" });
    assert.equal(r.status, 200, `login ${n}`);
  }
});

test("o cadastro trava depois de 30 na mesma rede", async () => {
  const ip = "10.0.0.2";
  for (let n = 1; n <= 30; n++) assert.equal((await cadastro(ip, n)).status, 201, `cadastro ${n}`);
  assert.equal((await cadastro(ip, 31)).status, 429);
});

test("o login trava depois de 10 senhas erradas, mas não bloqueia outra rede", async () => {
  const ip = "10.0.0.3";
  assert.equal((await cadastro(ip, 1)).status, 201);
  for (let n = 1; n <= 10; n++) {
    assert.equal((await post("login", ip, { email: `p1.${ip}@teste.local`, senha: "errada-123" })).status, 401, `erro ${n}`);
  }
  assert.equal((await post("login", ip, { email: `p1.${ip}@teste.local`, senha: "senha-forte-123" })).status, 429);
  assert.equal((await post("login", "10.0.0.4", { email: `p1.${ip}@teste.local`, senha: "senha-forte-123" })).status, 200);
});
