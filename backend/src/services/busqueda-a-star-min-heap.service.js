const {
  calcularCostoArista,
  heuristicaAStar,
} = require("./ruta.service");
const { MinHeapIndexado } = require("./min-heap");

const reconstruirResultado = ({ nodoOrigen, nodoDestino, distancias, anteriores, aristasAnteriores, metricas }) => {
  const costoTotal = distancias.get(nodoDestino);
  if (!Number.isFinite(costoTotal)) return null;

  const nodosRuta = [];
  const aristasRuta = [];
  let actual = nodoDestino;
  while (actual !== nodoOrigen) {
    nodosRuta.unshift(actual);
    const arista = aristasAnteriores.get(actual);
    if (!arista) return null;
    aristasRuta.unshift(arista);
    actual = anteriores.get(actual);
    if (actual === undefined || actual === null) return null;
  }
  nodosRuta.unshift(nodoOrigen);
  return { nodosRuta, aristasRuta, costoTotal, metricas };
};

const claveAristaFisica = (arista) => {
  const extremos = [String(arista.nodo_origen), String(arista.nodo_destino)].sort();
  return `${extremos[0]}|${extremos[1]}|${String(arista.id_osm ?? "")}`;
};

const buscarConMinHeap = ({
  nodos,
  aristas,
  adyacenciaPreparada,
  nodoOrigen,
  nodoDestino,
  perfil = null,
  usarHeuristica = false,
  nodosExcluidos = new Set(),
  aristasExcluidas = new Set(),
  estaCancelada = () => false,
}) => {
  const adyacencia = adyacenciaPreparada || require("./ruta.service").construirAdyacencia(aristas);
  const nodosMap = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  const distancias = new Map([...nodosMap.keys()].map((id) => [id, Infinity]));
  const anteriores = new Map();
  const aristasAnteriores = new Map();
  distancias.set(nodoOrigen, 0);

  const pesoDistancia = perfil?.peso_distancia ?? require("./costo-ruta.service").PESO_DISTANCIA;
  const heuristica = (id) => usarHeuristica
    ? heuristicaAStar({
        nodo: id,
        nodoDestino,
        nodosMap,
        pesoDistancia,
        cantidadNodos: nodosMap.size,
      })
    : 0;

  const cola = new MinHeapIndexado();
  cola.insertarOActualizar(nodoOrigen, heuristica(nodoOrigen), { id: nodoOrigen, costoG: 0 });
  const metricas = {
    nodosExplorados: 0,
    aristasEvaluadas: 0,
    nodosInsertadosCola: 1,
    actualizacionesPrioridad: 0,
    operacionesCola: 1,
    nodosReabiertos: 0,
    tamanoMaximoCola: 1,
  };
  const nodosExpandidos = new Set();

  while (cola.size > 0) {
    if (estaCancelada()) {
      const error = new Error("La búsqueda de ruta fue cancelada.");
      error.code = "BUSQUEDA_CANCELADA";
      throw error;
    }

    const actual = cola.extraerMinimo();
    const { id: nodoActual, costoG } = actual.valor;
    if (costoG > distancias.get(nodoActual)) continue;
    metricas.nodosExplorados += 1;
    nodosExpandidos.add(nodoActual);
    if (nodoActual === nodoDestino) break;

    for (const vecino of adyacencia.get(nodoActual) || []) {
      if (estaCancelada()) {
        const error = new Error("La búsqueda de ruta fue cancelada.");
        error.code = "BUSQUEDA_CANCELADA";
        throw error;
      }
      if (
        nodosExcluidos.has(vecino.nodo) ||
        aristasExcluidas.has(vecino.arista) ||
        aristasExcluidas.has(claveAristaFisica(vecino.arista))
      ) {
        continue;
      }

      metricas.aristasEvaluadas += 1;
      let costo;
      try {
        costo = calcularCostoArista(vecino.arista, perfil);
      } catch {
        continue;
      }
      if (!Number.isFinite(costo) || costo < 0) continue;

      const nuevoCostoG = costoG + costo;
      if (nuevoCostoG >= distancias.get(vecino.nodo)) continue;

      distancias.set(vecino.nodo, nuevoCostoG);
      anteriores.set(vecino.nodo, nodoActual);
      aristasAnteriores.set(vecino.nodo, vecino.arista);
      if (nodosExpandidos.has(vecino.nodo)) metricas.nodosReabiertos += 1;
      const estado = cola.insertarOActualizar(
        vecino.nodo,
        nuevoCostoG + heuristica(vecino.nodo),
        { id: vecino.nodo, costoG: nuevoCostoG },
      );
      metricas.operacionesCola += 1;
      if (estado === "actualizado") metricas.actualizacionesPrioridad += 1;
      else metricas.nodosInsertadosCola += 1;
      metricas.tamanoMaximoCola = Math.max(metricas.tamanoMaximoCola, cola.size);
    }
  }

  return reconstruirResultado({
    nodoOrigen,
    nodoDestino,
    distancias,
    anteriores,
    aristasAnteriores,
    metricas,
  });
};

const aStarMinHeap = (args) => buscarConMinHeap({ ...args, usarHeuristica: true });

module.exports = { aStarMinHeap, claveAristaFisica };
