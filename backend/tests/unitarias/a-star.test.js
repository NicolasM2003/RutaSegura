const { aStarMinHeap } = require("../../src/services/busqueda-a-star-min-heap.service");
const {
  calcularCostoArista,
  distanciaHaversine,
  heuristicaAStar,
} = require("../../src/services/ruta.service");
const { PERFILES_RUTA } = require("../../src/config/perfiles-ruta.config");

const nodos = [
  { id: "O", latitud: -33, longitud: -71 },
  { id: "A", latitud: -33, longitud: -70.9999 },
  { id: "B", latitud: -33.0001, longitud: -70.9999 },
  { id: "D", latitud: -33, longitud: -70.9998 },
];
const nodoPorId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
const crearArista = (origen, destino, riesgo = 0) => ({
  nodo_origen: origen,
  nodo_destino: destino,
  distancia_metros: distanciaHaversine(
    nodoPorId.get(origen).latitud,
    nodoPorId.get(origen).longitud,
    nodoPorId.get(destino).latitud,
    nodoPorId.get(destino).longitud,
  ),
  puntaje_riesgo: riesgo,
});
const grafo = {
  nodos,
  aristas: [
    crearArista("O", "A", 100),
    crearArista("A", "D", 100),
    crearArista("O", "B", 0),
    crearArista("B", "D", 0),
  ],
};

const costoCamino = (aristas, perfil) => aristas.reduce(
  (total, arista) => total + calcularCostoArista(arista, perfil),
  0,
);

describe("A* + MinHeap del motor habitual", () => {
  test.each(Object.entries(PERFILES_RUTA))("calcula un costo óptimo para el perfil %s", (_nombre, perfil) => {
    const resultado = aStarMinHeap({
      ...grafo,
      nodoOrigen: "O",
      nodoDestino: "D",
      perfil,
    });
    const caminosPosibles = [
      [grafo.aristas[0], grafo.aristas[1]],
      [grafo.aristas[2], grafo.aristas[3]],
    ];
    const costoOptimo = Math.min(...caminosPosibles.map((camino) => costoCamino(camino, perfil)));

    expect(resultado.nodosRuta[0]).toBe("O");
    expect(resultado.nodosRuta.at(-1)).toBe("D");
    expect(resultado.costoTotal).toBeCloseTo(costoOptimo, 10);
    expect(resultado.metricas).toEqual(expect.objectContaining({
      nodosExplorados: expect.any(Number),
      aristasEvaluadas: expect.any(Number),
      nodosInsertadosCola: expect.any(Number),
      operacionesCola: expect.any(Number),
      tamanoMaximoCola: expect.any(Number),
    }));
  });

  test("devuelve null si no hay conexión e ignora aristas con riesgo inválido", () => {
    const fragmentado = {
      nodos: [...nodos, { id: "X", latitud: -33.01, longitud: -71.01 }],
      aristas: [
        { nodo_origen: "O", nodo_destino: "A", distancia_metros: 1, puntaje_riesgo: 101 },
        { nodo_origen: "A", nodo_destino: "X", distancia_metros: 1, puntaje_riesgo: 0 },
      ],
    };
    expect(aStarMinHeap({ ...fragmentado, nodoOrigen: "O", nodoDestino: "X" })).toBeNull();
  });

  test("origen y destino iguales producen ruta de costo cero", () => {
    expect(aStarMinHeap({ ...grafo, nodoOrigen: "O", nodoDestino: "O" })).toMatchObject({
      nodosRuta: ["O"],
      aristasRuta: [],
      costoTotal: 0,
    });
  });

  test("la heurística es una cota inferior para los restantes caminos de prueba", () => {
    const perfil = PERFILES_RUTA.mas_rapida;
    const mapaNodos = new Map(nodos.map((nodo) => [nodo.id, nodo]));
    const costoHaciaDestino = {
      O: Math.min(costoCamino([grafo.aristas[0], grafo.aristas[1]], perfil), costoCamino([grafo.aristas[2], grafo.aristas[3]], perfil)),
      A: costoCamino([grafo.aristas[1]], perfil),
      B: costoCamino([grafo.aristas[3]], perfil),
      D: 0,
    };

    for (const nodo of nodos) {
      const h = heuristicaAStar({
        nodo: nodo.id,
        nodoDestino: "D",
        nodosMap: mapaNodos,
        pesoDistancia: perfil.peso_distancia,
        cantidadNodos: nodos.length,
      });
      expect(h).toBeLessThanOrEqual(costoHaciaDestino[nodo.id]);
    }
    expect(heuristicaAStar({ nodo: "D", nodoDestino: "D", nodosMap: mapaNodos, pesoDistancia: 0.9, cantidadNodos: nodos.length })).toBe(0);
    expect(heuristicaAStar({ nodo: "O", nodoDestino: "D", nodosMap: mapaNodos, pesoDistancia: 0, cantidadNodos: nodos.length })).toBe(0);
  });

  test("reabre nodos y corrige un g previo al descubrir un camino menor", () => {
    const nodosReapertura = [
      { id: "O", latitud: 10.02205 / 111_320, longitud: 100 / 111_320 },
      { id: "A", latitud: 10 / 111_320, longitud: 0 },
      { id: "B", latitud: 10.0441 / 111_320, longitud: 0 },
      { id: "D", latitud: 9 / 111_320, longitud: 0 },
    ];
    const aristas = [
      { nodo_origen: "O", nodo_destino: "A", distancia_metros: 100, puntaje_riesgo: 0.017857142857 },
      { nodo_origen: "O", nodo_destino: "B", distancia_metros: 100, puntaje_riesgo: 0 },
      { nodo_origen: "B", nodo_destino: "A", distancia_metros: 0.04, puntaje_riesgo: 0 },
      { nodo_origen: "A", nodo_destino: "D", distancia_metros: 1, puntaje_riesgo: 0 },
    ];
    const resultado = aStarMinHeap({
      nodos: nodosReapertura,
      aristas,
      nodoOrigen: "O",
      nodoDestino: "D",
      perfil: { peso_distancia: 0.3, peso_riesgo: 0.7 },
    });
    expect(resultado.metricas.nodosReabiertos).toBeGreaterThan(0);
    expect(resultado.costoTotal).toBeCloseTo(
      aristas.slice(1, 3).concat(aristas[3]).reduce((suma, arista) => suma + calcularCostoArista(arista, { peso_distancia: 0.3, peso_riesgo: 0.7 }), 0),
      10,
    );
  });

  test("no modifica los nodos ni las aristas originales", () => {
    const original = JSON.stringify(grafo);
    aStarMinHeap({ ...grafo, nodoOrigen: "O", nodoDestino: "D", perfil: PERFILES_RUTA.equilibrada });
    expect(JSON.stringify(grafo)).toBe(original);
  });
});
