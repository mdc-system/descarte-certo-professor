/*
 * Catálogo de itens eletrônicos mais descartados.
 *
 * "peso" = peso médio APROXIMADO de uma unidade, em kg, estimado a partir
 * de especificações comuns de fabricantes para modelos populares.
 * Ajuste à vontade e cite a fonte que usar no portfólio.
 *
 * "tags" = categorias do OpenStreetMap (recycling:*) que indicam que um
 * ponto de coleta aceita aquele item. Usadas para mostrar a compatibilidade.
 *
 * "Icone" = ícone da biblioteca lucide-react (https://lucide.dev/icons).
 */
import {
  Battery, BatteryCharging, Smartphone, Laptop, Tablet, PcCase, Monitor, Tv, Keyboard, Plug, Cable,
  Headphones, Printer, Router, Gamepad2, Microwave, Lightbulb, Package,
} from "lucide-react";

export const GERAL = ["electrical_items", "electrical_appliances", "small_appliances"];

export const ITENS = [
  { id: "pilha",      nome: "Pilhas (AA/AAA)",                     Icone: Battery,         peso: 0.02, tags: ["batteries"] },
  { id: "bateria",    nome: "Baterias (celular, 9V, recarregável)", Icone: BatteryCharging, peso: 0.05, tags: ["batteries"] },
  { id: "celular",    nome: "Celular / smartphone",                Icone: Smartphone,      peso: 0.18, tags: ["mobile_phones", ...GERAL] },
  { id: "notebook",   nome: "Notebook",                            Icone: Laptop,          peso: 2.2,  tags: ["computers", ...GERAL] },
  { id: "tablet",     nome: "Tablet",                              Icone: Tablet,          peso: 0.5,  tags: ["computers", "mobile_phones", ...GERAL] },
  { id: "cpu",        nome: "Computador (gabinete)",               Icone: PcCase,          peso: 7.0,  tags: ["computers", ...GERAL] },
  { id: "monitor",    nome: "Monitor",                             Icone: Monitor,         peso: 4.0,  tags: ["computers", "tv_monitor", ...GERAL] },
  { id: "tv",         nome: "Televisão",                           Icone: Tv,              peso: 8.0,  tags: ["tv_monitor", ...GERAL] },
  { id: "teclado",    nome: "Teclado ou mouse",                    Icone: Keyboard,        peso: 0.3,  tags: ["computers", ...GERAL] },
  { id: "carregador", nome: "Carregador / fonte",                  Icone: Plug,            peso: 0.15, tags: ["cables", ...GERAL] },
  { id: "cabo",       nome: "Cabos e fios",                        Icone: Cable,           peso: 0.1,  tags: ["cables", ...GERAL] },
  { id: "fone",       nome: "Fone de ouvido",                      Icone: Headphones,      peso: 0.08, tags: [...GERAL] },
  { id: "impressora", nome: "Impressora",                          Icone: Printer,         peso: 5.0,  tags: ["computers", ...GERAL] },
  { id: "roteador",   nome: "Roteador / modem",                    Icone: Router,          peso: 0.3,  tags: ["computers", ...GERAL] },
  { id: "console",    nome: "Videogame / console",                 Icone: Gamepad2,        peso: 2.5,  tags: [...GERAL] },
  { id: "eletro",     nome: "Pequeno eletrodoméstico",             Icone: Microwave,       peso: 1.5,  tags: [...GERAL] },
  { id: "lampada",    nome: "Lâmpada (fluorescente/LED)",          Icone: Lightbulb,       peso: 0.1,  tags: ["low_energy_bulbs", "fluorescent_tubes"] },
];

// Ícone dos itens que a pessoa digita em "Não achou o item? Adicione".
export const ICONE_OUTRO = Package;

/* Nome amigável de cada categoria (para mostrar nos pontos de coleta). */
export const CATEGORIAS = {
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
