jest.mock("../../src/services/grafo-peatonal.service", () => ({
  obtenerGrafoPeatonal: jest.fn(),
}));

const {
  obtenerGrafoPeatonal,
} = require("../../src/services/grafo-peatonal.service");

const {
  calcularRutaSegura,
  calcularRutasAlternativas,
} = require("../../src/services/ruta.service");

const trayecto = {
  comuna: "Viña del Mar",
  origen: {
    latitud: -33.024,
    longitud: -71.551,
  },
  destino: {
    latitud: -33.015,
    longitud: -71.535,
  },
  rangoHorario: "20:00 - 23:59",
};

/*
 * Grafo con tres recorridos posibles:
 *
 * O -> A -> D: corto, pero de alto riesgo.
 * O -> B -> D: intermedio en distancia y riesgo.
 * O -> C -> D: más largo, pero de menor riesgo.
 */
const crearGrafoTresAlternativas = () => ({
  nodos: [
    {
      id: "O",
      latitud: -33.024,
      longitud: -71.551,
    },
    {
      id: "A",
      latitud: -33.022,
      longitud: -71.549,
    },
    {
      id: "B",
      latitud: -33.021,
      longitud: -71.548,
    },
    {
      id: "C",
      latitud: -33.020,
      longitud: -71.547,
    },
    {
      id: "D",
      latitud: -33.015,
      longitud: -71.535,
    },
  ],

  aristas: [
    // Alternativa de menor distancia y mayor riesgo.
    {
      id_osm: 101,
      nodo_origen: "O",
      nodo_destino: "A",
      distancia_metros: 50,
      puntaje_riesgo: 100,
      nivel_riesgo: "Alto",
      costo_riesgo: 50,
      costo_distancia: 15,
      costo_arista: 50,
      zonas_intersectadas: [],
    },
    {
      id_osm: 102,
      nodo_origen: "A",
      nodo_destino: "D",
      distancia_metros: 50,
      puntaje_riesgo: 100,
      nivel_riesgo: "Alto",
      costo_riesgo: 50,
      costo_distancia: 15,
      costo_arista: 50,
      zonas_intersectadas: [],
    },

    // Alternativa intermedia.
    {
      id_osm: 201,
      nodo_origen: "O",
      nodo_destino: "B",
      distancia_metros: 60,
      puntaje_riesgo: 40,
      nivel_riesgo: "Medio",
      costo_riesgo: 24,
      costo_distancia: 18,
      costo_arista: 60,
      zonas_intersectadas: [],
    },
    {
      id_osm: 202,
      nodo_origen: "B",
      nodo_destino: "D",
      distancia_metros: 60,
      puntaje_riesgo: 40,
      nivel_riesgo: "Medio",
      costo_riesgo: 24,
      costo_distancia: 18,
      costo_arista: 60,
      zonas_intersectadas: [],
    },

    // Alternativa más larga y de menor riesgo.
    {
      id_osm: 301,
      nodo_origen: "O",
      nodo_destino: "C",
      distancia_metros: 100,
      puntaje_riesgo: 0,
      nivel_riesgo: "Bajo",
      costo_riesgo: 0,
      costo_distancia: 30,
      costo_arista: 30,
      zonas_intersectadas: [],
    },
    {
      id_osm: 302,
      nodo_origen: "C",
      nodo_destino: "D",
      distancia_metros: 100,
      puntaje_riesgo: 0,
      nivel_riesgo: "Bajo",
      costo_riesgo: 0,
      costo_distancia: 30,
      costo_arista: 30,
      zonas_intersectadas: [],
    },
  ],
});

const crearGrafoUnSoloRecorrido = () => ({
  nodos: [
    {
      id: "O",
      latitud: -33.024,
      longitud: -71.551,
    },
    {
      id: "X",
      latitud: -33.020,
      longitud: -71.548,
    },
    {
      id: "D",
      latitud: -33.015,
      longitud: -71.535,
    },
  ],

  aristas: [
    {
      id_osm: 401,
      nodo_origen: "O",
      nodo_destino: "X",
      distancia_metros: 70,
      puntaje_riesgo: 30,
      nivel_riesgo: "Bajo",
      costo_riesgo: 21,
      costo_distancia: 21,
      costo_arista: 70,
      zonas_intersectadas: [],
    },
    {
      id_osm: 402,
      nodo_origen: "X",
      nodo_destino: "D",
      distancia_metros: 70,
      puntaje_riesgo: 30,
      nivel_riesgo: "Bajo",
      costo_riesgo: 21,
      costo_distancia: 21,
      costo_arista: 70,
      zonas_intersectadas: [],
    },
  ],
});

const crearGrafoSinConexion = () => ({
  nodos: [
    {
      id: "O",
      latitud: -33.024,
      longitud: -71.551,
    },
    {
      id: "A",
      latitud: -33.023,
      longitud: -71.550,
    },
    {
      id: "X",
      latitud: -33.016,
      longitud: -71.536,
    },
    {
      id: "D",
      latitud: -33.015,
      longitud: -71.535,
    },
  ],

  aristas: [
    {
      id_osm: 501,
      nodo_origen: "O",
      nodo_destino: "A",
      distancia_metros: 50,
      puntaje_riesgo: 10,
      nivel_riesgo: "Bajo",
      costo_riesgo: 5,
      costo_distancia: 15,
      costo_arista: 50,
      zonas_intersectadas: [],
    },
    {
      id_osm: 502,
      nodo_origen: "X",
      nodo_destino: "D",
      distancia_metros: 50,
      puntaje_riesgo: 10,
      nivel_riesgo: "Bajo",
      costo_riesgo: 5,
      costo_distancia: 15,
      costo_arista: 50,
      zonas_intersectadas: [],
    },
  ],
});

const crearGrafoCalibracion = () => {
  const nodos = [
    ["O", -33.024, -71.551], ["I", -33.023, -71.550],
    ["A", -33.022, -71.549], ["B", -33.021, -71.548],
    ["C", -33.020, -71.547], ["E", -33.019, -71.546],
    ["J", -33.018, -71.545], ["D", -33.015, -71.535],
  ].map(([id, latitud, longitud]) => ({ id, latitud, longitud }));
  const arista = (id, nodo_origen, nodo_destino, distancia_metros, puntaje_riesgo, nombre = "Corredor") => ({
    id, id_osm: id, nodo_origen, nodo_destino, distancia_metros,
    puntaje_riesgo, nombre, zonas_intersectadas: [],
  });
  return {
    nodos,
    aristas: [
      arista("inicio", "O", "I", 20, 10, "Inicio común"),
      arista("A1", "I", "A", 30, 80, "Alternativa A"), arista("A2", "A", "J", 30, 80, "Alternativa A"),
      arista("B1", "I", "B", 40, 60, "Alternativa B"), arista("B2", "B", "J", 40, 60, "Alternativa B"),
      arista("C1", "I", "C", 55, 35, "Alternativa C"), arista("C2", "C", "J", 55, 35, "Alternativa C"),
      arista("E1", "I", "E", 70, 15, "Alternativa E"), arista("E2", "E", "J", 70, 15, "Alternativa E"),
      arista("fin", "J", "D", 20, 10, "Fin común"),
    ],
  };
};

const crearGrafoAltaSimilitud = (riesgoAlternativa, distanciaAlternativa) => ({
  nodos: [
    { id: "O", latitud: trayecto.origen.latitud, longitud: trayecto.origen.longitud },
    // Ambos recorridos siguen el mismo eje; sus cortes OSM son distintos.
    { id: "A", latitud: trayecto.origen.latitud + (trayecto.destino.latitud - trayecto.origen.latitud) * 0.4, longitud: trayecto.origen.longitud + (trayecto.destino.longitud - trayecto.origen.longitud) * 0.4 },
    { id: "B", latitud: trayecto.origen.latitud + (trayecto.destino.latitud - trayecto.origen.latitud) * 0.6, longitud: trayecto.origen.longitud + (trayecto.destino.longitud - trayecto.origen.longitud) * 0.6 },
    { id: "D", latitud: trayecto.destino.latitud, longitud: trayecto.destino.longitud },
  ],
  aristas: [
    { id: "via-a1", id_osm: 1, nodo_origen: "O", nodo_destino: "A", distancia_metros: 50, puntaje_riesgo: 60, nombre: "Misma avenida", zonas_intersectadas: [] },
    { id: "via-a2", id_osm: 1, nodo_origen: "A", nodo_destino: "D", distancia_metros: 50, puntaje_riesgo: 60, nombre: "Misma avenida", zonas_intersectadas: [] },
    { id: "via-b1", id_osm: 2, nodo_origen: "O", nodo_destino: "B", distancia_metros: distanciaAlternativa / 2, puntaje_riesgo: riesgoAlternativa, nombre: "Misma avenida", zonas_intersectadas: [] },
    { id: "via-b2", id_osm: 2, nodo_origen: "B", nodo_destino: "D", distancia_metros: distanciaAlternativa / 2, puntaje_riesgo: riesgoAlternativa, nombre: "Misma avenida", zonas_intersectadas: [] },
  ],
});

const crearGrafoParalelo = () => ({
  nodos: [
    { id: "O", latitud: trayecto.origen.latitud, longitud: trayecto.origen.longitud },
    { id: "D", latitud: trayecto.destino.latitud, longitud: trayecto.destino.longitud },
  ],
  aristas: [
    { id: "seguro", id_osm: 1, nodo_origen: "O", nodo_destino: "D", distancia_metros: 100, puntaje_riesgo: 10, nombre: "Calle segura", zonas_intersectadas: [] },
    { id: "riesgoso", id_osm: 2, nodo_origen: "O", nodo_destino: "D", distancia_metros: 80, puntaje_riesgo: 90, nombre: "Calle rápida", zonas_intersectadas: [] },
  ],
});

const crearProyeccionDelTrayecto = () => {
  const latOrigen = trayecto.origen.latitud;
  const lonOrigen = trayecto.origen.longitud;
  const dx = (trayecto.destino.longitud - lonOrigen) * 111320 * Math.cos(latOrigen * Math.PI / 180);
  const dy = (trayecto.destino.latitud - latOrigen) * 111320;
  const longitud = Math.hypot(dx, dy);
  const ux = dx / longitud;
  const uy = dy / longitud;
  const px = -uy;
  const py = ux;
  return (avance, desplazamiento = 0) => {
    const x = ux * avance + px * desplazamiento;
    const y = uy * avance + py * desplazamiento;
    return {
      latitud: latOrigen + y / 111320,
      longitud: lonOrigen + x / (111320 * Math.cos(latOrigen * Math.PI / 180)),
    };
  };
};

const crearGrafoCasoACorredorCompartido = () => {
  const punto = crearProyeccionDelTrayecto();

  // Distancia geométrica real entre el origen y el destino.
  // Debe coincidir con la longitud utilizada por la proyección.
  const dx =
    (trayecto.destino.longitud - trayecto.origen.longitud) *
    111320 *
    Math.cos(trayecto.origen.latitud * Math.PI / 180);

  const dy =
    (trayecto.destino.latitud - trayecto.origen.latitud) *
    111320;

  const longitud = Math.hypot(dx, dy);

  const nodos = [
    { id: "O", ...punto(0) },
    { id: "D", ...punto(longitud) },
    { id: "A0", ...punto(10) },
    { id: "A1", ...punto(longitud - 10) },
    { id: "B0", ...punto(10, 7.67) },
    { id: "B1", ...punto(longitud - 10, 7.67) },
  ];

  const arista = (
    id,
    id_osm,
    nodo_origen,
    nodo_destino,
    distancia_metros,
    puntaje_riesgo
  ) => ({
    id,
    id_osm,
    nodo_origen,
    nodo_destino,
    distancia_metros,
    puntaje_riesgo,
    nombre: "Avenida del Corredor",
    tipo: "primary",
    sidewalk: null,
    zonas_intersectadas: [],
  });

  return {
    nodos,
    aristas: [
      arista("a-inicio", 1001, "O", "A0", 10, 47),
      arista("a-corredor", 1001, "A0", "A1", 1594.76, 47),
      arista("a-fin", 1001, "A1", "D", 10, 47),

      arista("b-inicio", 2002, "O", "B0", 12.6, 48.57),
      arista("b-corredor", 2002, "B0", "B1", 1562.32, 48.57),
      arista("b-fin", 2002, "B1", "D", 12.6, 48.57),
    ],
  };
};

const crearGrafoCasoBAlternativasDistintas = () => {
  const punto = crearProyeccionDelTrayecto();
  const largo = Math.hypot(
    (trayecto.destino.longitud - trayecto.origen.longitud) * 111320 * Math.cos(trayecto.origen.latitud * Math.PI / 180),
    (trayecto.destino.latitud - trayecto.origen.latitud) * 111320,
  );
  const opciones = [
    { perfil: "menor", nodo: "A", distancia: 1202.61, riesgo: 44.61, offset: 0, nombre: "Calle A" },
    { perfil: "equilibrada", nodo: "B", distancia: 1189.58, riesgo: 45.68, offset: 300, nombre: "Calle B" },
    { perfil: "rapida", nodo: "C", distancia: 1165.04, riesgo: 50.87, offset: -300, nombre: "Calle C" },
  ];
  const nodos = [{ id: "O", ...punto(0) }, { id: "D", ...punto(largo) }];
  const aristas = [];
  for (const opcion of opciones) {
    nodos.push({ id: `${opcion.nodo}M`, ...punto(largo / 2, opcion.offset) });
    aristas.push(
      { id: `${opcion.nodo}1`, id_osm: `${opcion.nodo}-osm`, nodo_origen: "O", nodo_destino: `${opcion.nodo}M`, distancia_metros: opcion.distancia / 2, puntaje_riesgo: opcion.riesgo, nombre: opcion.nombre, tipo: "residential", zonas_intersectadas: [] },
      { id: `${opcion.nodo}2`, id_osm: `${opcion.nodo}-osm`, nodo_origen: `${opcion.nodo}M`, nodo_destino: "D", distancia_metros: opcion.distancia / 2, puntaje_riesgo: opcion.riesgo, nombre: opcion.nombre, tipo: "residential", zonas_intersectadas: [] },
    );
  }
  return { nodos, aristas };
};

describe("Generación de rutas alternativas", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    obtenerGrafoPeatonal.mockResolvedValue(
      crearGrafoTresAlternativas()
    );
  });

  test("debe generar tres recorridos diferentes", async () => {
    const resultado =
      await calcularRutasAlternativas(trayecto);

    expect(resultado.encontrada).toBe(true);
    expect(resultado.cantidad_rutas).toBe(3);
    expect(resultado.rutas).toHaveLength(3);

    expect(
      resultado.rutas.map((ruta) => ruta.perfil_ruta)
    ).toEqual([
      "menor_riesgo",
      "equilibrada",
      "mas_rapida",
    ]);

    expect(
      resultado.rutas.map((ruta) => ruta.nodos_ruta)
    ).toEqual([
      ["O", "C", "D"],
      ["O", "B", "D"],
      ["O", "A", "D"],
    ]);

    expect(
      resultado.rutas.map(
        (ruta) => ruta.tiempo_estimado_minutos
      )
    ).toEqual([2.8, 1.7, 1.4]);
  });

  test("debe consultar el grafo peatonal una sola vez", async () => {
    await calcularRutasAlternativas(trayecto);

    expect(obtenerGrafoPeatonal).toHaveBeenCalledTimes(1);

    expect(
      obtenerGrafoPeatonal
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        comuna: "Viña del Mar",
        rangoHorario: "20:00 - 23:59",
        soloSupabase: true,
      })
    );
  });

  test("cada perfil obtiene su óptimo independientemente del orden y de las rutas anteriores", async () => {
    const grafo = crearGrafoTresAlternativas();
    const grafoOriginal = structuredClone(grafo);
    const perfiles = ["menor_riesgo", "equilibrada", "mas_rapida"];
    const logOriginal = console.log;
    console.log = () => {};
    try {
      const calcularEnOrden = async (orden) => {
        const resultados = new Map();
        for (const perfilRuta of orden) {
          resultados.set(perfilRuta, await calcularRutaSegura({
            ...trayecto,
            perfilRuta,
            grafoPrecalculado: grafo,
            factorPenalizacion: 0,
            usosSegmento: new Map(),
          }));
        }
        return resultados;
      };
      const normal = await calcularEnOrden(perfiles);
      const inverso = await calcularEnOrden([...perfiles].reverse());
      for (const perfilRuta of perfiles) {
        const esperado = normal.get(perfilRuta);
        const inversoPerfil = inverso.get(perfilRuta);
        expect(inversoPerfil.nodos_ruta).toEqual(esperado.nodos_ruta);
        expect(inversoPerfil.distancia_metros).toBe(esperado.distancia_metros);
        expect(inversoPerfil.puntaje_riesgo).toBe(esperado.puntaje_riesgo);
        expect(inversoPerfil.costo_navegacion).toBe(esperado.costo_navegacion);
      }

      const alternativas = await calcularRutasAlternativas(trayecto);
      expect(grafo).toEqual(grafoOriginal);
      for (const ruta of alternativas.rutas) {
        const optima = normal.get(ruta.perfil_ruta);
        expect(ruta.nodos_ruta).toEqual(optima.nodos_ruta);
        expect(ruta.distancia_metros).toBe(optima.distancia_metros);
        expect(ruta.puntaje_riesgo).toBe(optima.puntaje_riesgo);
        expect(ruta.costo_navegacion).toBe(optima.costo_navegacion);
      }
      expect(alternativas.rutas.find((ruta) => ruta.perfil_ruta === "mas_rapida").nodos_ruta)
        .toEqual(normal.get("mas_rapida").nodos_ruta);
    } finally {
      console.log = logOriginal;
    }
  });

  test("las rutas principales no heredan penalización por segmentos usados", async () => {
    const grafo = crearGrafoCalibracion();
    const idsPorParNodos = new Map(grafo.aristas.map((arista) => [`${arista.nodo_origen}|${arista.nodo_destino}`, arista.id]));
    obtenerGrafoPeatonal.mockResolvedValue(grafo);
    const resultados = [];
    const perfiles = ["menor_riesgo", "equilibrada", "mas_rapida"];
    const referencias = new Map();
    for (const perfilRuta of perfiles) {
      referencias.set(perfilRuta, await calcularRutaSegura({
        ...trayecto, perfilRuta, grafoPrecalculado: grafo,
      }));
    }

    for (const factorPenalizacion of [0, 0.25, 0.5, 1]) {
      const inicio = process.hrtime.bigint();
      const resultado = await calcularRutasAlternativas({ ...trayecto, factorPenalizacion });
      const tiempo_ms = Number(process.hrtime.bigint() - inicio) / 1e6;
      const rutas = resultado.rutas.map((ruta) => {
        const ids = ruta.nodos_ruta.slice(1).map((nodo, index) => {
          const anterior = ruta.nodos_ruta[index];
          return idsPorParNodos.get(`${anterior}|${nodo}`) || idsPorParNodos.get(`${nodo}|${anterior}`);
        });
        return {
          perfil: ruta.perfil_ruta,
          segmentos: ids,
          distancia_m: ruta.distancia_metros,
          riesgo: ruta.puntaje_riesgo,
          costo_original: ruta.costo_navegacion,
        };
      });
      for (const ruta of rutas) {
        const referencia = referencias.get(ruta.perfil);
        ruta.variacion_distancia_vs_base_m = Number((ruta.distancia_m - referencia.distancia_metros).toFixed(2));
        ruta.variacion_riesgo_vs_base = Number((ruta.riesgo - referencia.puntaje_riesgo).toFixed(2));
      }
      const segmentos = rutas.map((ruta) => new Set(ruta.segmentos));
      const paresCompartidos = [];
      for (let i = 0; i < segmentos.length; i++) {
        for (let j = i + 1; j < segmentos.length; j++) {
          paresCompartidos.push([...segmentos[i]].filter((id) => segmentos[j].has(id)).length);
        }
      }
      resultados.push({
        factor: factorPenalizacion,
        cantidad_rutas: resultado.cantidad_rutas,
        segmentos_por_ruta: rutas.map((ruta) => ruta.segmentos),
        intersecciones_por_par: paresCompartidos,
        distancia_total_m: rutas.reduce((suma, ruta) => suma + ruta.distancia_m, 0),
        distancia_por_ruta_m: rutas.map((ruta) => ruta.distancia_m),
        riesgo_por_ruta: rutas.map((ruta) => ruta.riesgo),
        variacion_distancia_por_perfil_m: rutas.map((ruta) => ruta.variacion_distancia_vs_base_m),
        variacion_riesgo_por_perfil: rutas.map((ruta) => ruta.variacion_riesgo_vs_base),
        costo_original_por_ruta: rutas.map((ruta) => ruta.costo_original),
        tiempo_ms,
      });
    }

    console.log("RESULTADOS_CALIBRACION_SEG174", JSON.stringify(resultados));
    expect(resultados).toHaveLength(4);
    expect(resultados.every((resultado) => resultado.cantidad_rutas > 0)).toBe(true);
    const rutasBase = resultados[0].segmentos_por_ruta;
    for (const resultado of resultados.slice(1)) {
      expect(resultado.segmentos_por_ruta).toEqual(rutasBase);
      expect(resultado.distancia_por_ruta_m).toEqual(resultados[0].distancia_por_ruta_m);
      expect(resultado.riesgo_por_ruta).toEqual(resultados[0].riesgo_por_ruta);
      expect(resultado.costo_original_por_ruta).toEqual(resultados[0].costo_original_por_ruta);
    }
  });

  test("filtra alternativas de más de 90% de similitud si el riesgo difiere menos de 8 puntos", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(crearGrafoAltaSimilitud(54, 108));
    const resultado = await calcularRutasAlternativas(trayecto);
    expect(resultado.cantidad_rutas).toBe(1);
    expect(resultado.rutas[0].perfil_ruta).toBe("menor_riesgo");
  });

  test("conserva alternativas similares si la diferencia de riesgo alcanza 8 puntos", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(crearGrafoAltaSimilitud(48, 110));
    const resultado = await calcularRutasAlternativas(trayecto);
    expect(resultado.cantidad_rutas).toBe(2);
    expect(new Set(resultado.rutas.map((ruta) => ruta.puntaje_riesgo)).size).toBe(2);
  });

  test("caso A: descarta la ruta equilibrada del mismo corredor a 7.67 m y conserva menor riesgo", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(crearGrafoCasoACorredorCompartido());
    const resultado = await calcularRutasAlternativas(trayecto);
    expect(resultado.cantidad_rutas).toBe(1);
    expect(resultado.rutas.map((ruta) => ruta.perfil_ruta)).toEqual(["menor_riesgo"]);
    expect(resultado.rutas[0].distancia_metros).toBeCloseTo(1614.76, 1);
    expect(resultado.rutas[0].puntaje_riesgo).toBeCloseTo(47, 1);
  });

  test("caso B: conserva tres alternativas con geometrías realmente distintas", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(crearGrafoCasoBAlternativasDistintas());
    const resultado = await calcularRutasAlternativas(trayecto);
    expect(resultado.cantidad_rutas).toBe(3);
    expect(resultado.rutas.map((ruta) => ruta.perfil_ruta)).toEqual([
      "menor_riesgo", "equilibrada", "mas_rapida",
    ]);
    expect(resultado.rutas.map((ruta) => ruta.distancia_metros)).toEqual([
      1202.61, 1189.58, 1165.04,
    ]);
    expect(resultado.rutas.map((ruta) => ruta.puntaje_riesgo)).toEqual([
      44.61, 45.68, 50.87,
    ]);
  });

  test("no confunde la misma secuencia de nodos con segmentos paralelos distintos", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(crearGrafoParalelo());
    const resultado = await calcularRutasAlternativas(trayecto);
    expect(resultado.cantidad_rutas).toBe(2);
    expect(resultado.rutas.map((ruta) => ruta.nodos_ruta)).toEqual([["O", "D"], ["O", "D"]]);
  });

  test("debe descartar alternativas con el mismo recorrido", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(
      crearGrafoUnSoloRecorrido()
    );

    const resultado =
      await calcularRutasAlternativas(trayecto);

    expect(resultado.encontrada).toBe(true);
    expect(resultado.cantidad_rutas).toBe(1);
    expect(resultado.rutas).toHaveLength(1);

    expect(resultado.mensaje).toContain(
      "Solo fue posible generar 1 rutas peatonales diferentes"
    );

    expect(obtenerGrafoPeatonal).toHaveBeenCalledTimes(1);
  });

  test("debe informar cuando no existe conexión entre origen y destino", async () => {
    obtenerGrafoPeatonal.mockResolvedValue(
      crearGrafoSinConexion()
    );

    const resultado =
      await calcularRutasAlternativas(trayecto);

    expect(resultado.encontrada).toBe(false);
    expect(resultado.cantidad_rutas).toBe(0);
    expect(resultado.rutas).toHaveLength(0);

    expect(resultado.mensaje).toBe(
      "No fue posible encontrar una ruta peatonal entre los puntos seleccionados."
    );

    expect(obtenerGrafoPeatonal).toHaveBeenCalledTimes(1);
  });
});
