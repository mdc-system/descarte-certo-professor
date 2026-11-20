/* Calculadora: itens do catálogo, "outro item" e a barra de resumo. */
import { useState } from "react";
import {
  ActionIcon, Box, Button, Card, Container, Group, NumberInput, Paper, Pill, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title,
} from "@mantine/core";
import { MapPin, Minus, Plus } from "lucide-react";
import { ITENS } from "../dados.js";
import { fmtKg } from "../comum/util.js";
import { avisar } from "../comum/Raiz.jsx";

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

function CartaoItem({ it, q, setQ }) {
  const ativo = q > 0;
  return (
    <Card withBorder radius="lg" padding="md"
      style={{
        borderColor: ativo ? "var(--mantine-color-verde-6)" : undefined,
        boxShadow: ativo ? "0 0 0 3px var(--mantine-color-verde-1)" : undefined,
        transition: "box-shadow .2s, border-color .2s",
      }}>
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <ThemeIcon size={44} radius="md" variant={ativo ? "filled" : "light"} aria-hidden="true" style={{ flex: "none" }}>
          <it.Icone size={22} />
        </ThemeIcon>
        <Box style={{ minWidth: 0 }}>
          <Text fw={700} size="sm" lh={1.3} style={{ overflowWrap: "anywhere" }}>{it.nome}</Text>
          <Text size="xs" c="dimmed">≈ {fmtKg(it.peso)} / un.</Text>
        </Box>
      </Group>
      <Group justify="space-between" mt="md" wrap="nowrap" gap={6}>
        <ActionIcon variant="light" radius="xl" size="lg" aria-label={`Diminuir ${it.nome}`} onClick={() => setQ(q - 1)}><Minus size={16} /></ActionIcon>
        <NumberInput value={q} onChange={(v) => setQ(typeof v === "number" ? v : 0)} min={0} max={999} clampBehavior="strict"
          allowDecimal={false} allowNegative={false} hideControls w={58} size="sm" radius="md"
          aria-label={`Quantidade de ${it.nome}`} styles={{ input: { textAlign: "center", fontWeight: 700 } }} />
        <ActionIcon variant="light" radius="xl" size="lg" aria-label={`Aumentar ${it.nome}`} onClick={() => setQ(q + 1)}><Plus size={16} /></ActionIcon>
      </Group>
    </Card>
  );
}

function OutroItem({ aoAdicionar }) {
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState(1);
  const [peso, setPeso] = useState(0.5);
  function enviar(e) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return;
    aoAdicionar({
      id: `outro-${Date.now()}`,
      nome: n,
      qtd: limitar(Math.floor(Number(qtd) || 1), 1, 999),
      peso: limitar(Number(peso) || 0.5, 0.01, 200),
    });
    avisar(`"${n}" adicionado.`);
    setNome(""); setQtd(1); setPeso(0.5);
  }
  return (
    <Paper component="form" onSubmit={enviar} autoComplete="off" withBorder radius="lg" p="lg" mt="lg"
      style={{ borderStyle: "dashed", borderColor: "var(--mantine-color-verde-3)" }}>
      <Title order={3} fz="md">Não achou o item? Adicione</Title>
      <Group mt="sm" align="flex-end" gap="sm" wrap="wrap">
        <TextInput label="Item" placeholder="Ex.: caixa de som" maxLength={60} required value={nome}
          onChange={(e) => setNome(e.currentTarget.value)} style={{ flex: "2 1 220px" }} />
        <NumberInput label="Quantidade" min={1} max={999} allowDecimal={false} clampBehavior="strict" value={qtd} onChange={setQtd}
          style={{ flex: "1 1 120px" }} />
        <NumberInput label="Peso aproximado por unidade (kg)" min={0.01} max={200} step={0.1} decimalScale={2} decimalSeparator=","
          value={peso} onChange={setPeso} style={{ flex: "1 1 200px" }} />
        <Button type="submit" variant="light">Adicionar</Button>
      </Group>
    </Paper>
  );
}

function Resumo({ sel, aoRemover, aoLimpar }) {
  const totalItens = sel.reduce((s, i) => s + i.qtd, 0);
  const totalPeso = sel.reduce((s, i) => s + i.qtd * i.peso, 0);
  return (
    <Paper pos="sticky" bottom={12} bg="verde.9" c="white" radius="xl" p="md" mt="xl" shadow="lg" style={{ zIndex: 40 }} aria-live="polite">
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group gap="xl" wrap="nowrap">
          <Stack gap={0}><Text fz={28} fw={800} lh={1.1}>{totalItens.toLocaleString("pt-BR")}</Text><Text size="xs" tt="uppercase" opacity={0.8}>itens</Text></Stack>
          <Stack gap={0}><Text fz={28} fw={800} lh={1.1}>{fmtKg(totalPeso)}</Text><Text size="xs" tt="uppercase" opacity={0.8}>peso aproximado</Text></Stack>
        </Group>
        <Group gap={6} visibleFrom="sm" style={{ flex: 1, maxHeight: 64, overflow: "auto" }}>
          {sel.length ? sel.map((i) => (
            <Pill key={i.id} size="md" withRemoveButton onRemove={() => aoRemover(i)} bg="rgba(255,255,255,.14)" c="white"
              removeButtonProps={{ "aria-label": `Remover ${i.nome}` }}>
              <Group gap={4} wrap="nowrap" component="span"><i.Icone size={13} aria-hidden="true" /> {i.qtd}× {i.nome}</Group>
            </Pill>
          )) : <Text size="sm" opacity={0.8}>Nenhum item selecionado ainda</Text>}
        </Group>
        <Group gap="xs">
          <Button variant="outline" color="white" onClick={aoLimpar}>Limpar</Button>
          <Button component="a" href="#pontos" color="yellow.5" c="dark.8" rightSection={<MapPin size={16} />}>Encontrar pontos de coleta</Button>
        </Group>
      </Group>
    </Paper>
  );
}

export default function Calculadora({ qtd, setQtdItem, sel, aoAdicionarOutro, aoRemover, aoLimpar }) {
  return (
    <Box id="calcular" component="section" bg="gray.0" py={{ base: 48, md: 72 }} style={{ scrollMarginTop: 68 }}>
      <Container size="lg">
        <Title order={2} fz={{ base: 28, md: 36 }} c="verde.9">O que você tem para descartar?</Title>
        <Text c="dimmed" mt={6}>Toque nos itens e ajuste a quantidade. O peso é uma média aproximada por unidade.</Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing={{ base: "sm", md: "md" }} mt="xl">
          {ITENS.map((it) => (
            <CartaoItem key={it.id} it={it} q={qtd[it.id] || 0} setQ={(v) => setQtdItem(it.id, limitar(Math.floor(Number(v) || 0), 0, 999))} />
          ))}
        </SimpleGrid>
        <OutroItem aoAdicionar={aoAdicionarOutro} />
        <Resumo sel={sel} aoRemover={aoRemover} aoLimpar={aoLimpar} />
      </Container>
    </Box>
  );
}
