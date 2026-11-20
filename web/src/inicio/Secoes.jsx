/* Seções de conteúdo da página inicial: topo (hero), "Por que descartar" e avaliação. */
import { Box, Button, Card, Container, Group, List, Paper, SimpleGrid, Stack, Text, ThemeIcon, Timeline, Title } from "@mantine/core";
import { ArrowRight, Biohazard, Check, ListChecks, MapPin, Recycle, Scale, Sprout, Weight } from "lucide-react";
import { CONFIG } from "../config.js";
import { fmtKg } from "../comum/util.js";

export function Hero({ logado, estatisticas, aoCadastrar }) {
  const passos = [
    ["Escolha os itens", "17 tipos de aparelhos, com o peso médio de cada um", ListChecks],
    ["Veja o peso total", "quanto você tem guardado para entregar", Weight],
    ["Encontre o ponto mais próximo", "os 5 pontos mais perto de você na Grande Vitória", MapPin],
  ];
  return (
    <Box id="inicio" component="section" py={{ base: 48, md: 88 }} style={{ background: "linear-gradient(180deg, var(--mantine-color-verde-0) 0%, #fff 100%)" }}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={56} style={{ alignItems: "center" }}>
          <Stack gap="lg">
            <Title order={1} fz={{ base: 38, md: 56 }} lh={1.05} c="verde.9">Seu eletrônico velho não é lixo comum.</Title>
            <Text size="lg" c="gray.7">
              Pilhas, celulares e notebooks têm metais que contaminam solo e água quando vão para o lixo de casa.
              Descubra quanto você tem guardado e <b>onde entregar perto de você</b>.
            </Text>
            <Group>
              {!logado && <Button size="lg" onClick={aoCadastrar}>Cadastre-se</Button>}
              <Button component="a" href="#calcular" size="lg" variant="light" rightSection={<ArrowRight size={18} />}>
                {logado ? "Calcular agora" : "Comece sem cadastro"}
              </Button>
            </Group>
          </Stack>
          <Paper withBorder shadow="md" radius="xl" p="xl" aria-hidden="true">
            <Timeline active={2} bulletSize={36} lineWidth={2}>
              {passos.map(([t, d, Ic]) => (
                <Timeline.Item key={t} bullet={<Ic size={18} />} title={<Text fw={700}>{t}</Text>}>
                  <Text size="sm" c="dimmed">{d}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
            {estatisticas?.descartes > 0 && (
              <Group gap="xs" mt="lg" p="sm" bg="verde.0" wrap="nowrap" style={{ borderRadius: "var(--mantine-radius-md)" }}>
                <Sprout size={18} color="var(--mantine-color-verde-7)" style={{ flex: "none" }} />
                <Text size="sm" c="verde.9" fw={600}>A comunidade já registrou {fmtKg(estatisticas.pesoKg)} de lixo eletrônico descartado corretamente.</Text>
              </Group>
            )}
          </Paper>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export function PorQue() {
  const cards = [
    [Biohazard, "Substâncias tóxicas", <>Eletrônicos podem conter chumbo, mercúrio, cádmio e outros metais pesados. No lixo comum, eles podem contaminar o solo e os lençóis freáticos.</>],
    [Scale, "É lei", <>A Política Nacional de Resíduos Sólidos (Lei 12.305/2010) prevê a <em>logística reversa</em>: fabricantes e comerciantes devem receber de volta eletrônicos, pilhas e lâmpadas.</>],
    [Recycle, "Vira matéria-prima", <>Plástico, cobre, alumínio, ouro e outros materiais podem ser recuperados e reaproveitados, reduzindo a extração de novos recursos.</>],
  ];
  return (
    <Container id="porque" component="section" size="lg" py={{ base: 48, md: 72 }} style={{ scrollMarginTop: 68 }}>
      <Title order={2} fz={{ base: 28, md: 36 }} c="verde.9">Por que descartar corretamente?</Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xl" spacing="lg">
        {cards.map(([Ic, t, d]) => (
          <Card key={t} withBorder radius="lg" padding="xl" component="article">
            <ThemeIcon size={52} radius="md" variant="light" aria-hidden="true"><Ic size={28} /></ThemeIcon>
            <Title order={3} fz="lg" mt="md">{t}</Title>
            <Text size="sm" c="dimmed" mt={6}>{d}</Text>
          </Card>
        ))}
      </SimpleGrid>
      <Paper bg="verde.9" c="white" radius="lg" p="xl" mt="lg">
        <Title order={3} fz="lg" c="white">Antes de entregar</Title>
        <List spacing="sm" mt="md" c="verde.0" icon={<ThemeIcon color="verde.4" size={22} radius="xl"><Check size={14} /></ThemeIcon>}>
          <List.Item><Text span c="white" fw={700}>Apague seus dados</Text> do celular e do computador (restauração de fábrica) e retire o chip e o cartão de memória.</List.Item>
          <List.Item><Text span c="white" fw={700}>Se ainda funciona, doe.</Text> Escolas, ONGs e projetos sociais podem reaproveitar.</List.Item>
          <List.Item><Text span c="white" fw={700}>Pilhas e baterias</Text> devem ser guardadas secas, em um pote fechado, até a entrega. Baterias estufadas não devem ser furadas.</List.Item>
          <List.Item><Text span c="white" fw={700}>Lâmpadas fluorescentes</Text> têm mercúrio: embale para não quebrar.</List.Item>
        </List>
      </Paper>
    </Container>
  );
}

export function Avaliacao() {
  if (!CONFIG.FORM_URL) return null;
  return (
    <Container id="avaliacao" component="section" size="sm" py={{ base: 48, md: 64 }} ta="center">
      <Title order={2} fz={{ base: 26, md: 32 }} c="verde.9">O site te ajudou?</Title>
      <Text c="dimmed" mt="xs">Responda uma pesquisa rápida. Sua opinião faz parte deste projeto de extensão.</Text>
      <Button component="a" href={CONFIG.FORM_URL} target="_blank" rel="noopener" size="md" mt="lg">Avaliar o projeto</Button>
    </Container>
  );
}
