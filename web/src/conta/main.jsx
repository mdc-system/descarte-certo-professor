/* Descarte Certo — "Minha área" (abas Minha conta e Histórico). */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Anchor, Box, Button, Card, Container, Group, Loader, Paper, SimpleGrid, Stack, Tabs, Text, Title,
} from "@mantine/core";
import { ArrowLeft, History, KeyRound, LogOut, MapPin, Trash2, User } from "lucide-react";
import Raiz, { avisar } from "../comum/Raiz.jsx";
import { Cabecalho, Rodape } from "../comum/Moldura.jsx";
import { CodigoGrande, Confirmar } from "../comum/Janelas.jsx";
import { apiFetch } from "../comum/api.js";
import { fmtData, fmtKg, primeiroNome } from "../comum/util.js";

const SECOES = ["conta", "historico"];
const secaoDoEndereco = () => (SECOES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "conta");

function Dado({ rotulo, children }) {
  return (
    <Box>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: ".04em" }}>{rotulo}</Text>
      <Text fw={600} mt={2} style={{ overflowWrap: "anywhere" }}>{children}</Text>
    </Box>
  );
}

function MinhaConta({ usuario, historico, aoMudarCodigo }) {
  const total = historico.reduce((s, e) => s + e.peso, 0);
  const [codigoNovo, setCodigoNovo] = useState("");
  const [gerando, setGerando] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // "codigo" | "excluir" | null
  const [excluindo, setExcluindo] = useState(false);
  const temCodigo = usuario.temCodigo;

  async function gerarCodigo() {
    setConfirmar(null);
    setGerando(true);
    try {
      const { codigoRecuperacao } = await apiFetch("recuperacao/codigo", { method: "POST", body: {} });
      setCodigoNovo(codigoRecuperacao);
      aoMudarCodigo();
    } catch (err) {
      avisar(err.message, true);
    } finally {
      setGerando(false);
    }
  }

  async function excluirConta() {
    setConfirmar(null);
    setExcluindo(true);
    try {
      await apiFetch("conta", { method: "DELETE" });
      avisar("Conta e dados excluídos.");
      setTimeout(() => { location.href = "./"; }, 1200);
    } catch (err) {
      setExcluindo(false);
      avisar(err.message, true);
    }
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="lg" padding="xl">
        <Title order={2} fz="lg">Meus dados</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="md">
          <Dado rotulo="Nome">{usuario.nome}</Dado>
          <Dado rotulo="E-mail">{usuario.email}</Dado>
          <Dado rotulo="Conta criada em">{usuario.desde ? fmtData(usuario.desde) : "—"}</Dado>
          <Dado rotulo="Descartes registrados">{historico.length.toLocaleString("pt-BR")}</Dado>
          <Dado rotulo="Total descartado">{total ? fmtKg(total) : "0 kg"}</Dado>
          <Dado rotulo="Aviso de privacidade">
            {usuario.privacidadeEm ? `Aceito em ${fmtData(usuario.privacidadeEm)} · ` : ""}
            <Anchor href="privacidade.html" inherit>Ler o aviso</Anchor>
          </Dado>
        </SimpleGrid>
      </Card>

      <Card withBorder radius="lg" padding="xl"
        style={!temCodigo && !codigoNovo ? { borderColor: "var(--mantine-color-orange-4)", background: "var(--mantine-color-orange-0)" } : undefined}>
        <Group gap="xs"><KeyRound size={18} /><Title order={2} fz="lg">Código de recuperação</Title></Group>
        <Text size="sm" c="dimmed" mt="xs">
          {codigoNovo
            ? "Este é o seu novo código de recuperação:"
            : temCodigo
              ? "Sua conta tem um código de recuperação. Se você perdeu o código, gere um novo: o anterior deixa de valer."
              : "Sua conta ainda não tem código de recuperação. Gere um agora: sem ele, quem esquece a senha perde o acesso ao histórico."}
        </Text>
        {codigoNovo && (
          <>
            <Box mt="md"><CodigoGrande codigo={codigoNovo} /></Box>
            <Text size="sm" mt="sm">Anote, tire um print ou salve num lugar seguro: <b>ele não será mostrado de novo</b>. O código anterior deixou de valer.</Text>
          </>
        )}
        <Button variant="light" mt="md" w="fit-content" loading={gerando}
          onClick={() => (temCodigo || codigoNovo ? setConfirmar("codigo") : gerarCodigo())}>Gerar novo código</Button>
      </Card>

      <Card withBorder radius="lg" padding="xl" style={{ borderColor: "var(--mantine-color-red-3)" }}>
        <Title order={2} fz="lg" c="red.8">Excluir conta</Title>
        <Text size="sm" mt="xs">Apaga seu cadastro e todo o seu histórico de descartes. Essa ação não pode ser desfeita.</Text>
        <Button color="red" variant="outline" mt="md" w="fit-content" leftSection={<Trash2 size={16} />} loading={excluindo}
          onClick={() => setConfirmar("excluir")}>Excluir minha conta e meus dados</Button>
      </Card>

      <Confirmar aberto={confirmar === "codigo"} titulo="Gerar um novo código?" texto="O código anterior deixa de valer."
        botao="Gerar novo código" aoConfirmar={gerarCodigo} aoCancelar={() => setConfirmar(null)} />
      <Confirmar aberto={confirmar === "excluir"} titulo="Excluir sua conta?" perigo
        texto="Excluir sua conta apaga seu cadastro e todo o seu histórico, sem volta."
        botao="Excluir tudo" aoConfirmar={excluirConta} aoCancelar={() => setConfirmar(null)} />
    </Stack>
  );
}

function Historico({ historico }) {
  const total = historico.reduce((s, e) => s + e.peso, 0);
  return (
    <Card withBorder radius="lg" padding="xl">
      <Title order={2} fz="lg">Meu histórico</Title>
      <Text size="sm" c="dimmed" mt="xs">
        {historico.length
          ? `Você já registrou ${historico.length} descarte(s), somando aproximadamente ${fmtKg(total)} de lixo eletrônico que não foi para o lixo comum.`
          : 'Nenhum descarte registrado ainda. Escolha um ponto de coleta e clique em "Registrar descarte aqui".'}
      </Text>
      {historico.length > 0 && (
        <Stack gap="xs" mt="md" component="ul" p={0} style={{ listStyle: "none" }}>
          {historico.map((e, i) => (
            <Paper key={i} component="li" withBorder radius="md" p="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={700}>{e.ponto}</Text>
                  <Text size="sm" c="dimmed">{e.itens.map((it) => `${it.qtd}× ${it.nome}`).join(", ")}</Text>
                </Box>
                <Box ta="right" style={{ flex: "none" }}>
                  <Text fw={800} c="verde.8">{fmtKg(e.peso)}</Text>
                  <Text size="xs" c="dimmed">{new Date(e.data).toLocaleDateString("pt-BR")}</Text>
                </Box>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
      <Button component="a" href="./#pontos" variant="light" mt="lg" w="fit-content" leftSection={<MapPin size={16} />}>
        {historico.length ? "Registrar outro descarte" : "Encontrar pontos de coleta"}
      </Button>
    </Card>
  );
}

function PaginaConta() {
  const [carga, setCarga] = useState({ estado: "carregando", erro: "", usuario: null, historico: [] });
  const [secao, setSecao] = useState(secaoDoEndereco);

  useEffect(() => {
    apiFetch("me")
      .then((d) => setCarga({ estado: "pronto", erro: "", usuario: d.usuario, historico: d.historico || [] }))
      .catch((err) => setCarga({ estado: "erro", erro: err.message, usuario: null, historico: [] }));
    const aoMudarHash = () => setSecao(secaoDoEndereco());
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  function trocarSecao(s) {
    setSecao(s);
    history.replaceState(null, "", `#${s}`);
  }

  async function sair() {
    try { await apiFetch("logout", { method: "POST" }); } catch { /* sai mesmo assim */ }
    location.href = "./";
  }

  const { usuario, historico } = carga;
  return (
    <>
      <Cabecalho inicio="./" links={[["Calcular", "./#calcular"], ["Pontos de coleta", "./#pontos"]]}>
        {usuario ? (
          <>
            <Text fw={700} c="verde.9" visibleFrom="xs">Olá, {primeiroNome(usuario.nome)}</Text>
            <Button variant="subtle" size="sm" onClick={sair} leftSection={<LogOut size={14} />}>Sair</Button>
          </>
        ) : carga.estado === "pronto" ? (
          <Button component="a" href="./?entrar=login&voltar=conta" variant="default" size="sm">Entrar</Button>
        ) : null}
      </Cabecalho>
      <Box component="main" bg="gray.0" py={{ base: 32, md: 56 }} mih="70vh">
        <Container size="md">
          <Anchor href="./" fw={600} c="verde.7" underline="never">
            <Group gap={6} component="span"><ArrowLeft size={16} /> Voltar para o site</Group>
          </Anchor>

          {carga.estado === "carregando" && <Group mt="xl" gap="sm"><Loader size="sm" color="verde" /><Text c="dimmed">Carregando sua conta…</Text></Group>}
          {carga.estado === "erro" && <Text mt="xl" c="red.7" fw={700}>{carga.erro}</Text>}

          {carga.estado === "pronto" && !usuario && (
            <Paper withBorder radius="lg" p="xl" mt="lg">
              <Title order={1} fz={32} c="verde.9">Minha área</Title>
              <Text mt="sm">Entre na sua conta para ver seus dados e o histórico dos seus descartes.</Text>
              <Group mt="lg">
                <Button component="a" href="./?entrar=login&voltar=conta">Entrar</Button>
                <Button component="a" href="./?entrar=cadastro&voltar=conta" variant="default">Cadastre-se</Button>
              </Group>
            </Paper>
          )}

          {usuario && (
            <>
              <Title order={1} fz={{ base: 30, md: 38 }} c="verde.9" mt="lg">Olá, {primeiroNome(usuario.nome)}!</Title>
              <Tabs value={secao} onChange={trocarSecao} mt="lg" variant="pills" radius="xl" keepMounted={false}>
                <Tabs.List mb="lg">
                  <Tabs.Tab value="conta" leftSection={<User size={16} />}>Minha conta</Tabs.Tab>
                  <Tabs.Tab value="historico" leftSection={<History size={16} />}>Histórico</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="conta">
                  <MinhaConta usuario={usuario} historico={historico}
                    aoMudarCodigo={() => setCarga((c) => ({ ...c, usuario: { ...c.usuario, temCodigo: true } }))} />
                </Tabs.Panel>
                <Tabs.Panel value="historico"><Historico historico={historico} /></Tabs.Panel>
              </Tabs>
            </>
          )}
        </Container>
      </Box>
      <Rodape />
    </>
  );
}

createRoot(document.getElementById("root")).render(<Raiz><PaginaConta /></Raiz>);
