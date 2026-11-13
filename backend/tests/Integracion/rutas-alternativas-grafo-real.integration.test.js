jest.mock("../../src/services/grafo-peatonal.service", () => ({
  obtenerGrafoPeatonal: jest.fn(),
}));

const { obtenerGrafoPeatonal } = require("../../src/services/grafo-peatonal.service");
const { calcularRutaSegura, calcularRutasAlternativas } = require("../../src/services/ruta.service");
const muestra = require("../fixtures/vina-calibracion-grafo.json");

describe("rutas alternativas con grafo real fijado localmente", () => {
  test("comprueba que la penalización no sesga rutas principales sobre el mismo grafo", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(muestra.grafo);
    const logOriginal = console.log;
    const diagnosticos = [];
    console.log = (...args) => diagnosticos.push(args.join(" "));

    try {
      const resultados = [];
      const rutasReferencia = [];
      for (const perfilRuta of ["menor_riesgo", "equilibrada", "mas_rapida"]) {
        const ruta = await calcularRutaSegura({
          comuna: muestra.comuna,
          origen: muestra.origen,
          destino: muestra.destino,
          rangoHorario: muestra.rangoHorario,
          perfilRuta,
          grafoPrecalculado: muestra.grafo,
        });
        const simbolo = Object.getOwnPropertySymbols(ruta)
          .find((item) => item.description === "idsSegmentosRuta");
        rutasReferencia.push({
          perfil: perfilRuta,
          segmentos: simbolo ? ruta[simbolo] : [],
          distancia_m: ruta.distancia_metros,
          riesgo: ruta.puntaje_riesgo,
          costo_original: ruta.costo_navegacion,
        });
      }
      for (const factorPenalizacion of [0, 0.25, 0.5, 1]) {
        diagnosticos.length = 0;
        const inicio = process.hrtime.bigint();
        const resultado = await calcularRutasAlternativas({
          comuna: muestra.comuna,
          origen: muestra.origen,
          destino: muestra.destino,
          rangoHorario: muestra.rangoHorario,
          factorPenalizacion,
        });
        const tiempo_ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        const rutas = resultado.rutas.map((ruta) => {
          const idsSymbol = Object.getOwnPropertySymbols(ruta)
            .find((simbolo) => simbolo.description === "idsSegmentosRuta");
          return {
            perfil: ruta.perfil_ruta,
            segmentos: idsSymbol ? ruta[idsSymbol] : [],
            distancia_m: ruta.distancia_metros,
            riesgo: ruta.puntaje_riesgo,
            costo_original: ruta.costo_navegacion,
          };
        });
        const mapaDistancias = new Map(muestra.grafo.aristas.map((arista) => [arista.id, arista.distancia_metros]));
        const similitudes = [];
        for (let i = 0; i < rutas.length; i++) {
          for (let j = i + 1; j < rutas.length; j++) {
            const idsB = new Set(rutas[j].segmentos);
            const compartida = rutas[i].segmentos
              .filter((id) => idsB.has(id))
              .reduce((suma, id) => suma + (Number(mapaDistancias.get(id)) || 0), 0);
            similitudes.push({
              perfiles: [rutas[i].perfil, rutas[j].perfil],
              segmentos_comunes: rutas[i].segmentos.filter((id) => idsB.has(id)).length,
              similitud_por_distancia_pct: rutas[i].distancia_m && rutas[j].distancia_m
                ? Number((100 * compartida / Math.max(rutas[i].distancia_m, rutas[j].distancia_m)).toFixed(2))
                : 0,
            });
          }
        }
        resultados.push({
          factor: factorPenalizacion,
          rutas_disponibles: resultado.cantidad_rutas,
          rutas,
          similitudes,
          descarte_por_conectividad: diagnosticos.filter((linea) => linea.includes("sin conectividad")),
          descartes_por_duplicacion_o_similitud: diagnosticos.filter((linea) => linea.includes("Alternativa descartada:")),
          tiempo_ms: Number(tiempo_ms.toFixed(2)),
        });
      }
      const resumen = resultados.map((item) => ({
        factor: item.factor,
        rutas_disponibles: item.rutas_disponibles,
        perfiles: item.rutas.map((ruta) => ({ perfil: ruta.perfil, cantidad_segmentos: ruta.segmentos.length, distancia_m: ruta.distancia_m, riesgo: ruta.riesgo, costo_original: ruta.costo_original })),
        similitudes: item.similitudes,
        descartes_por_conectividad: item.descarte_por_conectividad.length,
        descartes_por_duplicacion_o_similitud: item.descartes_por_duplicacion_o_similitud,
        tiempo_ms: item.tiempo_ms,
      }));
      logOriginal("CALIBRACION_GRAFO_REAL_VINA", JSON.stringify({
        comuna: muestra.comuna,
        origen: muestra.origen,
        destino: muestra.destino,
        rango_horario: muestra.rangoHorario,
        nodos: muestra.grafo.nodos.length,
        aristas: muestra.grafo.aristas.length,
        rutas_referencia_sin_penalizacion: rutasReferencia.map((ruta) => ({ perfil: ruta.perfil, cantidad_segmentos: ruta.segmentos.length, distancia_m: ruta.distancia_m, riesgo: ruta.riesgo, costo_original: ruta.costo_original })),
        resultados: resumen,
      }));
      expect(obtenerGrafoPeatonal).toHaveBeenCalledTimes(4);
      expect(resultados).toHaveLength(4);
      expect(resultados.every((item) => item.rutas_disponibles > 0)).toBe(true);
      for (const item of resultados.slice(1)) {
        expect(item.rutas.map((ruta) => ruta.segmentos)).toEqual(resultados[0].rutas.map((ruta) => ruta.segmentos));
        expect(item.rutas.map((ruta) => ruta.distancia_m)).toEqual(resultados[0].rutas.map((ruta) => ruta.distancia_m));
        expect(item.rutas.map((ruta) => ruta.riesgo)).toEqual(resultados[0].rutas.map((ruta) => ruta.riesgo));
        expect(item.rutas.map((ruta) => ruta.costo_original)).toEqual(resultados[0].rutas.map((ruta) => ruta.costo_original));
      }
    } finally {
      console.log = logOriginal;
    }
  }, 120000);

  test("mantiene métricas originales y no penaliza perfiles por segmentos usados antes", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(muestra.grafo);
    const parametros = {
      comuna: muestra.comuna,
      origen: muestra.origen,
      destino: muestra.destino,
      rangoHorario: muestra.rangoHorario,
    };
    const logOriginal = console.log;
    console.log = () => {};
    try {
      const porDefecto = await calcularRutasAlternativas(parametros);
      const explicito = await calcularRutasAlternativas({ ...parametros, factorPenalizacion: 0.25 });
      const base = await calcularRutasAlternativas({ ...parametros, factorPenalizacion: 0 });
      const rutasSimplificadas = (resultado) => resultado.rutas.map((ruta) => {
        const simbolo = Object.getOwnPropertySymbols(ruta)
          .find((item) => item.description === "idsSegmentosRuta");
        return {
          perfil: ruta.perfil_ruta,
          ids: simbolo ? ruta[simbolo] : [],
          distancia: ruta.distancia_metros,
          riesgo: ruta.puntaje_riesgo,
          costo: ruta.costo_navegacion,
          sumaCostosOriginales: ruta.segmentos.reduce((suma, segmento) => suma + segmento.costo_arista_operativo, 0),
        };
      });
      expect(rutasSimplificadas(porDefecto)).toEqual(rutasSimplificadas(explicito));
      expect(rutasSimplificadas(porDefecto)).toEqual(rutasSimplificadas(base));
      expect(porDefecto.cantidad_rutas).toBeGreaterThan(0);
      expect(porDefecto.cantidad_rutas).toBeLessThanOrEqual(3);

      for (const ruta of rutasSimplificadas(porDefecto)) {
        const tolerancia = 1e-9 * Math.max(1, Math.abs(ruta.costo));
        expect(Math.abs(ruta.sumaCostosOriginales - ruta.costo)).toBeLessThanOrEqual(tolerancia);
      }
    } finally {
      console.log = logOriginal;
    }
  }, 120000);
});
