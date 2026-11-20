/* Utilidades usadas pelas três páginas. */

export const fmtKg = (kg) =>
  kg >= 1
    ? `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`
    : `${Math.round(kg * 1000).toLocaleString("pt-BR")} g`;

export const fmtKm = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;

export const fmtData = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// localStorage pode falhar (modo privado, bloqueio de cookies): o site funciona sem ele.
export const store = {
  get(chave, padrao) {
    try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch { return padrao; }
  },
  set(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* ignora */ }
  },
  del(chave) {
    try { localStorage.removeItem(chave); } catch { /* ignora */ }
  },
};

export async function fetchJson(url, opcoes = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opcoes, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export const primeiroNome = (nome) => String(nome || "").split(" ")[0];
