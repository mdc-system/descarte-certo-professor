/* Descarte Certo — aviso de privacidade (LGPD). */
import { createRoot } from "react-dom/client";
import { Anchor, Box, Container, Group, List, Paper, Text, Title } from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import Raiz from "../comum/Raiz.jsx";
import { Cabecalho, Rodape } from "../comum/Moldura.jsx";

const Secao = ({ titulo, children }) => (
  <>
    <Title order={2} fz="xl" c="verde.9" mt="xl">{titulo}</Title>
    <List spacing="sm" mt="sm" size="md">{children}</List>
  </>
);

function PaginaPrivacidade() {
  return (
    <>
      <Cabecalho inicio="./" links={[["Calcular", "./#calcular"], ["Pontos de coleta", "./#pontos"], ["Minha área", "conta.html"]]} />
      <Box component="main" bg="gray.0" py={{ base: 32, md: 56 }}>
        <Container size="md">
          <Anchor href="./" fw={600} c="verde.7" underline="never">
            <Group gap={6} component="span"><ArrowLeft size={16} /> Voltar para o site</Group>
          </Anchor>
          <Paper withBorder radius="lg" p={{ base: "lg", md: 40 }} mt="lg">
            <Title order={1} fz={{ base: 30, md: 38 }} c="verde.9">Aviso de privacidade</Title>
            <Text c="dimmed" mt={4}>Atualizado em 20 de novembro de 2026.</Text>
            <Text mt="lg">
              O Descarte Certo é um projeto acadêmico de extensão (disciplina Prática de Extensão Interdisciplinar II, Multivix).
              Este aviso explica, de forma simples, quais dados o site usa, para quê e como você pode excluí-los,
              seguindo a Lei Geral de Proteção de Dados (Lei 13.709/2018).
            </Text>

            <Secao titulo="Usando o site sem conta">
              <List.Item>A calculadora e a busca de pontos funcionam sem cadastro. <b>Os itens que você escolhe não são salvos.</b></List.Item>
              <List.Item>
                O <b>CEP ou endereço</b> que você digita vai para o nosso servidor só para encontrar as coordenadas. Para responder mais rápido
                nas próximas buscas, guardamos o CEP (ou o texto buscado) e as coordenadas, <b>sem nenhuma ligação com você</b>. Para fazer essa
                conversão, o servidor consulta serviços públicos (AwesomeAPI, ViaCEP e OpenStreetMap/Nominatim) e envia a eles apenas o CEP ou o endereço.
              </List.Item>
              <List.Item>
                Se você usar <b>“minha localização”</b>, a posição é enviada ao nosso servidor só para ordenar os pontos por distância e
                <b> não é guardada</b> no banco de dados. Fora da Grande Vitória, o seu navegador consulta direto o OpenStreetMap com essa posição.
              </List.Item>
              <List.Item>
                O site carrega a fonte de texto do Google Fonts e o mapa do OpenStreetMap. Esses serviços recebem o seu endereço IP,
                como acontece em qualquer site que os usa.
              </List.Item>
              <List.Item>
                Como em qualquer site, os registros técnicos do servidor podem guardar por um tempo o endereço IP e as páginas acessadas,
                para segurança e correção de erros.
              </List.Item>
            </Secao>

            <Secao titulo="Com conta">
              <List.Item>
                <b>Quais dados:</b> nome, e-mail, senha e código de recuperação (os dois guardados criptografados: nem o projeto consegue vê-los),
                a data do cadastro, a data em que você aceitou este aviso e os descartes que você registrar (ponto, itens, quantidades, peso e data).
              </List.Item>
              <List.Item>
                <b>Para quê:</b> manter a sua conta e mostrar o seu histórico. O site também mostra o total de quilos registrado por todos os
                usuários, somado, sem identificar ninguém.
              </List.Item>
              <List.Item>
                <b>Cookie:</b> um cookie de sessão mantém você conectado por até 30 dias. Ele é necessário para o login e não é usado para
                propaganda nem rastreamento.
              </List.Item>
              <List.Item><b>Base legal:</b> o seu consentimento, dado ao criar a conta (art. 7º, I, da LGPD).</List.Item>
              <List.Item><b>Compartilhamento:</b> os seus dados <b>não são vendidos nem compartilhados</b> com ninguém. Eles ficam no servidor usado pelo projeto.</List.Item>
              <List.Item><b>Por quanto tempo:</b> enquanto a conta existir.</List.Item>
            </Secao>

            <Secao titulo="Seus direitos">
              <List.Item><b>Ver seus dados:</b> na <Anchor href="conta.html#conta" inherit>Minha área</Anchor>, aba Minha conta.</List.Item>
              <List.Item>
                <b>Excluir tudo:</b> na mesma aba, o botão <em>Excluir minha conta e meus dados</em> apaga na hora o cadastro, as sessões e todo o histórico.
              </List.Item>
              <List.Item><b>Retirar o consentimento:</b> é só excluir a conta. Você continua podendo usar o site sem cadastro.</List.Item>
            </Secao>
          </Paper>
        </Container>
      </Box>
      <Rodape privacidade={false} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<Raiz><PaginaPrivacidade /></Raiz>);
