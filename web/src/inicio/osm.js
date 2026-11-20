/* Busca ao vivo no OpenStreetMap (Overpass API), usada só fora da Grande Vitória. */
import { CATEGORIAS } from "../dados.js";
import { CONFIG } from "../config.js";
import { fetchJson, store } from "../comum/util.js";

// Servidores públicos e gratuitos da Overpass API, em dois pares tentados em sequência.
const OVERPASS = [
  ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"],
  ["https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"],
];
const TAGS_BUSCA = Object.keys(CATEGORIAS);

function montarConsulta(lat, lon, raioM) {
  const a = `(around:${raioM},${lat},${lon})`;
  return `[out:json][timeout:25];
(
  nwr["amenity"="recycling"]${a};
  nwr["recycling:batteries"="yes"]${a};
  nwr["recycling:mobile_phones"="yes"]${a};
  nwr["recycling:electrical_items"="yes"]${a};
  nwr["recycling:computers"="yes"]${a};
);
out center 300;`;
}

async function consultarOverpass(consulta, aoTentarOutro) {
  let ultimoErro;
  for (const [i, par] of OVERPASS.entries()) {
    if (i > 0) aoTentarOutro?.();
    try {
      return await Promise.any(par.map(async (url) => {
        const j = await fetchJson(url, { method: "POST", body: new URLSearchParams({ data: consulta }) }, 30000);
        if (!Array.isArray(j.elements)) throw new Error("Resposta inválida");
        return j;
      }));
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro;
}

function enderecoDe(tags) {
  const rua = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
  return [rua, tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(" - ");
}

function converterElemento(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const aceita = TAGS_BUSCA.filter((k) => t[`recycling:${k}`] === "yes");
  if (!aceita.length) return null; // coletor que não recebe eletrônicos (só papel, vidro…)
  const tipo = t.shop ? "Loja" : t.amenity === "recycling" ? "Coletor" : "";
  return {
    id: `${el.type}/${el.id}`,
    nome: t.name || t.operator || t.brand || (tipo ? `${tipo} (sem nome)` : "Ponto de coleta (sem nome)"),
    endereco: enderecoDe(t),
    horario: t.opening_hours || "",
    telefone: t.phone || t["contact:phone"] || "",
    lat, lon, aceita,
    fonte: "OpenStreetMap",
  };
}

export async function buscarNoOsm(origem, aoTentarOutro) {
  const raioKm = CONFIG.RAIO_PADRAO_KM;
  const chaveCache = `dc_cache_${origem.lat.toFixed(2)}_${origem.lon.toFixed(2)}_${raioKm}`;
  const cache = store.get(chaveCache, null);
  if (cache && Date.now() - cache.quando < 7 * 24 * 3600 * 1000) return cache.pontos;
  try {
    const dados = await consultarOverpass(montarConsulta(origem.lat, origem.lon, raioKm * 1000), aoTentarOutro);
    const vistos = new Set();
    const pontos = (dados.elements || []).map(converterElemento).filter((p) => p && !vistos.has(p.id) && vistos.add(p.id));
    store.set(chaveCache, { quando: Date.now(), pontos });
    return pontos;
  } catch (err) {
    if (cache) return cache.pontos;
    throw err;
  }
}
