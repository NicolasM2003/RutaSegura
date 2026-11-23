const {
  construirAdyacencia,
  distanciaHaversine,
  generarCaminosYen,
} = require("../../src/services/ruta.service");
const { aStarMinHeap } = require("../../src/services/busqueda-a-star-min-heap.service");

const crearGrafo = () => {
  const nodos = [
    { id: "O", latitud: 0, longitud: 0 },
    { id: "A", latitud: 0, longitud: 0.002 },
    { id: "B", latitud: 0.001, longitud: 0.002 },
    { id: "D", latitud: 0, longitud: 0.004 },
  ];
  const coordenadas = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  const aristas = [["O", "A"], ["A", "D"], ["O", "B"], ["B", "D"]].map(
    ([nodo_origen, nodo_destino], indice) => ({
      id_osm: indice + 1,
      nodo_origen,
      nodo_destino,
      distancia_metros: distanciaHaversine(
        coordenadas.get(nodo_origen).latitud,
        coordenadas.get(nodo_origen).longitud,
        coordenadas.get(nodo_destino).latitud,
        coordenadas.get(nodo_destino).longitud,
      ),
      puntaje_riesgo: 0,
      nombre: `calle-${indice + 1}`,
    }),
  );
  return { nodos, aristas, adyacenciaPreparada: construirAdyacencia(aristas) };
};

describe("Generación de caminos Yen con A* + MinHeap", () => {
  const perfil = { peso_distancia: 0.9, peso_riesgo: 0.1 };

  it("encuentra caminos alternativos simples y ordenados por el costo del perfil", () => {
    const contexto = crearGrafo();
    const resultadoInicial = aStarMinHeap({
      ...contexto,
      nodoOrigen: "O",
      nodoDestino: "D",
      perfil,
    });

    const resultado = generarCaminosYen({
      contexto: { ...contexto, nodoOrigen: "O", nodoDestino: "D" },
      resultadoInicial,
      perfil,
      maxCandidatos: 5,
      maxDesviaciones: 20,
    });

    expect(resultado.caminos.length).toBeGreaterThanOrEqual(2);
    expect(resultado.caminos.length).toBeLessThanOrEqual(5);
    expect(resultado.caminos.map(({ costoTotal }) => costoTotal)).toEqual(
      [...resultado.caminos.map(({ costoTotal }) => costoTotal)].sort((a, b) => a - b),
    );
    for (const camino of resultado.caminos) {
      expect(camino.nodosRuta[0]).toBe("O");
      expect(camino.nodosRuta.at(-1)).toBe("D");
      expect(new Set(camino.nodosRuta).size).toBe(camino.nodosRuta.length);
    }
  });

  it("excluye temporalmente desvíos sin modificar el grafo original", () => {
    const contexto = crearGrafo();
    const original = JSON.stringify(contexto.aristas);
    const resultadoInicial = aStarMinHeap({
      ...contexto,
      nodoOrigen: "O",
      nodoDestino: "D",
      perfil,
    });

    generarCaminosYen({
      contexto: { ...contexto, nodoOrigen: "O", nodoDestino: "D" },
      resultadoInicial,
      perfil,
      maxCandidatos: 5,
      maxDesviaciones: 20,
    });

    expect(JSON.stringify(contexto.aristas)).toBe(original);
    expect(contexto.adyacenciaPreparada.size).toBe(contexto.nodos.length);
  });
});
