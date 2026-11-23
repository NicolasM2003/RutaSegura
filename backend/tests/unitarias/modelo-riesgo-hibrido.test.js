jest.mock("../../src/config/supabase", () => ({ from: jest.fn() }));

const supabase = require("../../src/config/supabase");
const { obtenerModeloRiesgo } = require("../../src/services/zonas-riesgo.service");
const { crearIndiceEspacial } = require("../../src/services/riesgo-espacial.service");
const { agruparAisladosPorCoordenadas } = require("../../src/services/zonas-riesgo.service");
const {
  calcularRiesgoSegmento,
  calcularExposicionIncidentes,
  combinarRiesgoHibrido,
} = require("../../src/services/riesgo-red.service");

const rangoNoche = "20:00 - 23:59";
const rangoManana = "04:00 - 07:59";
const registro = (id, longitud, rango_horario, grupo_delito_id = "g1", fecha = "2021-01-01") => ({
  id,
  fecha,
  rango_horario,
  latitud: -33,
  longitud,
  grupo_delito_id,
  comuna_id: "comuna-1",
});

let delitos;
let gravedad;

const configurarSupabase = () => {
  supabase.from.mockImplementation((tabla) => {
    const consulta = {
      select: () => consulta,
      eq: () => consulta,
      order: () => consulta,
      range: async (desde, hasta) => ({ data: delitos.slice(desde, hasta + 1), error: null }),
      maybeSingle: async () => ({ data: { id: "comuna-1", nombre: "Viña del Mar" }, error: null }),
      in: async (_campo, ids) => ({ data: gravedad.filter((item) => ids.includes(item.grupo_delito_id)), error: null }),
    };
    if (!["comunas", "delitos", "niveles_gravedad"].includes(tabla)) throw new Error(`Tabla inesperada: ${tabla}`);
    return consulta;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  delitos = [
    registro("n1", -71, rangoNoche, "g1", "2018-02-03"),
    registro("n2", -70.99995, rangoNoche, "g1", "2023-12-20"),
    registro("n3", -70.9999, rangoNoche, "g2", "2025-06-14"),
    registro("ruido", -70.99, rangoNoche, "g2", "2020-09-10"),
    registro("otro-horario", -71.00002, rangoManana, "g1", "2019-04-01"),
  ];
  gravedad = [
    { grupo_delito_id: "g1", nivel: "Alto", puntaje: 80 },
    { grupo_delito_id: "g2", nivel: "Medio", puntaje: 60 },
  ];
  configurarSupabase();
});

describe("modelo híbrido: datos temporales e históricos", () => {
  test("DBSCAN crea clusters con los delitos del rango y deja el ruido como incidentes individuales", async () => {
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modelo.delitosTemporales.map((d) => d.id)).toEqual(["n1", "n2", "n3", "ruido"]);
    expect(modelo.zonas).toHaveLength(1);
    expect(modelo.zonas[0].cantidad_delitos).toBe(3);
    expect(modelo.zonas[0].metodo_agrupacion).toBe("dbscan");
    expect(modelo.zonas[0].parametro_dbscan).toEqual({ radio_metros: 75, minimo_puntos: 3 });
    expect(modelo.delitosAislados.map((d) => d.id)).toEqual(["ruido"]);
    const idsAgrupados = new Set(modelo.zonas.flatMap((z) => z.geometria_zona.centros.map((p) => p.id_delito)));
    expect(idsAgrupados.has("ruido")).toBe(false);
    expect(idsAgrupados.has("n1")).toBe(true);
  });

  test("crea una zona complementaria con dos registros de coordenadas reportadas idénticas", async () => {
    delitos = [
      registro("par-1", -70.9, rangoNoche, "g1"),
      registro("par-2", -70.9, rangoNoche, "g2"),
      registro("aislado", -70.8, rangoNoche, "g1"),
    ];
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    const pareja = modelo.zonas.find((zona) => zona.metodo_agrupacion === "coordenadas_reportadas_identicas");
    expect(pareja).toMatchObject({
      cantidad_delitos: 2,
      delitos_en_horario: 2,
      puntajeCantidad: 33.33,
      puntajeTipo: 70,
      puntajeFinal: 51.67,
      nivel: "Medio",
    });
    expect(pareja.geometria_zona.centros.map((centro) => centro.id_delito)).toEqual(["par-1", "par-2"]);
    expect(modelo.delitosAislados.map((delito) => delito.id)).toEqual(["aislado"]);
  });

  test("clasifica los pares con el promedio real de gravedad y los umbrales centralizados", async () => {
    delitos = [registro("leve-1", -70.9, rangoNoche, "g3"), registro("leve-2", -70.9, rangoNoche, "g3")];
    gravedad = [{ grupo_delito_id: "g3", nivel: "Bajo", puntaje: 60 }];
    configurarSupabase();
    const modeloVerde = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modeloVerde.zonas[0]).toMatchObject({ puntajeTipo: 60, puntajeFinal: 46.67, nivel: "Bajo" });

    delitos = [registro("medio-1", -70.9, rangoNoche, "g1"), registro("medio-2", -70.9, rangoNoche, "g2")];
    gravedad = [
      { grupo_delito_id: "g1", nivel: "Alto", puntaje: 80 },
      { grupo_delito_id: "g2", nivel: "Medio", puntaje: 60 },
    ];
    configurarSupabase();
    const modeloMedio = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modeloMedio.zonas[0]).toMatchObject({ puntajeTipo: 70, puntajeFinal: 51.67, nivel: "Medio" });

    delitos = [registro("alto-1", -70.9, rangoNoche, "g4"), registro("medio-2", -70.9, rangoNoche, "g2")];
    gravedad = [
      { grupo_delito_id: "g4", nivel: "Alto", puntaje: 100 },
      { grupo_delito_id: "g2", nivel: "Medio", puntaje: 60 },
    ];
    configurarSupabase();
    const modeloPromedio80 = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modeloPromedio80.zonas[0]).toMatchObject({ puntajeTipo: 80, puntajeFinal: 56.67, nivel: "Medio" });
  });

  test("no agrupa coordenadas diferentes aunque estén próximas y conserva precisión", async () => {
    delitos = [
      registro("cerca-1", -70.9, rangoNoche, "g1"),
      { ...registro("cerca-2", -70.9, rangoNoche, "g1"), latitud: -32.999999 },
    ];
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modelo.zonas).toEqual([]);
    expect(modelo.delitosAislados.map((delito) => delito.id)).toEqual(["cerca-1", "cerca-2"]);
    expect(modelo.delitosAislados[0].latitud).not.toBe(modelo.delitosAislados[1].latitud);
  });

  test("no crea una zona de pareja con registros ya asignados a DBSCAN", async () => {
    delitos = [
      registro("cluster-1", -70.9, rangoNoche, "g1"),
      registro("cluster-2", -70.9, rangoNoche, "g1"),
      registro("cluster-3", -70.9, rangoNoche, "g2"),
    ];
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modelo.zonas).toHaveLength(1);
    expect(modelo.zonas[0].metodo_agrupacion).toBe("dbscan");
    expect(modelo.zonas[0].cantidad_delitos).toBe(3);
    expect(modelo.zonas[0].puntajeFinal).toBe(61.67);
    expect(modelo.diagnosticoAgrupacionTemporal.zonas_pareja_coordenadas_identicas).toBe(0);
    expect(modelo.delitosAislados).toEqual([]);
  });

  test("no mezcla franjas y cada delito temporal pertenece a una sola modalidad", async () => {
    delitos = [
      registro("noche", -70.9, rangoNoche, "g1"),
      registro("mañana", -70.9, rangoManana, "g1"),
    ];
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    const idsEnZonas = modelo.zonas.flatMap((zona) => zona.geometria_zona.centros.map((centro) => centro.id_delito));
    const asignaciones = [...idsEnZonas, ...modelo.delitosAislados.map(({ id }) => id)];
    expect(asignaciones).toEqual(["noche"]);
    expect(modelo.delitosHistoricos.map(({ id }) => id)).toEqual(["noche", "mañana"]);
  });

  test("sin rango mantiene desactivada la partición temporal", async () => {
    delitos = [registro("par-1", -70.9, rangoNoche), registro("par-2", -70.9, rangoNoche)];
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar" });
    expect(modelo.zonas).toEqual([]);
    expect(modelo.delitosAislados).toEqual([]);
    expect(modelo.delitosHistoricos).toHaveLength(2);
  });

  test("las parejas aportan por zona y no reaparecen como incidentes aislados temporales", async () => {
    delitos = [registro("par-1", -71, rangoNoche, "g1"), registro("par-2", -71, rangoNoche, "g2")];
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    const centrosZona = modelo.zonas.flatMap((zona) => zona.geometria_zona.centros.map((centro) => ({
      ...centro,
      id_zona: zona.id_zona,
      puntaje: zona.puntajeFinal,
      nivel: zona.nivel,
      radio_metros: zona.geometria_zona.radio_metros,
    })));
    const contexto = {
      modelo,
      centrosZona,
      indiceCentrosZona: crearIndiceEspacial(centrosZona, 75),
      indiceAislados: crearIndiceEspacial(modelo.delitosAislados, 75),
      indiceHistorico: crearIndiceEspacial(modelo.delitosHistoricos, 75),
    };
    const riesgo = calcularRiesgoSegmento({ geometria: [
      { latitud: -33, longitud: -71.0002 },
      { latitud: -33, longitud: -70.9998 },
    ] }, contexto);
    expect(modelo.delitosAislados).toEqual([]);
    expect(riesgo.zonas_intersectadas.map((zona) => zona.id_zona)).toContain(modelo.zonas[0].id_zona);
    expect(riesgo.zonas_intersectadas).toHaveLength(1);
    expect(riesgo.puntaje_riesgo_temporal).toBeCloseTo(36.17, 2);
    expect(riesgo.delitos_individuales_cercanos).toEqual([]);
    expect(modelo.delitosHistoricos.map(({ id }) => id)).toEqual(["par-1", "par-2"]);
  });

  test("un residual idéntico de más de dos registros se conserva como aislados y queda diagnosticado", () => {
    const registros = ["r1", "r2", "r3"].map((id) => ({ id, latitud: -33, longitud: -71 }));
    const resultado = agruparAisladosPorCoordenadas(registros);
    expect(resultado.parejas).toEqual([]);
    expect(resultado.incidentesIndividuales).toEqual(registros);
    expect(resultado.coordenadasResidualesMultiples[0]).toMatchObject({
      cantidad_delitos: 3,
      ids_delitos: ["r1", "r2", "r3"],
    });
  });

  test("una franja no incorpora delitos de otras franjas a sus zonas", async () => {
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modelo.zonas[0].geometria_zona.centros.map((p) => p.id_delito)).not.toContain("otro-horario");
    expect(modelo.delitosHistoricos.map((d) => d.id)).toContain("otro-horario");
  });

  test("incluye todo el historial disponible, sin recortar por fecha", async () => {
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modelo.delitosHistoricos).toHaveLength(5);
    expect(new Set(modelo.delitosHistoricos.map((d) => d.fecha))).toEqual(new Set([
      "2018-02-03", "2023-12-20", "2025-06-14", "2020-09-10", "2019-04-01",
    ]));
  });

  test("un rango omitido no atribuye silenciosamente todos los delitos a un horario", async () => {
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar" });
    expect(modelo.zonas).toEqual([]);
    expect(modelo.delitosAislados).toEqual([]);
    expect(modelo.modoTemporal).toBe("sin_rango_temporal_especificado");
    expect(modelo.delitosHistoricos).toHaveLength(5);
  });

  test("la cobertura informa disponibilidad y completitud de coordenadas y gravedad", async () => {
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar", rangoHorario: rangoNoche });
    expect(modelo.cobertura).toMatchObject({
      registros_disponibles: 5,
      registros_con_coordenadas: 5,
      registros_con_gravedad: 5,
      estado: "registros_disponibles",
    });
  });

  test("pagina todo el historial y marca cobertura parcial cuando faltan coordenadas", async () => {
    delitos = Array.from({ length: 1001 }, (_, i) => ({
      ...registro(`sin-geo-${i}`, null, rangoManana),
      longitud: null,
      latitud: null,
    }));
    configurarSupabase();
    const modelo = await obtenerModeloRiesgo({ comuna: "Viña del Mar" });
    expect(modelo.cobertura.registros_disponibles).toBe(1001);
    expect(modelo.cobertura.registros_sin_coordenadas).toBe(1001);
    expect(modelo.cobertura.estado).toBe("cobertura_parcial");
    expect(modelo.delitosHistoricos).toHaveLength(0);
  });
});

describe("exposición espacial e integración temporal/histórica", () => {
  test("las zonas iniciales pueden clasificarse bajo, medio y alto", () => {
    const { calcularPuntajeZona } = require("../../src/services/zonas-riesgo.service");
    expect(calcularPuntajeZona([{ gravedad: { puntaje: 0 } }])).toMatchObject({ puntajeFinal: 8.33, nivel: "Bajo" });
    expect(calcularPuntajeZona([
      { gravedad: { puntaje: 60 } }, { gravedad: { puntaje: 60 } }, { gravedad: { puntaje: 60 } },
    ])).toMatchObject({ puntajeFinal: 55, nivel: "Medio" });
    expect(calcularPuntajeZona(Array.from({ length: 6 }, () => ({ gravedad: { puntaje: 90 } }))).nivel).toBe("Alto");
  });

  test("el componente histórico considera incidentes de otros horarios", () => {
    const historico = [{ id: "h1", latitud: -33, longitud: -71, puntaje_gravedad: 100 }];
    const indiceHistorico = crearIndiceEspacial(historico, 75);
    const vacio = [];
    const contexto = {
      centrosZona: [],
      modelo: {
        zonas: [], delitosAislados: vacio, delitosHistoricos: historico,
        modoTemporal: "rango_seleccionado", rangoHorario: rangoNoche,
        cobertura: { estado: "registros_disponibles" },
      },
      indiceCentrosZona: crearIndiceEspacial(vacio, 75),
      indiceAislados: crearIndiceEspacial(vacio, 75),
      indiceHistorico,
    };
    const resultado = calcularRiesgoSegmento({ geometria: [
      { latitud: -33, longitud: -71.0001 }, { latitud: -33, longitud: -70.9999 },
    ] }, contexto);
    expect(resultado.puntaje_riesgo_temporal).toBe(0);
    expect(resultado.puntaje_riesgo_historico).toBeGreaterThan(0);
  });

  test("combina exactamente los componentes temporales e históricos en 70/30", () => {
    expect(combinarRiesgoHibrido(80, 20)).toBe(62);
  });

  test("sin registros marca disponibilidad desconocida en vez de describir seguridad", () => {
    const vacio = [];
    const contexto = {
      centrosZona: [],
      modelo: {
        zonas: [], delitosAislados: vacio, delitosHistoricos: vacio,
        modoTemporal: "rango_seleccionado", rangoHorario: rangoNoche,
        cobertura: { estado: "sin_registros" },
      },
      indiceCentrosZona: crearIndiceEspacial(vacio, 75),
      indiceAislados: crearIndiceEspacial(vacio, 75),
      indiceHistorico: crearIndiceEspacial(vacio, 75),
    };
    const resultado = calcularRiesgoSegmento({ geometria: [
      { latitud: -33, longitud: -71 }, { latitud: -33, longitud: -70.9999 },
    ] }, contexto);
    expect(resultado.puntaje_riesgo_historico).toBeCloseTo(23.08, 1);
    expect(resultado.puntaje_riesgo).toBeCloseTo(6.92, 1);
    expect(resultado.riesgo_historico_es_prior).toBe(true);
    expect(resultado.estado_riesgo_local).toBe("sin_datos_disponibles");
  });

  test("la exposición histórica promedia por longitud para no crecer solo por alargar la arista", () => {
    const latitud = -33;
    const metrosALongitud = (metros) => -71 + metros / (111320 * Math.cos(latitud * Math.PI / 180));
    const delitosLargos = Array.from({ length: 11 }, (_, i) => ({
      id: `e${i}`, latitud, longitud: metrosALongitud(i * 20), puntaje_gravedad: 100,
    }));
    const idx = crearIndiceEspacial(delitosLargos, 75);
    const corto = calcularExposicionIncidentes({
      geometria: [{ latitud, longitud: metrosALongitud(0) }, { latitud, longitud: metrosALongitud(100) }],
      indice: idx, radioMetros: 75, referencia: 13,
    });
    const largo = calcularExposicionIncidentes({
      geometria: [{ latitud, longitud: metrosALongitud(0) }, { latitud, longitud: metrosALongitud(200) }],
      indice: idx, radioMetros: 75, referencia: 13,
    });
    expect(Math.abs(corto.puntaje - largo.puntaje)).toBeLessThan(12);
  });
});
