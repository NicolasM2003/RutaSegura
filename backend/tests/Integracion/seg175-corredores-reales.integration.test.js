jest.mock("../../src/services/grafo-peatonal.service", () => ({ obtenerGrafoPeatonal: jest.fn() }));

const muestra = require("../fixtures/seg175-rutas-reales-vina.json");
const { calcularDistanciaCompartidaCorredor } = require("../../src/services/ruta.service");

const enriquecer = (ruta, aplicarSidewalk = false) => {
  const coordenadaPorNodo = new Map(ruta.nodos_ruta.map((id, indice) => [
    String(id), [ruta.geometria[indice][1], ruta.geometria[indice][0]],
  ]));
  return ruta.segmentos.map((segmento) => ({
    ...segmento,
    inicio: coordenadaPorNodo.get(String(segmento.nodo_origen)),
    fin: coordenadaPorNodo.get(String(segmento.nodo_destino)),
    ...(aplicarSidewalk && String(segmento.id_osm) === "23489658" ? { sidewalk: "right" } : {}),
    ...(aplicarSidewalk && String(segmento.id_osm) === "23489857" ? { sidewalk: "left" } : {}),
  }));
};

describe("SEG-175 con rutas reales guardadas de Viña del Mar", () => {
  test("Puente Casino reconoce la franja solapada de aceras opuestas sin depender de IDs OSM iguales", () => {
    const menor = muestra.routes.find((ruta) => ruta.perfil_ruta === "menor_riesgo");
    const rapida = muestra.routes.find((ruta) => ruta.perfil_ruta === "mas_rapida");
    const puenteMenor = enriquecer(menor, true).filter((s) => String(s.id_osm) === "23489658");
    const puenteRapida = enriquecer(rapida, true).filter((s) => String(s.id_osm) === "23489857");
    const compartida = calcularDistanciaCompartidaCorredor(
      { segmentos: puenteMenor, distancia_metros: 78.07 },
      { segmentos: puenteRapida, distancia_metros: 81.32 },
    );
    expect(compartida).toBeGreaterThan(70);
    expect(compartida).toBeLessThanOrEqual(78.07);
  });

  test("San Martín reconoce el tramo largo continuo representado con distintos IDs y cortes OSM", () => {
    const menor = muestra.routes.find((ruta) => ruta.perfil_ruta === "menor_riesgo");
    const rapida = muestra.routes.find((ruta) => ruta.perfil_ruta === "mas_rapida");
    const sanMartinMenor = enriquecer(menor).filter((s) => String(s.id_osm) === "551695751");
    const sanMartinRapida = enriquecer(rapida).filter((s) => String(s.id_osm) === "551695753");
    const compartida = calcularDistanciaCompartidaCorredor(
      { segmentos: sanMartinMenor, distancia_metros: 69.85 },
      { segmentos: sanMartinRapida, distancia_metros: 69.91 },
    );
    // El cuerpo largo queda respaldado por extremos de corredor compartidos;
    // los segmentos cortos en las intersecciones permanecen fuera si no solapan.
    expect(compartida).toBeGreaterThan(45);
    expect(compartida).toBeLessThanOrEqual(69.85);
  });
});
