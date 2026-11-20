/* Pontos de coleta: localização ou CEP → 5 pontos mais próximos, mapa sob demanda e alternativas.
 * 1º) Banco do projeto (pontos da Grande Vitória pesquisados e cadastrados), pela API.
 * 2º) Fora da Grande Vitória (nenhum ponto cadastrado perto), busca ao vivo no OpenStreetMap. */
import { lazy, Suspense, useMemo, useState } from "react";
import {
  Alert, Anchor, Badge, Box, Button, Card, Center, Container, Group, List, Loader, Paper, SimpleGrid, Text, TextInput, Title,
} from "@mantine/core";
import { CheckCircle2, CircleAlert, Clock, Lightbulb, Map as IconeMapa, MapPin, Navigation, Phone, Search } from "lucide-react";
import { CATEGORIAS } from "../dados.js";
import { apiFetch } from "../comum/api.js";
import { distanciaKm, fmtKm } from "../comum/util.js";
import { buscarNoOsm } from "./osm.js";

const Mapa = lazy(() => import("./Mapa.jsx"));

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

const comDistancia = (lista, origem) =>
  lista.map((p) => ({ ...p, dist: distanciaKm(origem.lat, origem.lon, p.lat, p.lon) })).sort((a, b) => a.dist - b.dist);

function compatibilidade(ponto, sel) {
  if (!sel.length) return null;
  const aceitos = sel.filter((i) => i.tags.some((t) => ponto.aceita.includes(t)));
  return { aceitos: aceitos.length, total: sel.length };
}

// Com itens escolhidos: primeiro os pontos que aceitam TODOS (do mais perto ao mais longe), depois os que aceitam algum.
function escolherProximos(todos, sel) {
  if (!sel.length) return todos.slice(0, LIMITE_LISTA);
  const todosItens = [], algunsItens = [];
  for (const p of todos) {
    const c = compatibilidade(p, sel);
    if (c.aceitos === c.total) todosItens.push(p);
    else if (c.aceitos > 0) algunsItens.push(p);
  }
  const escolhidos = [...todosItens, ...algunsItens].slice(0, LIMITE_LISTA);
  return escolhidos.length ? escolhidos : todos.slice(0, LIMITE_LISTA);
}

export function CartaoPonto({ p, sel, aoRegistrar }) {
  const categoriasUsuario = new Set(sel.flatMap((i) => i.tags));
  const rotulos = [...new Set(p.aceita.map((a) => CATEGORIAS[a]).filter(Boolean))];
  const okRotulos = new Set(p.aceita.filter((a) => categoriasUsuario.has(a)).map((a) => CATEGORIAS[a]));
  const c = compatibilidade(p, sel);
  const total = c && c.aceitos === c.total;
  return (
    <Card withBorder radius="lg" padding="lg" component="article">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Title order={3} fz="md" lh={1.3}>{p.nome}</Title>
        <Badge size="lg" variant="light" style={{ flex: "none" }}>{fmtKm(p.dist)}</Badge>
      </Group>
      <Text size="sm" c="dimmed" mt={4}>{p.endereco || "Endereço não informado"}</Text>
      <Group gap={6} mt="sm">
        {rotulos.map((r) => (
          <Badge key={r} size="sm" radius="sm" variant={okRotulos.has(r) ? "filled" : "outline"} color={okRotulos.has(r) ? "verde.6" : "gray.6"}>{r}</Badge>
        ))}
      </Group>
      {c && (
        <Group gap={6} mt="sm" c={total ? "verde.7" : "orange.8"} wrap="nowrap">
          {total ? <CheckCircle2 size={16} style={{ flex: "none" }} /> : <CircleAlert size={16} style={{ flex: "none" }} />}
          <Text size="sm" fw={700}>{total ? "Aceita todos os seus itens" : `Aceita ${c.aceitos} de ${c.total} dos seus itens`}</Text>
        </Group>
      )}
      {p.horario && <Group gap={6} mt={6} c="dimmed" wrap="nowrap"><Clock size={14} style={{ flex: "none" }} /><Text size="sm">{p.horario}</Text></Group>}
      {p.telefone && <Group gap={6} mt={4} c="dimmed" wrap="nowrap"><Phone size={14} style={{ flex: "none" }} /><Text size="sm">{p.telefone}</Text></Group>}
      <Text size="xs" c="dimmed" mt="sm">
        {p.fonte === "Cadastro do projeto" ? (
          <>
            {p.observacao ? `${p.observacao} ` : ""}
            {p.fonteUrl && <><Anchor href={p.fonteUrl} target="_blank" rel="noopener" fz="xs">Fonte{p.fonteData && p.fonteData !== "desconhecida" ? ` (${p.fonteData})` : ""}</Anchor>. </>}
            {p.confianca === "alta" ? "" : "Confirme o funcionamento antes de ir."}
          </>
        ) : "Dados do OpenStreetMap. Confirme antes de ir."}
      </Text>
      <Group gap="xs" mt="md">
        <Button component="a" size="xs" variant="light" leftSection={<Navigation size={14} />} target="_blank" rel="noopener"
          href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}>Como chegar</Button>
        <Button size="xs" variant="default" onClick={() => aoRegistrar(p)}>Registrar descarte aqui</Button>
      </Group>
    </Card>
  );
}

function Alternativas({ origem }) {
  return (
    <Paper bg="yellow.0" withBorder radius="lg" p="xl" mt="xl" style={{ borderColor: "var(--mantine-color-yellow-3)" }}>
      <Title order={3} fz="lg">Não achou um ponto perto?</Title>
      <Text size="sm" mt="xs">
        A lista traz os pontos da Grande Vitória que o projeto pesquisou nas prefeituras e nos programas de logística reversa
        (Green Eletron, ABREE, Reciclus). Só entram pontos com informação confirmada, então pode faltar algum, e horários mudam. Outras opções:
      </Text>
      <List size="sm" spacing={6} mt="sm">
        <List.Item>
          <b>Correios:</b> desde outubro de 2026, as agências com <em>Balcão do Cidadão</em> recebem de graça eletrônicos pequenos
          (celulares, notebooks, tablets, fones, cabos), em caixa aberta de até 30 kg. Não aceitam pilhas nem lâmpadas. Pergunte na agência mais próxima.{" "}
          <Anchor href="https://www.agazeta.com.br/es/cotidiano/correios-passam-a-receber-lixo-eletronico-em-mais-de-100-agencias-no-es-1026" target="_blank" rel="noopener" inherit>Fonte</Anchor>
        </List.Item>
        <List.Item>
          <Anchor href={`https://www.google.com/maps/search/descarte+de+lixo+eletr%C3%B4nico/@${origem.lat},${origem.lon},13z`} target="_blank" rel="noopener" inherit>
            Pesquisar "descarte de lixo eletrônico" no Google Maps perto de você
          </Anchor>
        </List.Item>
        <List.Item>Lojas de eletrônicos, operadoras de celular e assistências técnicas costumam ter coletores (logística reversa).</List.Item>
        <List.Item>Procure o <b>ecoponto</b> ou a secretaria de meio ambiente da sua prefeitura.</List.Item>
        <List.Item>
          Sites de entidades gestoras de logística reversa, como a{" "}
          <Anchor href="https://greeneletron.org.br/" target="_blank" rel="noopener" inherit>Green Eletron</Anchor>, têm mapas de pontos de entrega.
        </List.Item>
      </List>
    </Paper>
  );
}

export default function Pontos({ sel, aoRegistrar }) {
  const [endereco, setEndereco] = useState("");
  const [status, setStatus] = useState({ msg: "", erro: false });
  const [buscando, setBuscando] = useState(false);
  const [origem, setOrigem] = useState(null);
  const [todos, setTodos] = useState([]);
  const [mapaAberto, setMapaAberto] = useState(false);
  const [pontoMapa, setPontoMapa] = useState(null);

  const proximos = useMemo(() => escolherProximos(todos, sel), [todos, sel]);
  const avisar = (msg, erro = false) => setStatus({ msg, erro });

  async function buscarPontos(o) {
    setOrigem(o); setTodos([]); setMapaAberto(false); setPontoMapa(null);
    avisar(`Procurando os pontos mais próximos de ${o.rotulo}…`);
    setBuscando(true);
    let doBanco = [];
    try {
      const r = await apiFetch(`pontos?lat=${o.lat}&lon=${o.lon}&limite=200`);
      doBanco = r.pontos.map(pontoDoBanco);
    } catch { /* sem API: segue para o OpenStreetMap */ }

    let lista = comDistancia(doBanco, o);
    let erro = false;
    if (!lista.length || lista[0].dist > DIST_MAX_CADASTRO_KM) {
      avisar(`Você está fora da área cadastrada. Buscando no OpenStreetMap perto de ${o.rotulo}…`);
      try {
        lista = comDistancia(await buscarNoOsm(o, () => avisar("Os servidores de mapa estão lentos, tentando outro…")), o);
      } catch {
        lista = [];
        erro = true;
        avisar("O serviço de mapas está fora do ar agora. Tente de novo em instantes ou use as opções abaixo.", true);
      }
    }
    setTodos(lista);
    setBuscando(false);
    if (lista.length) avisar(`Perto de ${o.rotulo}.`);
    else if (!erro) avisar("Não encontramos pontos cadastrados perto de você. Veja as opções abaixo.");
  }

  function usarLocalizacao() {
    if (!("geolocation" in navigator)) return avisar("Seu navegador não permite localização. Digite um CEP ou endereço.", true);
    avisar("Pedindo permissão de localização…");
    navigator.geolocation.getCurrentPosition(
      (pos) => buscarPontos({ lat: pos.coords.latitude, lon: pos.coords.longitude, rotulo: "sua localização" }),
      (err) => avisar(err.code === 1
        ? "Permissão de localização negada. Digite um CEP ou endereço."
        : "Não foi possível obter sua localização. Digite um CEP ou endereço.", true),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function buscarEndereco(e) {
    e.preventDefault();
    const texto = endereco.trim();
    if (!texto) return;
    avisar("Procurando endereço…");
    setOrigem(null); setTodos([]);
    setBuscando(true);
    try {
      const o = await apiFetch(`localizar?q=${encodeURIComponent(texto)}`);
      await buscarPontos(o);
    } catch (err) {
      setBuscando(false);
      avisar(err.message || "Não foi possível buscar esse endereço. Tente novamente.", true);
    }
  }

  const n = proximos.length;
  const titulo = !n ? "" : sel.length
    ? (n === 1 ? "O ponto mais próximo para os seus itens" : `Os ${n} pontos mais próximos para os seus itens`)
    : (n === 1 ? "O ponto de descarte mais próximo" : `Os ${n} pontos de descarte mais próximos`);
  const buscou = !!origem && !buscando;

  return (
    <Container id="pontos" component="section" size="lg" py={{ base: 48, md: 72 }} style={{ scrollMarginTop: 68 }}>
      <Title order={2} fz={{ base: 28, md: 36 }} c="verde.9">Pontos de descarte perto de você</Title>
      <Text c="dimmed" mt={6}>Digite seu CEP ou use sua localização. Mostramos os pontos mais próximos da Grande Vitória cadastrados pelo projeto.</Text>

      <Paper withBorder radius="xl" p="sm" mt="lg">
        <Group gap="sm" wrap="wrap">
          <Button size="md" leftSection={<MapPin size={18} />} onClick={usarLocalizacao} disabled={buscando}>Usar minha localização</Button>
          <Text c="dimmed" size="sm">ou</Text>
          <Group component="form" onSubmit={buscarEndereco} gap="sm" wrap="nowrap" style={{ flex: "1 1 280px" }}>
            <TextInput size="md" radius="xl" style={{ flex: 1 }} placeholder="CEP ou endereço (ex.: 29160-000)" aria-label="CEP ou endereço"
              leftSection={<Search size={16} />} value={endereco} onChange={(e) => setEndereco(e.currentTarget.value)} required />
            <Button size="md" variant="light" type="submit" loading={buscando && !origem}>Buscar</Button>
          </Group>
        </Group>
      </Paper>

      {status.msg && (
        <Group gap="xs" mt="md" c={status.erro ? "red.7" : "dimmed"} role="status" wrap="nowrap">
          {buscando && <Loader size="xs" color="verde" />}
          <Text size="sm" fw={status.erro ? 700 : 400}>{status.msg}</Text>
        </Group>
      )}

      {buscou && n > 0 && (
        <>
          <Title order={3} fz="xl" mt="lg" c="verde.9">{titulo}</Title>
          {!sel.length && (
            <Alert variant="light" color="yellow" radius="lg" mt="sm" icon={<Lightbulb size={18} />}>
              Escolha seus itens <Anchor href="#calcular" inherit fw={700}>na calculadora</Anchor> para ver só os pontos que aceitam o que você tem.
            </Alert>
          )}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mt="md">
            {proximos.map((p) => <CartaoPonto key={p.id} p={p} sel={sel} aoRegistrar={aoRegistrar} />)}
          </SimpleGrid>
          <Center mt="xl">
            <Button variant="light" size="md" leftSection={<IconeMapa size={18} />}
              onClick={() => { setMapaAberto((v) => !v); setPontoMapa(null); }}>
              {mapaAberto ? "Esconder mapa" : "Achar pelo mapa"}
            </Button>
          </Center>
          {mapaAberto && (
            <Box mt="lg">
              <Text size="sm" c="dimmed" mb="sm">Toque em um ponto do mapa para ver os detalhes. Os pontos verde-escuros são os mais próximos.</Text>
              <Suspense fallback={<Center h={380}><Loader color="verde" /></Center>}>
                <Mapa origem={origem} todos={todos} proximos={proximos} aoClicar={setPontoMapa} />
              </Suspense>
              {pontoMapa && <Box mt="md" maw={520}><CartaoPonto p={pontoMapa} sel={sel} aoRegistrar={aoRegistrar} /></Box>}
            </Box>
          )}
        </>
      )}

      {buscou && <Alternativas origem={origem} />}
    </Container>
  );
}
