/* Tema visual (Mantine) e provedores usados pelas três páginas. */
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";

export const tema = createTheme({
  primaryColor: "verde",
  primaryShade: 7,
  colors: {
    // Verde do site: 7 = #1a8a63 (botões), 9 = #0b3b2e (títulos e faixas escuras)
    verde: ["#eaf8f1", "#d6efe3", "#acdfc7", "#7fcda8", "#59be8e", "#3fb47d", "#22a877", "#1a8a63", "#146c4f", "#0b3b2e"],
  },
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  headings: { fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif", fontWeight: "800" },
  defaultRadius: "md",
  components: {
    Badge: { defaultProps: { tt: "none" } },
    Button: { defaultProps: { radius: "xl" } },
  },
});

// Avisos rápidos no rodapé da tela (substituem o antigo "toast").
export const avisar = (mensagem, erro = false) =>
  notifications.show({ message: mensagem, color: erro ? "red" : "verde", autoClose: erro ? 5000 : 3500 });

export default function Raiz({ children }) {
  return (
    <MantineProvider theme={tema}>
      <Notifications position="bottom-center" limit={3} />
      {children}
    </MantineProvider>
  );
}
