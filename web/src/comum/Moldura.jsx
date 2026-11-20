/* Cabeçalho e rodapé comuns às três páginas. */
import { Anchor, Box, Container, Group, Text, ThemeIcon } from "@mantine/core";
import { Recycle } from "lucide-react";

export function Cabecalho({ inicio = "./", links = [], children }) {
  return (
    <Box component="header" pos="sticky" top={0} bg="white"
      style={{ zIndex: 100, borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
      <Container size="lg">
        <Group justify="space-between" h={68} wrap="nowrap" gap="sm">
          <Anchor href={inicio} underline="never" style={{ flex: "none" }}>
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon size={36} radius="md" aria-hidden="true"><Recycle size={20} /></ThemeIcon>
              <Text fw={800} size="lg" c="verde.9">Descarte Certo</Text>
            </Group>
          </Anchor>
          <Group gap="xl" visibleFrom="md" component="nav" aria-label="Principal">
            {links.map(([texto, href]) => (
              <Anchor key={href} href={href} c="gray.7" fw={500} underline="never">{texto}</Anchor>
            ))}
          </Group>
          <Group gap="xs" wrap="nowrap">{children}</Group>
        </Group>
      </Container>
    </Box>
  );
}

export function Rodape({ fontes = false, privacidade = true }) {
  return (
    <Box component="footer" bg="verde.9" c="white" py="xl">
      <Container size="lg">
        <Text size="sm">Projeto de Extensão Interdisciplinar (PEI II) · Tema: Sustentabilidade, Meio Ambiente e Desenvolvimento Social.</Text>
        {fontes && (
          <Text size="xs" opacity={0.8} mt={6}>
            Mapa e pontos de coleta: © colaboradores do{" "}
            <Anchor href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" c="white" fz="xs" underline="always">OpenStreetMap</Anchor>.
            {" "}CEP: AwesomeAPI e ViaCEP. Pesos são médias aproximadas.
          </Text>
        )}
        {privacidade && (
          <Anchor href="privacidade.html" c="white" fz="xs" underline="always" mt={8} display="inline-block">Aviso de privacidade</Anchor>
        )}
      </Container>
    </Box>
  );
}
