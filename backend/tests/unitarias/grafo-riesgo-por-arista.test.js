jest.mock("../../src/services/riesgo-red.service", () => ({
  obtenerDatosRedConRiesgo: jest.fn(),
  calcularRiesgoSegmento: jest.fn(),
}));

const riesgoRed = require("../../src/services/riesgo-red.service");
const { obtenerGrafoPeatonal } = require("../../src/services/grafo-peatonal.service");
const { aStarMinHeap } = require("../../src/services/busqueda-a-star-min-heap.service");
const { calcularCostoArista } = require("../../src/services/ruta.service");

describe("riesgo individual por arista del grafo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const red = [{
      id_osm: "osm-1",
      nombre: "Avenida de prueba",
      longitud_metros: 22.24,
      geometria: [
        { nodo_id: "O", latitud: -33, longitud: -71 },
        { nodo_id: "A", latitud: -33, longitud: -70.9999 },
        { nodo_id: "D", latitud: -33, longitud: -70.9998 },
      ],
    }];
    riesgoRed.obtenerDatosRedConRiesgo.mockResolvedValue({
      red,
      modelo: { version: "hibrido-1", rangoHorario: "20:00 - 23:59", cobertura: { estado: "registros_disponibles" } },
    });
    riesgoRed.calcularRiesgoSegmento.mockImplementation(({ geometria }) => ({
      puntaje_riesgo_temporal: 5,
      puntaje_riesgo_historico: geometria[0].nodo_id === "O" ? 10 : 80,
      puntaje_riesgo: geometria[0].nodo_id === "O" ? 6.5 : 27.5,
      nivel_riesgo: "Bajo",
      zonas_intersectadas: [],
      delitos_individuales_cercanos: [],
      cobertura_riesgo: { estado: "registros_disponibles" },
      estado_riesgo_local: "incidentes_registrados_evaluados",
      version_modelo_riesgo: "hibrido-1",
      rango_horario_evaluado: "20:00 - 23:59",
      modo_temporal: "rango_seleccionado",
      densidad_historica_normalizada: 0.1,
      gravedad_historica_ponderada: 80,
      cantidad_delitos_historicos_cercanos: 1,
    }));
  });

  test("separa la vía en aristas y calcula un riesgo propio para cada una", async () => {
    const grafo = await obtenerGrafoPeatonal({ comuna: "Viña del Mar", rangoHorario: "20:00 - 23:59" });
    expect(grafo.aristas).toHaveLength(2);
    expect(riesgoRed.calcularRiesgoSegmento).toHaveBeenCalledTimes(2);
    expect(riesgoRed.calcularRiesgoSegmento.mock.calls[0][0].geometria).toHaveLength(2);
    expect(grafo.aristas.map((arista) => arista.puntaje_riesgo)).toEqual([6.5, 27.5]);
    expect(grafo.aristas.map((arista) => arista.puntaje_riesgo_historico)).toEqual([10, 80]);
  });

  test("A* + MinHeap usa los riesgos combinados de cada arista para calcular el costo", async () => {
    const grafo = await obtenerGrafoPeatonal({ comuna: "Viña del Mar", rangoHorario: "20:00 - 23:59" });
    const argumentos = {
      nodos: grafo.nodos,
      aristas: grafo.aristas,
      nodoOrigen: "O",
      nodoDestino: "D",
    };
    const resultadoAStar = aStarMinHeap(argumentos);
    const costoEsperado = resultadoAStar.aristasRuta.reduce(
      (suma, arista) => suma + calcularCostoArista(arista),
      0,
    );
    expect(resultadoAStar.costoTotal).toBeCloseTo(costoEsperado);
    expect(grafo.aristas.every((arista) => arista.puntaje_riesgo === arista.puntaje_riesgo_combinado)).toBe(true);
  });
});
