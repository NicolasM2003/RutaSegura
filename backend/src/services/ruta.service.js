const {
  obtenerGrafoPeatonal,
} = require("./grafo-peatonal.service");

/*
 * Calcula distancia Haversine entre dos coordenadas.
 */
const distanciaHaversine = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const R = 6371000;

  const latitud1 = Number(lat1);
  const longitud1 = Number(lon1);
  const latitud2 = Number(lat2);
  const longitud2 = Number(lon2);

  if (
    !Number.isFinite(latitud1) ||
    !Number.isFinite(longitud1) ||
    !Number.isFinite(latitud2) ||
    !Number.isFinite(longitud2)
  ) {
    return Infinity;
  }

  const toRad = (grados) =>
    (grados * Math.PI) / 180;

  const dLat = toRad(
    latitud2 - latitud1
  );

  const dLon = toRad(
    longitud2 - longitud1
  );

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitud1)) *
      Math.cos(toRad(latitud2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

/*
 * Busca el nodo del grafo más cercano
 * a una coordenada.
 *
 * El grafo actual entrega:
 *
 * {
 *   id,
 *   latitud,
 *   longitud,
 *   conexiones
 * }
 */
const obtenerNodoMasCercanoEnGrafo = (
  nodos,
  latitud,
  longitud
) => {
  if (!Array.isArray(nodos)) {
    throw new Error(
      "Los nodos del grafo deben ser un arreglo."
    );
  }

  if (nodos.length === 0) {
    throw new Error(
      "El grafo no contiene nodos."
    );
  }

  const lat = Number(latitud);
  const lon = Number(longitud);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    throw new Error(
      "Las coordenadas proporcionadas no son válidas."
    );
  }

  let nodoMasCercano = null;

  let distanciaMinima = Infinity;

  for (const nodo of nodos) {
    const nodoLatitud =
      Number(nodo.latitud);

    const nodoLongitud =
      Number(nodo.longitud);

    if (
      !Number.isFinite(nodoLatitud) ||
      !Number.isFinite(nodoLongitud)
    ) {
      continue;
    }

    const distancia =
      distanciaHaversine(
        lat,
        lon,
        nodoLatitud,
        nodoLongitud
      );

    if (
      distancia < distanciaMinima
    ) {
      distanciaMinima =
        distancia;

      nodoMasCercano =
        nodo;
    }
  }

  if (!nodoMasCercano) {
    throw new Error(
      "No se encontró un nodo cercano."
    );
  }

  return {
    nodo: nodoMasCercano,

    distancia_metros:
      Number(
        distanciaMinima.toFixed(2)
      ),
  };
};

/*
 * Cola de prioridad simple.
 *
 * Se utilizará para Dijkstra.
 */
class ColaPrioridad {
  constructor() {
    this.items = [];
  }

  insertar(
    item,
    prioridad
  ) {
    this.items.push({
      item,
      prioridad,
    });

    this.items.sort(
      (a, b) =>
        a.prioridad -
        b.prioridad
    );
  }

  extraerMinimo() {
    return this.items.shift();
  }

  get size() {
    return this.items.length;
  }
}

/*
 * Construye la lista de vecinos
 * de cada nodo.
 *
 * Las aristas son bidireccionales.
 */
const construirAdyacencia = (
  aristas
) => {
  const adyacencia =
    new Map();

  for (
    const arista of aristas
  ) {
    if (
      !adyacencia.has(
        arista.nodo_origen
      )
    ) {
      adyacencia.set(
        arista.nodo_origen,
        []
      );
    }

    if (
      !adyacencia.has(
        arista.nodo_destino
      )
    ) {
      adyacencia.set(
        arista.nodo_destino,
        []
      );
    }

    adyacencia
      .get(
        arista.nodo_origen
      )
      .push({
        nodo:
          arista.nodo_destino,
        arista,
      });

    adyacencia
      .get(
        arista.nodo_destino
      )
      .push({
        nodo:
          arista.nodo_origen,
        arista,
      });
  }

  return adyacencia;
};

/*
 * Dijkstra utilizando
 * costo_arista como peso.
 */
const dijkstra = ({
  nodos,
  aristas,
  nodoOrigen,
  nodoDestino,
}) => {
  const adyacencia =
    construirAdyacencia(
      aristas
    );

  const nodosMap =
    new Map(
      nodos.map(
        (nodo) => [
          nodo.id,
          nodo,
        ]
      )
    );

  const distancias =
    new Map();

  const anteriores =
    new Map();

  const aristasAnteriores =
    new Map();

  for (
    const idNodo of nodosMap.keys()
  ) {
    distancias.set(
      idNodo,
      Infinity
    );
  }

  distancias.set(
    nodoOrigen,
    0
  );

  const cola =
    new ColaPrioridad();

  cola.insertar(
    nodoOrigen,
    0
  );

  while (
    cola.size > 0
  ) {
    const actual =
      cola.extraerMinimo();

    const nodoActual =
      actual.item;

    const distanciaActual =
      actual.prioridad;

    if (
      distanciaActual >
      distancias.get(
        nodoActual
      )
    ) {
      continue;
    }

    /*
     * Llegamos al destino.
     */
    if (
      nodoActual ===
      nodoDestino
    ) {
      break;
    }

    const vecinos =
      adyacencia.get(
        nodoActual
      ) || [];

    for (
      const vecino of vecinos
    ) {
      const costo =
        Number(
          vecino.arista
            .costo_arista
        );

      if (
        !Number.isFinite(
          costo
        ) ||
        costo < 0
      ) {
        continue;
      }

      const nuevaDistancia =
        distanciaActual +
        costo;

      const distanciaAnterior =
        distancias.get(
          vecino.nodo
        );

      if (
        nuevaDistancia <
        distanciaAnterior
      ) {
        distancias.set(
          vecino.nodo,
          nuevaDistancia
        );

        anteriores.set(
          vecino.nodo,
          nodoActual
        );

        aristasAnteriores.set(
          vecino.nodo,
          vecino.arista
        );

        cola.insertar(
          vecino.nodo,
          nuevaDistancia
        );
      }
    }
  }

  const distanciaDestino =
    distancias.get(
      nodoDestino
    );

  if (
    !Number.isFinite(
      distanciaDestino
    )
  ) {
    return null;
  }

  /*
   * Reconstrucción de la ruta.
   */
  const nodosRuta = [];

  const aristasRuta = [];

  let actual =
    nodoDestino;

  while (
    actual !== nodoOrigen
  ) {
    nodosRuta.unshift(
      actual
    );

    const arista =
      aristasAnteriores.get(
        actual
      );

    if (!arista) {
      return null;
    }

    aristasRuta.unshift(
      arista
    );

    actual =
      anteriores.get(
        actual
      );

    if (!actual) {
      return null;
    }
  }

  nodosRuta.unshift(
    nodoOrigen
  );

  return {
    nodosRuta,
    aristasRuta,
    costoTotal:
      distanciaDestino,
  };
};

/*
 * Construye el resumen final
 * de la ruta.
 */
const calcularResumenRuta = ({
  nodos,
  aristasRuta,
  costoTotal,
}) => {
  let distanciaTotal = 0;

  let riesgoPonderado = 0;

  const zonas =
    new Set();

  for (
    const arista of aristasRuta
  ) {
    const distancia =
      Number(
        arista.distancia_metros
      ) || 0;

    const riesgo =
      Number(
        arista.puntaje_riesgo
      ) || 0;

    distanciaTotal +=
      distancia;

    riesgoPonderado +=
      riesgo * distancia;

    if (
      Array.isArray(
        arista.zonas_intersectadas
      )
    ) {
      for (
        const zona of
          arista.zonas_intersectadas
      ) {
        if (
          zona?.id_zona
        ) {
          zonas.add(
            zona.id_zona
          );
        }
      }
    }
  }

  const puntajeRiesgo =
    distanciaTotal > 0
      ? riesgoPonderado /
        distanciaTotal
      : 0;

  let nivelRiesgo =
    "Bajo";

  if (
    puntajeRiesgo > 66
  ) {
    nivelRiesgo =
      "Alto";
  } else if (
    puntajeRiesgo > 33
  ) {
    nivelRiesgo =
      "Medio";
  }

  /*
   * Geometría de la ruta.
   */
  const geometria =
    [];

  for (
    const nodoId of
      nodos
  ) {
    /*
     * Se reconstruye desde
     * el mapa más adelante.
     */
  }

  return {
    distancia_metros:
      Number(
        distanciaTotal.toFixed(2)
      ),

    costo_navegacion:
      Number(
        costoTotal.toFixed(4)
      ),

    puntaje_riesgo:
      Number(
        puntajeRiesgo.toFixed(2)
      ),

    nivel_riesgo:
      nivelRiesgo,

    cantidad_segmentos:
      aristasRuta.length,

    zonas_riesgo_afectadas:
      Array.from(zonas),

    geometria,
  };
};

/*
 * Construye las coordenadas
 * de la ruta a partir de los nodos.
 */
const construirGeometriaRuta = (
  nodosMap,
  nodosRuta
) => {
  return nodosRuta
    .map(
      (idNodo) =>
        nodosMap.get(idNodo)
    )
    .filter(Boolean)
    .map(
      (nodo) => [
        Number(
          nodo.latitud
        ),
        Number(
          nodo.longitud
        ),
      ]
    );
};

/*
 * Calcula una ruta segura
 * mediante Dijkstra.
 */
const calcularRutaSegura = async ({
  comuna,
  origen,
  destino,
  rangoHorario,
  bbox,
}) => {
  if (!comuna) {
    throw new Error(
      "La comuna es obligatoria."
    );
  }

  if (
    !origen ||
    !Number.isFinite(
      Number(
        origen.latitud
      )
    ) ||
    !Number.isFinite(
      Number(
        origen.longitud
      )
    )
  ) {
    throw new Error(
      "El origen debe contener latitud y longitud válidas."
    );
  }

  if (
    !destino ||
    !Number.isFinite(
      Number(
        destino.latitud
      )
    ) ||
    !Number.isFinite(
      Number(
        destino.longitud
      )
    )
  ) {
    throw new Error(
      "El destino debe contener latitud y longitud válidas."
    );
  }

  const latOrigen =
    Number(
      origen.latitud
    );

  const lonOrigen =
    Number(
      origen.longitud
    );

  const latDestino =
    Number(
      destino.latitud
    );

  const lonDestino =
    Number(
      destino.longitud
    );

  console.log(
    `RUTA - Calculando ${comuna}`
  );

  console.log(
    `RUTA - Origen: ${latOrigen}, ${lonOrigen}`
  );

  console.log(
    `RUTA - Destino: ${latDestino}, ${lonDestino}`
  );

  /*
   * Construimos el grafo ponderado.
   */
  const grafo =
    await obtenerGrafoPeatonal({
      comuna,
      rangoHorario,
      bbox,
    });

  if (
    !grafo?.nodos ||
    !grafo?.aristas
  ) {
    throw new Error(
      "El grafo peatonal no contiene nodos o aristas."
    );
  }

  if (
    grafo.nodos.length === 0 ||
    grafo.aristas.length === 0
  ) {
    throw new Error(
      "No existe una red peatonal disponible para la comuna."
    );
  }

  /*
   * Buscar nodos más cercanos.
   */
  const origenCercano =
    obtenerNodoMasCercanoEnGrafo(
      grafo.nodos,
      latOrigen,
      lonOrigen
    );

  const destinoCercano =
    obtenerNodoMasCercanoEnGrafo(
      grafo.nodos,
      latDestino,
      lonDestino
    );

  console.log(
    `RUTA - Nodo origen: ${origenCercano.nodo.id} (${origenCercano.distancia_metros} m)`
  );

  console.log(
    `RUTA - Nodo destino: ${destinoCercano.nodo.id} (${destinoCercano.distancia_metros} m)`
  );

  /*
   * Ejecutar Dijkstra.
   */
  const resultadoDijkstra =
    dijkstra({
      nodos:
        grafo.nodos,

      aristas:
        grafo.aristas,

      nodoOrigen:
        origenCercano.nodo.id,

      nodoDestino:
        destinoCercano.nodo.id,
    });

  /*
   * No existe conexión.
   */
  if (
    !resultadoDijkstra
  ) {
    return {
      encontrada:
        false,

      mensaje:
        "No fue posible encontrar una ruta peatonal entre los puntos seleccionados.",

      origen: {
        latitud:
          latOrigen,

        longitud:
          lonOrigen,
      },

      destino: {
        latitud:
          latDestino,

        longitud:
          lonDestino,
      },
    };
  }

  /*
   * Mapa de nodos para generar
   * la geometría final.
   */
  const nodosMap =
    new Map(
      grafo.nodos.map(
        (nodo) => [
          nodo.id,
          nodo,
        ]
      )
    );

  const resumen =
    calcularResumenRuta({
      nodos:
        grafo.nodos,

      aristasRuta:
        resultadoDijkstra.aristasRuta,

      costoTotal:
        resultadoDijkstra.costoTotal,
    });

  resumen.geometria =
    construirGeometriaRuta(
      nodosMap,
      resultadoDijkstra.nodosRuta
    );

  console.log(
    `RUTA - Encontrada: ${resultadoDijkstra.aristasRuta.length} segmentos`
  );

  console.log(
    `RUTA - Distancia: ${resumen.distancia_metros} m`
  );

  console.log(
    `RUTA - Costo: ${resumen.costo_navegacion}`
  );

  console.log(
    `RUTA - Riesgo: ${resumen.puntaje_riesgo} (${resumen.nivel_riesgo})`
  );

  return {
    encontrada:
      true,

    origen: {
      latitud:
        latOrigen,

      longitud:
        lonOrigen,

      nodo_mas_cercano:
        origenCercano.nodo.id,

      distancia_al_nodo_metros:
        origenCercano.distancia_metros,
    },

    destino: {
      latitud:
        latDestino,

      longitud:
        lonDestino,

      nodo_mas_cercano:
        destinoCercano.nodo.id,

      distancia_al_nodo_metros:
        destinoCercano.distancia_metros,
    },

    ...resumen,

    nodos_ruta:
      resultadoDijkstra.nodosRuta,

    segmentos:
      resultadoDijkstra.aristasRuta.map(
        (arista) => ({
          id_osm:
            arista.id_osm,

          nodo_origen:
            arista.nodo_origen,

          nodo_destino:
            arista.nodo_destino,

          distancia_metros:
            arista.distancia_metros,

          puntaje_riesgo:
            arista.puntaje_riesgo,

          nivel_riesgo:
            arista.nivel_riesgo,

          costo_riesgo:
            arista.costo_riesgo,

          costo_distancia:
            arista.costo_distancia,

          costo_arista:
            arista.costo_arista,

          zonas_intersectadas:
            arista.zonas_intersectadas,

          nombre:
            arista.nombre,

          tipo:
            arista.tipo,

          categoria_peatonal:
            arista.categoria_peatonal,
        })
      ),
  };
};

module.exports = {
  calcularRutaSegura,
};