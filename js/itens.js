/*
 * Catálogo de itens eletrônicos mais descartados.
 *
 * "peso" = peso médio APROXIMADO de uma unidade, em kg, estimado a partir
 * de especificações comuns de fabricantes para modelos populares.
 * Ajuste à vontade e cite a fonte que usar no portfólio.
 *
 * "tags" = categorias do OpenStreetMap (recycling:*) que indicam que um
 * ponto de coleta aceita aquele item. Usadas para mostrar a compatibilidade.
 */
const GERAL = ["electrical_items", "electrical_appliances", "small_appliances"];

const ITENS = [
  { id: "pilha",       nome: "Pilhas (AA/AAA)",              icone: "🔋", peso: 0.02,  tags: ["batteries"] },
  { id: "bateria",     nome: "Baterias (celular, 9V, recarregável)", icone: "🪫", peso: 0.05, tags: ["batteries"] },
  { id: "celular",     nome: "Celular / smartphone",         icone: "📱", peso: 0.18,  tags: ["mobile_phones", ...GERAL] },
  { id: "notebook",    nome: "Notebook",                     icone: "💻", peso: 2.2,   tags: ["computers", ...GERAL] },
  { id: "tablet",      nome: "Tablet",                       icone: "📲", peso: 0.5,   tags: ["computers", "mobile_phones", ...GERAL] },
  { id: "cpu",         nome: "Computador (gabinete)",        icone: "🖥️", peso: 7.0,   tags: ["computers", ...GERAL] },
  { id: "monitor",     nome: "Monitor",                      icone: "🖵",  peso: 4.0,   tags: ["computers", "tv_monitor", ...GERAL] },
  { id: "tv",          nome: "Televisão",                    icone: "📺", peso: 8.0,   tags: ["tv_monitor", ...GERAL] },
  { id: "teclado",     nome: "Teclado ou mouse",             icone: "⌨️", peso: 0.3,   tags: ["computers", ...GERAL] },
  { id: "carregador",  nome: "Carregador / fonte",           icone: "🔌", peso: 0.15,  tags: ["cables", ...GERAL] },
  { id: "cabo",        nome: "Cabos e fios",                 icone: "🧵", peso: 0.1,   tags: ["cables", ...GERAL] },
  { id: "fone",        nome: "Fone de ouvido",               icone: "🎧", peso: 0.08,  tags: [...GERAL] },
  { id: "impressora",  nome: "Impressora",                   icone: "🖨️", peso: 5.0,   tags: ["computers", ...GERAL] },
  { id: "roteador",    nome: "Roteador / modem",             icone: "📡", peso: 0.3,   tags: ["computers", ...GERAL] },
  { id: "console",     nome: "Videogame / console",          icone: "🎮", peso: 2.5,   tags: [...GERAL] },
  { id: "eletro",      nome: "Pequeno eletrodoméstico",      icone: "🔧", peso: 1.5,   tags: [...GERAL] },
  { id: "lampada",     nome: "Lâmpada (fluorescente/LED)",   icone: "💡", peso: 0.1,   tags: ["low_energy_bulbs", "fluorescent_tubes"] },
];

/* Rótulos amigáveis para as categorias aceitas pelos pontos de coleta. */
const CATEGORIAS = {
  batteries: "Pilhas e baterias",
  mobile_phones: "Celulares",
  computers: "Informática",
  electrical_items: "Eletroeletrônicos",
  electrical_appliances: "Eletroeletrônicos",
  small_appliances: "Pequenos eletrodomésticos",
  low_energy_bulbs: "Lâmpadas",
  fluorescent_tubes: "Lâmpadas",
  cables: "Cabos",
  printer_cartridges: "Cartuchos",
  tv_monitor: "TVs e monitores",
  white_goods: "Linha branca",
};
