jest.mock("../../src/services/grafo-peatonal.service", () => ({
  obtenerGrafoPeatonal: jest.fn(),
}));

const {
  obtenerGrafoPeatonal,
} = require("../../src/services/grafo-peatonal.service");

const {
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