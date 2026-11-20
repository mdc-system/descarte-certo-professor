/* Mapa (Leaflet + OpenStreetMap). O Leaflet só é baixado quando a pessoa abre o mapa. */
import { useEffect, useRef, useState } from "react";
import { Box, Text } from "@mantine/core";
import { fmtKm } from "../comum/util.js";

export default function Mapa({ origem, todos, proximos, aoClicar }) {
  const div = useRef(null);
  const ref = useRef({ L: null, mapa: null, camada: null });
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const aoClicarRef = useRef(aoClicar);
  aoClicarRef.current = aoClicar;

  // Carrega o Leaflet e cria o mapa uma vez.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [{ default: L }] = await Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]);
        if (!vivo || !div.current) return;
        const mapa = L.map(div.current, { scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa);
        ref.current = { L, mapa, camada: L.layerGroup().addTo(mapa) };
        setPronto(true);
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => { vivo = false; ref.current.mapa?.remove(); ref.current = { L: null, mapa: null, camada: null }; };
  }, []);

  // Redesenha os pontos quando a lista muda.
  useEffect(() => {
    const { L, mapa, camada } = ref.current;
    if (!pronto || !L || !origem) return;
    camada.clearLayers();
    L.circleMarker([origem.lat, origem.lon], { radius: 9, color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 3 })
      .bindTooltip("Você está aqui").addTo(camada);
    const ids = new Set(proximos.map((p) => p.id));
    todos.forEach((p) => {
      const destaque = ids.has(p.id);
      L.circleMarker([p.lat, p.lon], {
        radius: destaque ? 9 : 7, color: "#0b3b2e", weight: 2,
        fillColor: destaque ? "#22a877" : "#9bd9bf", fillOpacity: 0.95,
      })
        .bindTooltip(`${p.nome} · ${fmtKm(p.dist)}`)
        .on("click", () => aoClicarRef.current(p))
        .addTo(camada);
    });
    // Enquadra a pessoa e os pontos mais próximos; o resto aparece ao afastar o zoom.
    const limites = [[origem.lat, origem.lon], ...proximos.map((p) => [p.lat, p.lon])];
    setTimeout(() => {
      mapa.invalidateSize();
      if (limites.length > 1) mapa.fitBounds(limites, { padding: [30, 30], maxZoom: 15 });
      else mapa.setView([origem.lat, origem.lon], 13);
    }, 50);
  }, [pronto, origem, todos, proximos]);

  if (erro) return <Text c="dimmed" p="md">Não foi possível carregar o mapa.</Text>;
  return <Box ref={div} h={{ base: 380, sm: 460 }} style={{ borderRadius: "var(--mantine-radius-lg)", overflow: "hidden", border: "1px solid var(--mantine-color-gray-3)", zIndex: 0 }} />;
}
