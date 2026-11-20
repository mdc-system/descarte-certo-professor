/* Descarte Certo — página "Minha área" (abas Minha conta e Histórico). */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtKg = (kg) =>
    kg >= 1
      ? `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`
      : `${Math.round(kg * 1000).toLocaleString("pt-BR")} g`;
  const fmtData = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("toast--visivel");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("toast--visivel"), 3200);
  }

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
      throw new Error("Sem conexão com o servidor. Verifique sua internet e tente de novo.");
    }
    const dados = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(dados.erro || "Não foi possível falar com o servidor."), { status: r.status });
    return dados;
  }

  /* ---------- Abas (as duas seções ficam nesta mesma página) ---------- */
  const SECOES = ["conta", "historico"];

  function mostrarSecao(secao, { atualizarEndereco = true } = {}) {
    if (!SECOES.includes(secao)) secao = "conta";
    for (const s of SECOES) {
      const ativa = s === secao;
      $(`#secao-${s}`).hidden = !ativa;
      const aba = $(`#aba-${s}`);
      aba.classList.toggle("area__aba--ativa", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    }
    if (atualizarEndereco) history.replaceState(null, "", `#${secao}`);
  }

  document.querySelectorAll(".area__aba").forEach((aba) => {
    aba.addEventListener("click", () => mostrarSecao(aba.dataset.secao));
    aba.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const outra = SECOES[(SECOES.indexOf(aba.dataset.secao) + 1) % SECOES.length];
      mostrarSecao(outra);
      $(`#aba-${outra}`).focus();
    });
  });
  window.addEventListener("hashchange", () => mostrarSecao(location.hash.slice(1), { atualizarEndereco: false }));

  /* ---------- Conteúdo ---------- */
  function renderTopo(usuario) {
    const conta = $("#conta");
    if (!usuario) {
      conta.innerHTML = `<a class="btn btn--ghost btn--pequeno" href="./?entrar=login&amp;voltar=conta">Entrar</a>`;
      return;
    }
    conta.innerHTML = `
      <span class="conta__nome">Olá, ${esc(usuario.nome.split(" ")[0])}</span>
      <button class="btn btn--ghost btn--pequeno" id="btnSair" type="button">Sair</button>`;
    $("#btnSair").addEventListener("click", sair);
  }

  function render(usuario, historico) {
    $("#carregando").hidden = true;
    renderTopo(usuario);
    $("#deslogado").hidden = !!usuario;
    $("#logado").hidden = !usuario;
    if (!usuario) return;

    const total = historico.reduce((s, e) => s + e.peso, 0);
    $("#saudacao").textContent = `Olá, ${usuario.nome.split(" ")[0]}!`;
    $("#dadoNome").textContent = usuario.nome;
    $("#dadoEmail").textContent = usuario.email;
    $("#dadoDesde").textContent = usuario.desde ? fmtData(usuario.desde) : "—";
    $("#dadoDescartes").textContent = historico.length.toLocaleString("pt-BR");
    $("#dadoPeso").textContent = total ? fmtKg(total) : "0 kg";
    $("#dadoPrivacidade").innerHTML = (usuario.privacidadeEm ? `Aceito em ${esc(fmtData(usuario.privacidadeEm))} · ` : "")
      + `<a href="privacidade.html">Ler o aviso</a>`;
    renderCodigo(usuario.temCodigo);

    $("#historicoResumo").textContent = historico.length
      ? `Você já registrou ${historico.length} descarte(s), somando aproximadamente ${fmtKg(total)} de lixo eletrônico que não foi para o lixo comum.`
      : "Nenhum descarte registrado ainda. Escolha um ponto de coleta e clique em \"Registrar descarte aqui\".";
    $("#listaHistorico").innerHTML = historico.map((e) => `
      <li>
        <div><strong>${esc(e.ponto)}</strong><br><small>${e.itens.map((i) => `${i.qtd}× ${esc(i.nome)}`).join(", ")}</small></div>
        <div class="historico__lado"><strong>${fmtKg(e.peso)}</strong><br><small>${new Date(e.data).toLocaleDateString("pt-BR")}</small></div>
      </li>`).join("");
    $("#linkNovoDescarte").textContent = historico.length ? "Registrar outro descarte" : "Encontrar pontos de coleta";

    mostrarSecao(location.hash.slice(1) || "conta", { atualizarEndereco: !!location.hash });
  }

  /* ---------- Código de recuperação de senha ---------- */
  let temCodigo = false;
  function renderCodigo(tem) {
    temCodigo = !!tem;
    $("#cartaoCodigo").classList.toggle("cartao--alerta", !temCodigo);
    $("#codigoSituacao").textContent = temCodigo
      ? "Sua conta tem um código de recuperação. Se você perdeu o código, gere um novo: o anterior deixa de valer."
      : "Sua conta ainda não tem código de recuperação. Gere um agora: sem ele, quem esquece a senha perde o acesso ao histórico.";
  }

  $("#btnGerarCodigo").addEventListener("click", async () => {
    if (temCodigo && !confirm("Gerar um novo código? O código anterior deixa de valer.")) return;
    const botao = $("#btnGerarCodigo");
    botao.disabled = true;
    try {
      const { codigoRecuperacao } = await apiFetch("recuperacao/codigo", { method: "POST", body: {} });
      $("#codigoNovo").textContent = codigoRecuperacao;
      $("#codigoNovo").hidden = false;
      $("#codigoAviso").hidden = false;
      renderCodigo(true);
      $("#codigoSituacao").textContent = "Este é o seu novo código de recuperação:";
    } catch (err) {
      toast(err.message);
    } finally {
      botao.disabled = false;
    }
  });

  async function sair() {
    try { await apiFetch("logout", { method: "POST" }); } catch { /* sai mesmo assim */ }
    location.href = "./";
  }

  $("#btnExcluirConta").addEventListener("click", async () => {
    if (!confirm("Excluir sua conta apaga seu cadastro e todo o seu histórico, sem volta. Continuar?")) return;
    const botao = $("#btnExcluirConta");
    botao.disabled = true;
    try {
      await apiFetch("conta", { method: "DELETE" });
      toast("Conta e dados excluídos.");
      setTimeout(() => { location.href = "./"; }, 1200);
    } catch (err) {
      botao.disabled = false;
      toast(err.message);
    }
  });

  /* ---------- Início ---------- */
  apiFetch("me")
    .then((d) => render(d.usuario, d.historico || []))
    .catch((err) => {
      $("#carregando").textContent = err.message;
      $("#carregando").classList.add("status--erro");
    });
})();
