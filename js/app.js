/* Descarte Certo — lógica da página (JavaScript puro, sem dependências além do Leaflet). */
(() => {
  "use strict";

  /* ---------- Utilidades ---------- */
  const $ = (sel) => document.querySelector(sel);
  const fmtKg = (kg) =>
    kg >= 1
      ? `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`
      : `${Math.round(kg * 1000).toLocaleString("pt-BR")} g`;
  const fmtKm = (km) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // localStorage pode falhar (modo privado, bloqueio de cookies): o site funciona sem ele.
  const store = {
    get(chave, padrao) {
      try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch { return padrao; }
    },
    set(chave, valor) {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* ignora */ }
    },
    del(chave) {
      try { localStorage.removeItem(chave); } catch { /* ignora */ }
    },
  };

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("toast--visivel");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("toast--visivel"), 3200);
  }

  function status(msg, erro = false) {
    const el = $("#status");
    el.textContent = msg;
    el.classList.toggle("status--erro", erro);
  }

  function distanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  async function fetchJson(url, opcoes = {}, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opcoes, signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  /* ---------- API (cadastro, login e histórico ficam no servidor) ---------- */
  async function apiFetch(rota, { method = "GET", body } = {}) {
    let r;
    try {
      r = await fetch(`api/${rota}`, {
        method,
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error("Sem conexão com o servidor. Verifique sua internet e tente de novo."), { status: 0 });
    }
    const dados = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(dados.erro || "Não foi possível falar com o servidor."), { status: r.status });
    return dados;
  }

  /* ---------- Estado ----------
   * Sem login nada é salvo: a seleção existe só enquanto a página está aberta.
   * Com login, o histórico de descartes é salvo na conta (banco de dados). */
  const estado = {
    qtd: {},          // { idItem: quantidade }
    outros: [],       // [{ id, nome, qtd, peso }]
    perfil: null,     // { nome, email } quando logado
    historico: [],
    origem: null,     // { lat, lon, rotulo }
    pontos: [],       // os mais próximos (lista)
    todos: [],        // todos os pontos conhecidos, ordenados por distância (mapa)
    modo: "cadastro", // "cadastro" (banco do projeto) ou "osm" (fora da Grande Vitória)
    pontoMapa: null,  // ponto clicado no mapa
  };
  const salvarSelecao = () => {};
  // Remove dados da versão antiga do site, que guardava perfil e seleção no navegador.
  ["dc_qtd", "dc_outros", "dc_perfil", "dc_historico"].forEach((k) => store.del(k));

  /* ---------- Calculadora ---------- */
  function renderItens() {
    const lista = $("#listaItens");
    lista.innerHTML = ITENS.map((it) => {
      const q = estado.qtd[it.id] || 0;
      return `
        <div class="item ${q > 0 ? "item--ativo" : ""}" data-id="${it.id}">
          <div class="item__topo">
            <span class="item__icone" aria-hidden="true">${it.icone}</span>
            <div>
              <div class="item__nome">${esc(it.nome)}</div>
              <div class="item__peso">≈ ${fmtKg(it.peso)} / un.</div>
            </div>
          </div>
          <div class="qtd">
            <button type="button" data-acao="menos" aria-label="Diminuir ${esc(it.nome)}">−</button>
            <input type="number" min="0" max="999" value="${q}" inputmode="numeric" aria-label="Quantidade de ${esc(it.nome)}">
            <button type="button" data-acao="mais" aria-label="Aumentar ${esc(it.nome)}">+</button>
          </div>
        </div>`;
    }).join("");
  }

  function setQtd(id, valor) {
    const q = Math.max(0, Math.min(999, Math.floor(Number(valor) || 0)));
    if (q > 0) estado.qtd[id] = q; else delete estado.qtd[id];
    const card = document.querySelector(`.item[data-id="${id}"]`);
    if (card) {
      card.classList.toggle("item--ativo", q > 0);
      const input = card.querySelector("input");
      if (Number(input.value) !== q) input.value = q;
    }
    salvarSelecao();
    renderResumo();
  }

  function selecionados() {
    const doCatalogo = ITENS.filter((it) => estado.qtd[it.id] > 0).map((it) => ({
      id: it.id, nome: it.nome, icone: it.icone, qtd: estado.qtd[it.id], peso: it.peso, tags: it.tags, outro: false,
    }));
    const outros = estado.outros.map((o) => ({ ...o, icone: "📦", tags: GERAL, outro: true }));
    return [...doCatalogo, ...outros];
  }

  function renderResumo() {
    const sel = selecionados();
    const totalItens = sel.reduce((s, i) => s + i.qtd, 0);
    const totalPeso = sel.reduce((s, i) => s + i.qtd * i.peso, 0);
    $("#totalItens").textContent = totalItens.toLocaleString("pt-BR");
    $("#totalPeso").textContent = fmtKg(totalPeso);
    $("#resumoLista").innerHTML = sel.length
      ? sel.map((i) => `<li>${i.icone} ${i.qtd}× ${esc(i.nome)}
          <button type="button" data-remover="${esc(i.id)}" data-outro="${i.outro}" aria-label="Remover ${esc(i.nome)}">×</button></li>`).join("")
      : `<li>Nenhum item selecionado ainda</li>`;
    if (estado.todos.length) renderPontos(); // refaz a lista conforme os itens escolhidos
  }

  $("#listaItens").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-acao]");
    if (!btn) return;
    const id = btn.closest(".item").dataset.id;
    const atual = estado.qtd[id] || 0;
    setQtd(id, btn.dataset.acao === "mais" ? atual + 1 : atual - 1);
  });
  $("#listaItens").addEventListener("change", (e) => {
    if (e.target.matches("input")) setQtd(e.target.closest(".item").dataset.id, e.target.value);
  });

  $("#formOutro").addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = $("#outroNome").value.trim();
    const qtd = Math.max(1, Math.min(999, Math.floor(Number($("#outroQtd").value) || 1)));
    const peso = Math.max(0.01, Math.min(200, Number($("#outroPeso").value) || 0.5));
    if (!nome) return;
    estado.outros.push({ id: `outro-${Date.now()}`, nome, qtd, peso });
    salvarSelecao();
    renderResumo();
    e.target.reset();
    $("#outroQtd").value = 1;
    $("#outroPeso").value = 0.5;
    toast(`"${nome}" adicionado.`);
  });

  $("#resumoLista").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remover]");
    if (!btn) return;
    if (btn.dataset.outro === "true") {
      estado.outros = estado.outros.filter((o) => o.id !== btn.dataset.remover);
      salvarSelecao();
      renderResumo();
    } else {
      setQtd(btn.dataset.remover, 0);
    }
  });

  function limparSelecao() {
    estado.qtd = {};
    estado.outros = [];
    salvarSelecao();
    renderItens();
    renderResumo();
  }
  $("#btnLimpar").addEventListener("click", limparSelecao);

  /* ---------- Localização ----------
   * O CEP/endereço é convertido em coordenadas pela API do projeto (com cache no servidor).
   * O navegador não chama serviços externos de mapa, para não ser bloqueado por excesso
   * de buscas quando muitas pessoas usam a mesma rede. */
  async function localizarPorTexto(texto) {
    return apiFetch(`localizar?q=${encodeURIComponent(texto)}`);
  }

  $("#btnGeo").addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      status("Seu navegador não permite localização. Digite um CEP ou endereço.", true);
      return;
    }
    status("Pedindo permissão de localização…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        buscarPontos({ lat, lon, rotulo: "sua localização" });
      },
      (err) => {
        const msg = err.code === 1
          ? "Permissão de localização negada. Digite um CEP ou endereço."
          : "Não foi possível obter sua localização. Digite um CEP ou endereço.";
        status(msg, true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });

  $("#formEndereco").addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = $("#endereco").value.trim();
    if (!texto) return;
    status("Procurando endereço…");
    $("#resultado").hidden = true;
    $("#fallback").hidden = true;
    const botao = e.target.querySelector("button");
    botao.disabled = true;
    try {
      const origem = await localizarPorTexto(texto);
      await buscarPontos(origem);
    } catch (err) {
      status(err.message || "Não foi possível buscar esse endereço. Tente novamente.", true);
    } finally {
      botao.disabled = false;
    }
  });

  /* ---------- Pontos de coleta ----------
   * 1º) Banco do projeto (pontos da Grande Vitória pesquisados e cadastrados): mostra os 5 mais próximos.
   * 2º) Se a pessoa estiver fora da região (nenhum ponto cadastrado perto), busca ao vivo no OpenStreetMap.
   * O mapa fica escondido até a pessoa clicar em "Achar pelo mapa". */
  const LIMITE_LISTA = 5;
  const DIST_MAX_CADASTRO_KM = 40; // além disso, consideramos que a pessoa está fora da Grande Vitória

  function pontoDoBanco(p) {
    return {
      id: `db/${p.codigo}`,
      nome: p.nome,
      endereco: [p.endereco, p.bairro].filter(Boolean).join(" - ") + (p.cidade ? `, ${p.cidade}` : ""),
      horario: p.horario || "",
      telefone: p.telefone || "",
      lat: p.lat, lon: p.lon,
      aceita: p.aceita || [],
      fonte: "Cadastro do projeto",
      fonteUrl: p.fonte_url || "",
      fonteData: p.fonte_data || "",
      confianca: p.confianca || "",
      observacao: p.observacao || "",
    };
  }

  // Servidores públicos e gratuitos da Overpass API (usados só fora da Grande Vitória).
  const OVERPASS = [
    ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"],
    ["https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"],
  ];
  const TAGS_BUSCA = Object.keys(CATEGORIAS);

  function montarConsulta(lat, lon, raioM) {
    const a = `(around:${raioM},${lat},${lon})`;
    return `[out:json][timeout:25];
(
  nwr["amenity"="recycling"]${a};
  nwr["recycling:batteries"="yes"]${a};
  nwr["recycling:mobile_phones"="yes"]${a};
  nwr["recycling:electrical_items"="yes"]${a};
  nwr["recycling:computers"="yes"]${a};
);
out center 300;`;
  }

  async function consultarOverpass(consulta) {
    let ultimoErro;
    for (const [i, par] of OVERPASS.entries()) {
      if (i > 0) status("Os servidores de mapa estão lentos, tentando outro…");
      try {
        return await Promise.any(par.map(async (url) => {
          const j = await fetchJson(url, { method: "POST", body: new URLSearchParams({ data: consulta }) }, 30000);
          if (!Array.isArray(j.elements)) throw new Error("Resposta inválida");
          return j;
        }));
      } catch (err) {
        ultimoErro = err;
      }
    }
    throw ultimoErro;
  }

  function enderecoDe(tags) {
    const rua = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
    return [rua, tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(" - ");
  }

  function converterElemento(el) {
    const t = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) return null;
    const aceita = TAGS_BUSCA.filter((k) => t[`recycling:${k}`] === "yes");
    if (!aceita.length) return null; // coletor que não recebe eletrônicos (só papel, vidro…)
    const tipo = t.shop ? "Loja" : t.amenity === "recycling" ? "Coletor" : "";
    return {
      id: `${el.type}/${el.id}`,
      nome: t.name || t.operator || t.brand || (tipo ? `${tipo} (sem nome)` : "Ponto de coleta (sem nome)"),
      endereco: enderecoDe(t),
      horario: t.opening_hours || "",
      telefone: t.phone || t["contact:phone"] || "",
      lat, lon, aceita,
      fonte: "OpenStreetMap",
    };
  }

  async function buscarNoOsm(origem) {
    const raioKm = CONFIG.RAIO_PADRAO_KM;
    const chaveCache = `dc_cache_${origem.lat.toFixed(2)}_${origem.lon.toFixed(2)}_${raioKm}`;
    const cache = store.get(chaveCache, null);
    if (cache && Date.now() - cache.quando < 7 * 24 * 3600 * 1000) return cache.pontos;
    try {
      const dados = await consultarOverpass(montarConsulta(origem.lat, origem.lon, raioKm * 1000));
      const vistos = new Set();
      const pontos = (dados.elements || []).map(converterElemento).filter((p) => p && !vistos.has(p.id) && vistos.add(p.id));
      store.set(chaveCache, { quando: Date.now(), pontos });
      return pontos;
    } catch (err) {
      if (cache) return cache.pontos;
      throw err;
    }
  }

  const comDistancia = (lista, origem) =>
    lista.map((p) => ({ ...p, dist: distanciaKm(origem.lat, origem.lon, p.lat, p.lon) })).sort((a, b) => a.dist - b.dist);

  async function buscarPontos(origem) {
    estado.origem = origem;
    estado.todos = [];
    estado.pontos = [];
    esconderMapa();
    $("#resultado").hidden = true;
    $("#fallback").hidden = true;
    $("#listaPontos").innerHTML = "";
    $("#tituloLista").textContent = "";
    status(`Procurando os pontos mais próximos de ${origem.rotulo}…`);
    $("#btnGeo").disabled = true;

    let doBanco = [];
    try {
      const r = await apiFetch(`pontos?lat=${origem.lat}&lon=${origem.lon}&limite=200`);
      doBanco = r.pontos.map(pontoDoBanco);
    } catch { /* sem API: segue para o OpenStreetMap */ }

    let lista = comDistancia(doBanco, origem);
    estado.modo = "cadastro";
    if (!lista.length || lista[0].dist > DIST_MAX_CADASTRO_KM) {
      // Fora da Grande Vitória: busca ao vivo no OpenStreetMap.
      estado.modo = "osm";
      status(`Você está fora da área cadastrada. Buscando no OpenStreetMap perto de ${origem.rotulo}…`);
      try {
        lista = comDistancia(await buscarNoOsm(origem), origem);
      } catch {
        lista = [];
        status("O serviço de mapas está fora do ar agora. Tente de novo em instantes ou use as opções abaixo.", true);
      }
    }

    estado.todos = lista;
    $("#btnGeo").disabled = false;
    $("#resultado").hidden = false;
    $("#fallback").hidden = false;
    $("#linkGoogle").href =
      `https://www.google.com/maps/search/descarte+de+lixo+eletr%C3%B4nico/@${origem.lat},${origem.lon},13z`;
    $("#btnMapa").hidden = !estado.todos.length;

    if (estado.todos.length) {
      status(`Perto de ${origem.rotulo}.`);
    } else if (!$("#status").classList.contains("status--erro")) {
      status("Não encontramos pontos cadastrados perto de você. Veja as opções abaixo.");
    }
    renderPontos();
  }

  function compatibilidade(ponto, sel) {
    if (!sel.length) return null;
    const aceitos = sel.filter((i) => i.tags.some((t) => ponto.aceita.includes(t)));
    return { aceitos: aceitos.length, total: sel.length };
  }

  // Escolhe os 5 da lista. Com itens escolhidos na calculadora: primeiro os pontos que aceitam
  // TODOS os itens (do mais perto ao mais longe), depois os que aceitam pelo menos um.
  function escolherProximos(sel) {
    if (!sel.length) return estado.todos.slice(0, LIMITE_LISTA);
    const todosItens = [], algunsItens = [];
    for (const p of estado.todos) {
      const c = compatibilidade(p, sel);
      if (c.aceitos === c.total) todosItens.push(p);
      else if (c.aceitos > 0) algunsItens.push(p);
    }
    const escolhidos = [...todosItens, ...algunsItens].slice(0, LIMITE_LISTA);
    return escolhidos.length ? escolhidos : estado.todos.slice(0, LIMITE_LISTA);
  }

  function htmlCard(p, sel) {
    const categoriasUsuario = new Set(sel.flatMap((i) => i.tags));
    const rotulos = [...new Set(p.aceita.map((a) => CATEGORIAS[a]).filter(Boolean))];
    const okRotulos = new Set(p.aceita.filter((a) => categoriasUsuario.has(a)).map((a) => CATEGORIAS[a]));
    const c = compatibilidade(p, sel);
    const compat = c
      ? `<p class="ponto__compat ${c.aceitos === c.total ? "ponto__compat--total" : "ponto__compat--parcial"}">
           ${c.aceitos === c.total ? "✔ Aceita todos os seus itens" : `Aceita ${c.aceitos} de ${c.total} dos seus itens`}
         </p>` : "";
    const extra = [p.horario && `🕒 ${esc(p.horario)}`, p.telefone && `📞 ${esc(p.telefone)}`].filter(Boolean).join(" · ");
    const aviso = p.fonte === "Cadastro do projeto"
      ? `<p class="ponto__fonte">${p.observacao ? `${esc(p.observacao)} ` : ""}${p.fonteUrl
          ? `<a href="${esc(p.fonteUrl)}" target="_blank" rel="noopener">Fonte${p.fonteData && p.fonteData !== "desconhecida" ? ` (${esc(p.fonteData)})` : ""}</a>. `
          : ""}${p.confianca === "alta" ? "" : "Confirme o funcionamento antes de ir."}</p>`
      : `<p class="ponto__fonte">Dados do OpenStreetMap. Confirme antes de ir.</p>`;
    return `
      <article class="ponto" data-id="${esc(p.id)}">
        <div class="ponto__topo">
          <h3 class="ponto__nome">${esc(p.nome)}</h3>
          <span class="ponto__dist">${fmtKm(p.dist)}</span>
        </div>
        <p class="ponto__end">${esc(p.endereco || "Endereço não informado")}</p>
        <div class="tags">${rotulos.map((r) => `<span class="tag ${okRotulos.has(r) ? "tag--ok" : ""}">${esc(r)}</span>`).join("")}</div>
        ${compat}
        ${extra ? `<p class="ponto__extra">${extra}</p>` : ""}
        ${aviso}
        <div class="ponto__acoes">
          <a class="btn btn--secundario btn--pequeno" target="_blank" rel="noopener"
             href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}">Como chegar</a>
          <button class="btn btn--ghost btn--pequeno" type="button" data-registrar="${esc(p.id)}">Registrar descarte aqui</button>
        </div>
      </article>`;
  }

  function renderPontos() {
    const sel = selecionados();
    estado.pontos = escolherProximos(sel);
    const n = estado.pontos.length;
    $("#tituloLista").textContent = !n ? "" : sel.length
      ? (n === 1 ? "O ponto mais próximo para os seus itens" : `Os ${n} pontos mais próximos para os seus itens`)
      : (n === 1 ? "O ponto de descarte mais próximo" : `Os ${n} pontos de descarte mais próximos`);
    $("#dicaLista").hidden = !n || sel.length > 0;
    $("#listaPontos").innerHTML = estado.pontos.map((p) => htmlCard(p, sel)).join("");
    if (mapa && !$("#mapaArea").hidden) {
      desenharMapa();
      if (estado.pontoMapa) mostrarPontoDoMapa(estado.pontoMapa);
    }
  }

  /* ---------- Mapa (Leaflet + OpenStreetMap), só quando a pessoa pede ---------- */
  let mapa, camada;

  function esconderMapa() {
    $("#mapaArea").hidden = true;
    $("#btnMapa").textContent = "🗺️ Achar pelo mapa";
    estado.pontoMapa = null;
    $("#pontoMapa").innerHTML = "";
  }

  $("#btnMapa").addEventListener("click", () => {
    if (!$("#mapaArea").hidden) { esconderMapa(); return; }
    $("#mapaArea").hidden = false;
    $("#btnMapa").textContent = "Esconder mapa";
    desenharMapa();
    $("#mapaArea").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function desenharMapa() {
    if (typeof L === "undefined") {
      $("#mapa").innerHTML = `<p class="sub" style="padding:1rem">Não foi possível carregar o mapa.</p>`;
      return;
    }
    if (!mapa) {
      mapa = L.map("mapa", { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa);
      camada = L.layerGroup().addTo(mapa);
    }
    camada.clearLayers();

    const { lat, lon } = estado.origem;
    L.circleMarker([lat, lon], { radius: 9, color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 3 })
      .bindTooltip("Você está aqui").addTo(camada);

    const proximos = new Set(estado.pontos.map((p) => p.id));
    estado.todos.forEach((p) => {
      const destaque = proximos.has(p.id);
      L.circleMarker([p.lat, p.lon], {
        radius: destaque ? 9 : 7, color: "#0b3b2e", weight: 2,
        fillColor: destaque ? "#22a877" : "#9bd9bf", fillOpacity: 0.95,
      })
        .bindTooltip(`${p.nome} · ${fmtKm(p.dist)}`)
        .on("click", () => mostrarPontoDoMapa(p))
        .addTo(camada);
    });

    // Enquadra a pessoa e os pontos mais próximos; o resto aparece ao afastar o zoom.
    const limites = [[lat, lon], ...estado.pontos.map((p) => [p.lat, p.lon])];
    setTimeout(() => {
      mapa.invalidateSize();
      if (limites.length > 1) mapa.fitBounds(limites, { padding: [30, 30], maxZoom: 15 });
      else mapa.setView([lat, lon], 13);
    }, 50);
  }

  function mostrarPontoDoMapa(p) {
    estado.pontoMapa = p;
    $("#pontoMapa").innerHTML = htmlCard(p, selecionados());
  }

  function acharPonto(id) {
    return estado.todos.find((p) => p.id === id) || estado.pontos.find((p) => p.id === id);
  }

  document.querySelector("#resultado").addEventListener("click", (e) => {
    const reg = e.target.closest("button[data-registrar]");
    if (reg) registrarDescarte(reg.dataset.registrar);
  });

  /* ---------- Conta (cadastro / login) ----------
   * "Minha conta" e "Histórico" ficam em outra página (conta.html), em abas. */
  let acaoPendente = null;
  const modal = $("#modalConta");

  function renderConta() {
    const conta = $("#conta");
    if (estado.perfil) {
      conta.innerHTML = `
        <a class="conta__nome" href="conta.html#conta" title="Minha conta">Olá, ${esc(estado.perfil.nome.split(" ")[0])}</a>
        <a class="btn btn--ghost btn--pequeno" href="conta.html#conta">Minha conta</a>
        <a class="btn btn--ghost btn--pequeno conta__so-desktop" href="conta.html#historico">Histórico</a>
        <button class="btn btn--ghost btn--pequeno" id="btnSair" type="button">Sair</button>`;
      $("#btnSair").addEventListener("click", sair);
    } else {
      conta.innerHTML = `
        <button class="btn btn--ghost btn--pequeno" id="btnEntrar" type="button">Entrar</button>
        <button class="btn btn--primario btn--pequeno" id="btnCadastrar" type="button">Cadastre-se</button>`;
      $("#btnEntrar").addEventListener("click", () => abrirConta("login"));
      $("#btnCadastrar").addEventListener("click", () => abrirConta("cadastro"));
    }
    $("#btnCadastreHero").hidden = !!estado.perfil;
  }

  function modoConta(modo) {
    modal.dataset.modo = modo;
    modal.querySelectorAll(".aba").forEach((a) => {
      const ativa = a.dataset.modo === modo;
      a.classList.toggle("aba--ativa", ativa);
      a.setAttribute("aria-selected", String(ativa));
    });
    $("#btnEnviarConta").textContent = modo === "cadastro" ? "Criar conta" : "Entrar";
    $("#contaSenha").autocomplete = modo === "cadastro" ? "new-password" : "current-password";
    $("#contaErro").textContent = "";
  }

  function abrirConta(modo = "cadastro", depois = null) {
    acaoPendente = depois;
    $("#formConta").reset();
    modoConta(modo);
    modal.showModal();
    (modo === "cadastro" ? $("#contaNome") : $("#contaEmail")).focus();
  }

  modal.querySelectorAll(".aba").forEach((a) => a.addEventListener("click", () => modoConta(a.dataset.modo)));
  $("#btnFecharConta").addEventListener("click", () => { acaoPendente = null; modal.close(); });
  $("#btnCadastreHero").addEventListener("click", () => abrirConta("cadastro"));

  $("#formConta").addEventListener("submit", async (e) => {
    e.preventDefault();
    const modo = modal.dataset.modo;
    const nome = $("#contaNome").value.trim();
    const email = $("#contaEmail").value.trim();
    const senha = $("#contaSenha").value;
    const erro = $("#contaErro");
    if (modo === "cadastro" && nome.length < 2) { erro.textContent = "Informe seu nome."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro.textContent = "Informe um e-mail válido."; return; }
    if (modo === "cadastro" && senha.length < 8) { erro.textContent = "A senha precisa ter pelo menos 8 caracteres."; return; }
    if (!senha) { erro.textContent = "Informe sua senha."; return; }

    const botao = $("#btnEnviarConta");
    botao.disabled = true;
    erro.textContent = "";
    try {
      const dados = await apiFetch(modo === "cadastro" ? "cadastro" : "login", {
        method: "POST",
        body: modo === "cadastro" ? { nome, email, senha } : { email, senha },
      });
      estado.perfil = dados.usuario;
      estado.historico = dados.historico || [];
      const depois = acaoPendente;
      acaoPendente = null;
      modal.close();
      renderConta();
      toast(modo === "cadastro"
        ? `Conta criada. Bem-vindo(a), ${estado.perfil.nome.split(" ")[0]}!`
        : `Olá de novo, ${estado.perfil.nome.split(" ")[0]}!`);
      if (depois) depois();
    } catch (err) {
      erro.textContent = err.message;
    } finally {
      botao.disabled = false;
    }
  });

  async function sair() {
    try { await apiFetch("logout", { method: "POST" }); } catch { /* sai localmente mesmo assim */ }
    estado.perfil = null;
    estado.historico = [];
    renderConta();
    toast("Você saiu da sua conta.");
  }

  async function registrarDescarte(idPonto) {
    const sel = selecionados();
    if (!sel.length) {
      toast("Selecione os itens que você vai descartar primeiro.");
      $("#calcular").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!estado.perfil) {
      abrirConta("cadastro", () => registrarDescarte(idPonto));
      return;
    }
    const ponto = acharPonto(idPonto);
    const peso = sel.reduce((s, i) => s + i.qtd * i.peso, 0);
    try {
      const dados = await apiFetch("descartes", {
        method: "POST",
        body: {
          ponto: ponto ? ponto.nome : "Ponto de coleta",
          itens: sel.map((i) => ({ nome: i.nome, qtd: i.qtd, peso: i.peso })),
        },
      });
      estado.historico = dados.historico;
      limparSelecao();
      carregarEstatisticas();
      toast(`Descarte de ${fmtKg(peso)} salvo no seu histórico (Minha conta). Obrigado por cuidar do meio ambiente! 🌱`);
    } catch (err) {
      if (err.status === 401) { estado.perfil = null; renderConta(); abrirConta("login", () => registrarDescarte(idPonto)); }
      else toast(err.message);
    }
  }

  /* ---------- Avaliação (Google Forms opcional) ---------- */
  if (CONFIG.FORM_URL) {
    $("#avaliacao").hidden = false;
    $("#linkForm").href = CONFIG.FORM_URL;
  }

  /* ---------- Números da comunidade (todos os usuários) ---------- */
  async function carregarEstatisticas() {
    try {
      const e = await apiFetch("estatisticas");
      const el = $("#estatisticas");
      if (e.descartes > 0) {
        el.textContent = `🌱 A comunidade já registrou ${fmtKg(e.pesoKg)} de lixo eletrônico descartado corretamente.`;
        el.hidden = false;
      }
    } catch { /* sem servidor: só não mostra */ }
  }

  /* ---------- Início ---------- */
  renderItens();
  renderResumo();
  renderConta();
  carregarEstatisticas();

  // Vindo da página "Minha área" sem login: ./?entrar=login&voltar=conta abre o login
  // e, depois de entrar, volta para conta.html.
  const params = new URLSearchParams(location.search);
  const pedidoEntrar = params.get("entrar");
  const voltarConta = params.get("voltar") === "conta";
  if (pedidoEntrar) history.replaceState(null, "", location.pathname + location.hash);

  apiFetch("me")
    .then((d) => {
      if (d.usuario) {
        estado.perfil = d.usuario;
        estado.historico = d.historico;
        renderConta();
        if (voltarConta) location.replace("conta.html");
      } else if (pedidoEntrar) {
        abrirConta(pedidoEntrar === "cadastro" ? "cadastro" : "login", voltarConta ? () => { location.href = "conta.html"; } : null);
      }
    })
    .catch(() => { /* sem servidor: site segue funcionando sem conta */ });
})();
