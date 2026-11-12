require("dotenv").config({ quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const fixturePath = path.join(__dirname, "../tests/fixtures/vina-calibracion-grafo.json");
const salidaPath = path.join(__dirname, "../tests/fixtures/vina-calibracion-resultados.json");
const fixtureBytes = fs.readFileSync(fixturePath);
const fixture = JSON.parse(fixtureBytes.toString("utf8"));

// El servicio recibe el grafo ya capturado; el script no hace llamadas de red.
const servicioGrafo = require("../src/services/grafo-peatonal.service");
servicioGrafo.obtenerGrafoPeatonal = async () => fixture.grafo;
const { calcularRutaSegura, calcularRutasAlternativas } = require("../src/services/ruta.service");
const logOriginal = console.log;

const obtenerIds = (ruta) => {
  const simbolo = Object.getOwnPropertySymbols(ruta)
    .find((item) => item.description === "idsSegmentosRuta");
  return simbolo ? ruta[simbolo] : [];
};

const obtenerSimilitudes = (rutas) => {
  const distanciaPorId = new Map(
    fixture.grafo.aristas.map((arista) => [arista.id, Number(arista.distancia_metros) || 0])
  );
  const similitudes = [];
  for (let i = 0; i < rutas.length; i++) {
    for (let j = i + 1; j < rutas.length; j++) {
      const idsRutaB = new Set(rutas[j].segmentos);
      const comunes = rutas[i].segmentos.filter((id) => idsRutaB.has(id));
      const distanciaCompartida = comunes.reduce((total, id) => total + (distanciaPorId.get(id) || 0), 0);
      similitudes.push({
        perfiles: [rutas[i].perfil, rutas[j].perfil],
        segmentos_comunes: comunes.length,
        similitud_por_distancia_pct: Number((100 * distanciaCompartida / Math.max(rutas[i].distancia_m, rutas[j].distancia_m)).toFixed(2)),
      });
    }
  }
  return similitudes;
};

(async () => {
  console.log = () => {};
  const perfiles = ["menor_riesgo", "equilibrada", "mas_rapida"];
  const referencia = new Map();
  for (const perfilRuta of perfiles) {
    const ruta = await calcularRutaSegura({
      comuna: fixture.comuna,
      origen: fixture.origen,
      destino: fixture.destino,
      rangoHorario: fixture.rangoHorario,
      perfilRuta,
      grafoPrecalculado: fixture.grafo,
    });
    referencia.set(perfilRuta, {
      segmentos: obtenerIds(ruta),
      distancia_m: ruta.distancia_metros,
      riesgo: ruta.puntaje_riesgo,
      costo_original: ruta.costo_navegacion,
    });
  }

  const resultados = [];
  for (const factorPenalizacion of [0, 0.25, 0.5, 1]) {
    const logs = [];
    console.log = (...args) => logs.push(args.join(" "));
    const inicio = process.hrtime.bigint();
    const respuesta = await calcularRutasAlternativas({
      comuna: fixture.comuna,
      origen: fixture.origen,
      destino: fixture.destino,
      rangoHorario: fixture.rangoHorario,
      factorPenalizacion,
    });
    const tiempo_ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const rutas = respuesta.rutas.map((ruta) => {
      const base = referencia.get(ruta.perfil_ruta);
      return {
        perfil: ruta.perfil_ruta,
        segmentos: obtenerIds(ruta),
        distancia_m: ruta.distancia_metros,
        riesgo: ruta.puntaje_riesgo,
        costo_original: ruta.costo_navegacion,
        variacion_distancia_vs_sin_penalizacion_m: Number((ruta.distancia_metros - base.distancia_m).toFixed(2)),
        variacion_riesgo_vs_sin_penalizacion: Number((ruta.puntaje_riesgo - base.riesgo).toFixed(2)),
      };
    });
    resultados.push({
      factor: factorPenalizacion,
      rutas_disponibles: respuesta.cantidad_rutas,
      rutas,
      similitudes_entre_rutas: obtenerSimilitudes(rutas),
      descartes_por_conectividad: logs.filter((linea) => linea.includes("sin conectividad")),
      descartes_por_duplicacion_o_similitud: logs.filter((linea) => linea.includes("Alternativa descartada:")),
      tiempo_ms: Number(tiempo_ms.toFixed(2)),
    });
  }
  console.log = logOriginal;

  const reporte = {
    fecha_utc: new Date().toISOString(),
    fixture: path.basename(fixturePath),
    sha256_fixture: crypto.createHash("sha256").update(fixtureBytes).digest("hex"),
    comuna: fixture.comuna,
    origen: fixture.origen,
    destino: fixture.destino,
    rango_horario: fixture.rangoHorario,
    nodos: fixture.grafo.nodos.length,
    aristas: fixture.grafo.aristas.length,
    rutas_referencia_sin_penalizacion: Object.fromEntries(referencia),
    resultados,
  };
  fs.writeFileSync(salidaPath, JSON.stringify(reporte, null, 2));
  logOriginal(JSON.stringify(resultados.map(({ factor, rutas_disponibles, rutas, similitudes_entre_rutas, descartes_por_conectividad, descartes_por_duplicacion_o_similitud, tiempo_ms }) => ({
    factor,
    rutas_disponibles,
    rutas: rutas.map(({ perfil, distancia_m, riesgo, costo_original, variacion_distancia_vs_sin_penalizacion_m, variacion_riesgo_vs_sin_penalizacion }) => ({ perfil, distancia_m, riesgo, costo_original, variacion_distancia_vs_sin_penalizacion_m, variacion_riesgo_vs_sin_penalizacion })),
    similitudes_entre_rutas,
    descartes_por_conectividad: descartes_por_conectividad.length,
    descartes_por_duplicacion_o_similitud,
    tiempo_ms,
  }))));
})().catch((error) => {
  console.log = originalLog;
  console.error(error);
  process.exitCode = 1;
});
