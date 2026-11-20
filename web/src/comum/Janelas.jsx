/* Janelas (modais): cadastro/login/recuperar senha, código de recuperação e confirmação. */
import { useEffect, useState } from "react";
import {
  Anchor, Button, Checkbox, Code, Group, Modal, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title, UnstyledButton,
} from "@mantine/core";
import { Copy, KeyRound } from "lucide-react";
import { apiFetch } from "./api.js";
import { avisar } from "./Raiz.jsx";

const TEXTO_BOTAO = { cadastro: "Criar conta", login: "Entrar", recuperar: "Trocar senha" };

/* Cadastro, login e "esqueci minha senha" (com o código de recuperação). */
export function ModalConta({ aberto, modoInicial = "cadastro", aoFechar, aoEntrar }) {
  const [modo, setModo] = useState(modoInicial);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Cada vez que a janela abre, começa limpa no modo pedido.
  useEffect(() => {
    if (!aberto) return;
    setModo(modoInicial); setNome(""); setEmail(""); setSenha(""); setCodigo(""); setAceite(false); setErro("");
  }, [aberto, modoInicial]);

  const trocarModo = (m) => { setModo(m); setErro(""); };

  async function enviar(e) {
    e.preventDefault();
    const n = nome.trim(), em = email.trim(), cod = codigo.trim();
    if (modo === "cadastro" && n.length < 2) return setErro("Informe seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setErro("Informe um e-mail válido.");
    if (modo === "recuperar" && cod.replace(/[^A-Za-z0-9]/g, "").length < 12) return setErro("Digite o código de recuperação completo (12 letras e números).");
    if (modo !== "login" && senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (!senha) return setErro("Informe sua senha.");
    if (modo === "cadastro" && !aceite) return setErro("Para criar a conta, aceite o aviso de privacidade.");

    setEnviando(true);
    setErro("");
    try {
      const CORPO = {
        cadastro: { nome: n, email: em, senha, aceite },
        login: { email: em, senha },
        recuperar: { email: em, codigo: cod, senha },
      };
      const dados = await apiFetch(modo, { method: "POST", body: CORPO[modo] });
      await aoEntrar(dados, modo);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal opened={aberto} onClose={aoFechar} centered radius="lg" size="md"
      title={modo === "recuperar" ? <Title order={2} fz="xl">Recuperar senha</Title> : null}
      withCloseButton={modo === "recuperar"}>
      <form onSubmit={enviar} noValidate>
        <Stack gap="md">
          {modo !== "recuperar" && (
            <SegmentedControl fullWidth radius="xl" value={modo} onChange={trocarModo}
              data={[{ value: "cadastro", label: "Cadastre-se" }, { value: "login", label: "Entrar" }]} />
          )}
          {modo === "recuperar" ? (
            <Text size="sm" c="dimmed">Digite seu e-mail, o <b>código de recuperação</b> que você guardou ao criar a conta e uma senha nova.</Text>
          ) : (
            <Text size="sm" c="dimmed">Com uma conta, o histórico do que você descartou fica salvo. Sem conta, você usa tudo normalmente, mas nada é guardado.</Text>
          )}
          {modo === "cadastro" && (
            <TextInput label="Nome" value={nome} onChange={(e) => setNome(e.currentTarget.value)} maxLength={60} autoComplete="name" data-autofocus />
          )}
          <TextInput label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} maxLength={120} autoComplete="email"
            data-autofocus={modo !== "cadastro" || undefined} />
          {modo === "recuperar" && (
            <TextInput label="Código de recuperação" value={codigo} onChange={(e) => setCodigo(e.currentTarget.value)} maxLength={20}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX" leftSection={<KeyRound size={16} />} />
          )}
          <PasswordInput label={modo === "recuperar" ? "Nova senha" : "Senha"} value={senha} onChange={(e) => setSenha(e.currentTarget.value)}
            maxLength={128} autoComplete={modo === "login" ? "current-password" : "new-password"}
            description={modo !== "login" ? "Mínimo de 8 caracteres." : undefined} />
          {modo === "login" && (
            <UnstyledButton onClick={() => trocarModo("recuperar")} c="verde.7" fz="sm" fw={600} w="fit-content">Esqueci minha senha</UnstyledButton>
          )}
          {modo === "cadastro" && (
            <Checkbox checked={aceite} onChange={(e) => setAceite(e.currentTarget.checked)}
              label={<>Li e aceito o <Anchor href="privacidade.html" target="_blank" rel="noopener" inherit>aviso de privacidade</Anchor>.</>} />
          )}
          {erro && <Text c="red.7" size="sm" fw={600} role="alert">{erro}</Text>}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={aoFechar}>Agora não</Button>
            <Button type="submit" loading={enviando}>{TEXTO_BOTAO[modo]}</Button>
          </Group>
          {modo === "recuperar" && (
            <UnstyledButton onClick={() => trocarModo("login")} c="verde.7" fz="sm" fw={600} w="fit-content">← Voltar para Entrar</UnstyledButton>
          )}
        </Stack>
      </form>
    </Modal>
  );
}

/* Código de recuperação: aparece uma única vez e só fecha com "Já guardei". */
export function ModalCodigo({ codigo, aoGuardar }) {
  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); avisar("Código copiado."); }
    catch { avisar("Não deu para copiar. Selecione o código e copie manualmente.", true); }
  }
  return (
    <Modal opened={!!codigo} onClose={() => {}} centered radius="lg" withCloseButton={false} closeOnEscape={false} closeOnClickOutside={false}>
      <Stack gap="md">
        <Title order={2} fz="xl">Guarde seu código de recuperação</Title>
        <Text size="sm">Se você esquecer a senha, é com ele que você cria uma nova. <b>Ele não será mostrado de novo.</b> Anote, tire um print ou salve num lugar seguro.</Text>
        <CodigoGrande codigo={codigo} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" leftSection={<Copy size={16} />} onClick={copiar}>Copiar código</Button>
          <Button onClick={aoGuardar}>Já guardei</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function CodigoGrande({ codigo }) {
  return (
    <Code block ta="center" fz={26} fw={800} c="verde.9" bg="verde.0" py="md" style={{ letterSpacing: "0.12em", userSelect: "all" }}>
      {codigo}
    </Code>
  );
}

/* Confirmação simples ("Tem certeza?"). */
export function Confirmar({ aberto, titulo, texto, botao, perigo = false, aoConfirmar, aoCancelar }) {
  return (
    <Modal opened={aberto} onClose={aoCancelar} centered radius="lg" title={<Title order={2} fz="lg">{titulo}</Title>}>
      <Text size="sm">{texto}</Text>
      <Group justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={aoCancelar}>Cancelar</Button>
        <Button color={perigo ? "red" : undefined} onClick={aoConfirmar}>{botao}</Button>
      </Group>
    </Modal>
  );
}
