require("dotenv").config();

jest.mock("../src/services/grafo-peatonal.service", () => ({
  obtenerGrafoPeatonal: jest.fn(async () => ({
    nodos: [
      {
        id: "1",
        latitud: -33.024,
        longitud: -71.551,
        conexiones: ["2"],
      },
      {
        id: "2",
        latitud: -33.0241,
        longitud: -71.5511,
        conexiones: ["1"],
      },
      {
        id: "3",
        latitud: -33.015,
        longitud: -71.535,
        conexiones: ["4"],
      },
      {
        id: "4",
        latitud: -33.0151,
        longitud: -71.5351,
        conexiones: ["3"],
      },
    ],
    aristas: [
      {
        nodo_origen: "1",
        nodo_destino: "2",
        costo_arista: 10,
        distancia_metros: 10,
        puntaje_riesgo: 0,
        zonas_intersectadas: [],
      },
      {
        nodo_origen: "3",
        nodo_destino: "4",
        costo_arista: 10,
        distancia_metros: 10,
        puntaje_riesgo: 0,
        zonas_intersectadas: [],
      },
    ],
  })),
}));

const { calcularRutaSegura } = require("../src/services/ruta.service");

describe("Manejo de rutas sin conectividad", () => {
  test("debe devolver encontrada=false cuando no existe conexión", async () => {
    const resultado = await calcularRutaSegura({
      comuna: "Viña del Mar",
      origen: {
        latitud: -33.024,
        longitud: -71.551,
      },
      destino: {
        latitud: -33.015,
        longitud: -71.535,
      },
    });

    expect(resultado.encontrada).toBe(false);

    expect(resultado.mensaje).toBe(
      "No fue posible encontrar una ruta peatonal entre los puntos seleccionados."
    );
  });
});