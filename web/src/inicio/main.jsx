/* Descarte Certo — página inicial (React + Mantine). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Anchor, Button } from "@mantine/core";
import { LogOut } from "lucide-react";
import Raiz, { avisar } from "../comum/Raiz.jsx";
import { Cabecalho, Rodape, estiloSemQuebra } from "../comum/Moldura.jsx";
import { ModalCodigo, ModalConta } from "../comum/Janelas.jsx";
import { apiFetch } from "../comum/api.js";
import { fmtKg, primeiroNome, store } from "../comum/util.js";
import { GERAL, ICONE_OUTRO, ITENS } from "../dados.js";
import Calculadora from "./Calculadora.jsx";
import Pontos from "./Pontos.jsx";
import { Avaliacao, Hero, PorQue } from "./Secoes.jsx";

/* Sem login nada é salvo: a seleção existe só enquanto a página está aberta.
 * Com login, o histórico de descartes é salvo na conta (banco de dados). */
function PaginaInicio() {
  const [qtd, setQtd] = useState({});
  const [outros, setOutros] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [estatisticas, setEstatisticas] = useState(null);
  const [janela, setJanela] = useState({ aberta: false, modo: "cadastro" });
  const [codigo, setCodigo] = useState(null);
  const depoisDeEntrar = useRef(null);
  const aoGuardarCodigo = useRef(null);

  const sel = useMemo(() => [
    ...ITENS.filter((it) => qtd[it.id] > 0).map((it) => ({ ...it, qtd: qtd[it.id], outro: false })),
    ...outros.map((o) => ({ ...o, Icone: ICONE_OUTRO, tags: GERAL, outro: true })),
  ], [qtd, outros]);

  const carregarEstatisticas = useCallback(async () => {
    try { setEstatisticas(await apiFetch("estatisticas")); } catch { /* sem servidor: só não mostra */ }
  }, []);

  const abrirConta = useCallback((modo = "cadastro", depois = null) => {
    depoisDeEntrar.current = depois;
    setJanela({ aberta: true, modo });
  }, []);

  useEffect(() => {
    // Remove dados da versão antiga do site, que guardava perfil e seleção no navegador.
    ["dc_qtd", "dc_outros", "dc_perfil", "dc_historico"].forEach((k) => store.del(k));
    carregarEstatisticas();
    // Vindo da "Minha área" sem login: ./?entrar=login&voltar=conta abre o login e, depois de entrar, volta para conta.html.
    const params = new URLSearchParams(location.search);
    const pedidoEntrar = params.get("entrar");
    const voltarConta = params.get("voltar") === "conta";
    if (pedidoEntrar) history.replaceState(null, "", location.pathname + location.hash);
    apiFetch("me")
      .then((d) => {
        if (d.usuario) {
          setPerfil(d.usuario);
          if (voltarConta) location.replace("conta.html");
        } else if (pedidoEntrar) {
          abrirConta(pedidoEntrar === "cadastro" ? "cadastro" : "login", voltarConta ? () => { location.href = "conta.html"; } : null);
        }
      })
      .catch(() => { /* sem servidor: o site segue funcionando sem conta */ });
  }, [abrirConta, carregarEstatisticas]);

  async function aoEntrar(dados, modo) {
    setPerfil(dados.usuario);
    const depois = depoisDeEntrar.current;
    depoisDeEntrar.current = null;
    setJanela((j) => ({ ...j, aberta: false }));
    if (dados.codigoRecuperacao) {
      await new Promise((resolve) => { aoGuardarCodigo.current = resolve; setCodigo(dados.codigoRecuperacao); });
    }
    const nome = primeiroNome(dados.usuario.nome);
    avisar({
      cadastro: `Conta criada. Bem-vindo(a), ${nome}!`,
      login: `Olá de novo, ${nome}!`,
      recuperar: `Senha trocada, ${nome}. Use o código novo da próxima vez.`,
    }[modo]);
    if (depois) depois(dados.usuario);
  }

  function guardarCodigo() {
    setCodigo(null);
    const r = aoGuardarCodigo.current;
    aoGuardarCodigo.current = null;
    if (r) r();
  }

  async function sair() {
    try { await apiFetch("logout", { method: "POST" }); } catch { /* sai localmente mesmo assim */ }
    setPerfil(null);
    avisar("Você saiu da sua conta.");
  }

  const limpar = () => { setQtd({}); setOutros([]); };

  async function registrarDescarte(ponto, usuario = perfil) {
    if (!sel.length) {
      avisar("Selecione os itens que você vai descartar primeiro.");
      document.getElementById("calcular")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!usuario) {
      abrirConta("cadastro", (u) => registrarDescarte(ponto, u));
      return;
    }
    const peso = sel.reduce((s, i) => s + i.qtd * i.peso, 0);
    try {
      await apiFetch("descartes", {
        method: "POST",
        body: { ponto: ponto ? ponto.nome : "Ponto de coleta", itens: sel.map((i) => ({ nome: i.nome, qtd: i.qtd, peso: i.peso })) },
      });
      limpar();
      carregarEstatisticas();
      avisar(`Descarte de ${fmtKg(peso)} salvo no seu histórico (Minha conta). Obrigado por cuidar do meio ambiente! 🌱`);
    } catch (err) {
      if (err.status === 401) { setPerfil(null); abrirConta("login", (u) => registrarDescarte(ponto, u)); }
      else avisar(err.message, true);
    }
  }

  return (
    <>
      <Cabecalho
        inicio="#inicio"
        links={[["Por que descartar", "#porque"], ["Calcular", "#calcular"], ["Pontos de coleta", "#pontos"]]}
        menuExtra={perfil
          ? [{ texto: "Minha conta", href: "conta.html#conta" }, { texto: "Histórico", href: "conta.html#historico" }, { texto: "Sair", onClick: sair, cor: "red" }]
          : [{ texto: "Entrar", onClick: () => abrirConta("login") }, { texto: "Cadastre-se", onClick: () => abrirConta("cadastro") }]}
      >
        {perfil ? (
          <>
            <Anchor href="conta.html#conta" fw={700} c="verde.9" visibleFrom="lg" underline="never" style={estiloSemQuebra}>
              Olá, {primeiroNome(perfil.nome)}
            </Anchor>
            <Button component="a" href="conta.html#conta" variant="default" size="sm" visibleFrom="xs">Minha conta</Button>
            <Button component="a" href="conta.html#historico" variant="default" size="sm" visibleFrom="md">Histórico</Button>
            <Button variant="subtle" size="sm" onClick={sair} leftSection={<LogOut size={14} />} visibleFrom="sm">Sair</Button>
          </>
        ) : (
          <>
            <Button variant="default" size="sm" onClick={() => abrirConta("login")} visibleFrom="sm">Entrar</Button>
            <Button size="sm" onClick={() => abrirConta("cadastro")} visibleFrom="xs">Cadastre-se</Button>
          </>
        )}
      </Cabecalho>
      <main>
        <Hero logado={!!perfil} estatisticas={estatisticas} aoCadastrar={() => abrirConta("cadastro")} />
        <PorQue />
        <Calculadora
          qtd={qtd}
          setQtdItem={(id, v) => setQtd((atual) => { const n = { ...atual }; if (v > 0) n[id] = v; else delete n[id]; return n; })}
          sel={sel}
          aoAdicionarOutro={(o) => setOutros((l) => [...l, o])}
          aoRemover={(i) => (i.outro ? setOutros((l) => l.filter((o) => o.id !== i.id)) : setQtd((atual) => { const n = { ...atual }; delete n[i.id]; return n; }))}
          aoLimpar={limpar}
        />
        <Pontos sel={sel} aoRegistrar={(p) => registrarDescarte(p)} />
        <Avaliacao />
      </main>
      <Rodape fontes />
      <ModalConta aberto={janela.aberta} modoInicial={janela.modo} aoEntrar={aoEntrar}
        aoFechar={() => { depoisDeEntrar.current = null; setJanela((j) => ({ ...j, aberta: false })); }} />
      <ModalCodigo codigo={codigo} aoGuardar={guardarCodigo} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<Raiz><PaginaInicio /></Raiz>);
