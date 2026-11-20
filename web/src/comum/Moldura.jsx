/* Cabeçalho e rodapé comuns às três páginas. */
import { ActionIcon, Anchor, Box, Container, Group, Menu, Text, ThemeIcon } from "@mantine/core";
import { Menu as IconeMenu, Recycle } from "lucide-react";

const SEM_QUEBRA = { whiteSpace: "nowrap" };

/*
 * O topo nunca quebra linha:
 * - em telas grandes (lg, 1200 px+), os `links` ficam na barra;
 * - abaixo disso, vão para o menu recolhido (☰), junto com os `menuExtra`
 *   ({ texto, href } ou { texto, onClick, cor }), para o que não couber na barra (ex.: Histórico, Sair, Entrar).
 * Os botões passados em `children` decidem, com visibleFrom, a partir de que largura aparecem.
 */
export function Cabecalho({ inicio = "./", links = [], menuExtra = [], children }) {
  const itensMenu = [...links.map(([texto, href]) => ({ texto, href })), ...menuExtra];
  return (
    <Box component="header" pos="sticky" top={0} bg="white"
      style={{ zIndex: 100, borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
      <Container size="lg">
        <Group justify="space-between" h={68} wrap="nowrap" gap="sm">
          <Anchor href={inicio} underline="never" style={{ flex: "none" }}>
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon size={36} radius="md" aria-hidden="true"><Recycle size={20} /></ThemeIcon>
              <Text fw={800} size="lg" c="verde.9" style={SEM_QUEBRA}>Descarte Certo</Text>
            </Group>
          </Anchor>
          <Group gap="lg" wrap="nowrap" visibleFrom="lg" component="nav" aria-label="Principal">
            {links.map(([texto, href]) => (
              <Anchor key={href} href={href} c="gray.7" fw={500} underline="never" style={SEM_QUEBRA}>{texto}</Anchor>
            ))}
          </Group>
          <Group gap="xs" wrap="nowrap" style={{ flex: "none" }}>
            {children}
            {itensMenu.length > 0 && (
              <Box hiddenFrom="lg">
                <Menu position="bottom-end" shadow="md" width={230} withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="default" size={36} radius="xl" aria-label="Abrir menu">
                      <IconeMenu size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {itensMenu.map((item) => (item.href ? (
                      <Menu.Item key={item.texto} component="a" href={item.href}>{item.texto}</Menu.Item>
                    ) : (
                      <Menu.Item key={item.texto} onClick={item.onClick} color={item.cor}>{item.texto}</Menu.Item>
                    )))}
                  </Menu.Dropdown>
                </Menu>
              </Box>
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

/* Texto sem quebra de linha para o "Olá, Nome" do topo. */
export const estiloSemQuebra = SEM_QUEBRA;

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
