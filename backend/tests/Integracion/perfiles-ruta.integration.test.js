require("dotenv").config();

jest.mock("../../src/services/grafo-peatonal.service", () => ({
  obtenerGrafoPeatonal: jest.fn(async () => ({
    nodos: [
      {
        id: "O",
        latitud: -33.024,
        longitud: -71.551,
        conexiones: ["A", "B", "C"],
      },
      {
        id: "A",
        latitud: -33.022,
        longitud: -71.549,
        conexiones: ["O", "D"],
      },
      {
        id: "B",
        latitud: -33.021,
        longitud: -71.548,
        conexiones: ["O", "D"],
      },
      {
        id: "C",
        latitud: -33.020,
        longitud: -71.547,
        conexiones: ["O", "D"],
      },
      {
        id: "D",
        latitud: -33.015,
        longitud: -71.535,
        conexiones: ["A", "B", "C"],
      },
    ],

    aristas: [
      // Ruta corta: mayor riesgo.
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

      // Ruta intermedia.
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

      // Ruta larga: menor riesgo.
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
  })),
}));

const {
  calcularRutaSegura,
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

describe("Cálculo de rutas según perfil", () => {
  test("el perfil menor_riesgo debe escoger el recorrido más seguro", async () => {
    const resultado = await calcularRutaSegura({
      ...trayecto,
      perfilRuta: "menor_riesgo",
    });

    expect(resultado.encontrada).toBe(true);
    expect(resultado.nodos_ruta).toEqual(["O", "C", "D"]);
    expect(resultado.puntaje_riesgo).toBe(0);
    expect(resultado.distancia_metros).toBe(200);
    expect(resultado.perfil_ruta).toBe("menor_riesgo");
  });

  test("el perfil equilibrada debe escoger el recorrido intermedio", async () => {
    const resultado = await calcularRutaSegura({
      ...trayecto,
      perfilRuta: "equilibrada",
    });

    expect(resultado.encontrada).toBe(true);
    expect(resultado.nodos_ruta).toEqual(["O", "B", "D"]);
    expect(resultado.puntaje_riesgo).toBe(40);
    expect(resultado.distancia_metros).toBe(120);
    expect(resultado.perfil_ruta).toBe("equilibrada");
  });

  test("el perfil mas_rapida debe priorizar el recorrido más corto", async () => {
    const resultado = await calcularRutaSegura({
      ...trayecto,
      perfilRuta: "mas_rapida",
    });

    expect(resultado.encontrada).toBe(true);
    expect(resultado.nodos_ruta).toEqual(["O", "A", "D"]);
    expect(resultado.puntaje_riesgo).toBe(100);
    expect(resultado.distancia_metros).toBe(100);
    expect(resultado.perfil_ruta).toBe("mas_rapida");
  });

  test("debe rechazar un perfil no definido", async () => {
    await expect(
      calcularRutaSegura({
        ...trayecto,
        perfilRuta: "perfil_inexistente",
      })
    ).rejects.toThrow("Perfil de ruta no válido");
  });
});