const {
  obtenerRedPeatonal,
} = require("./red-peatonal.service");

const obtenerGrafoPeatonal = async ({
  comuna,
  highway,
} = {}) => {
  const vias = await obtenerRedPeatonal({
    comuna,
    highway,
  });

  const nodosMap = new Map();
  const aristas = [];

  for (const via of vias) {
    const geometria = via.geometria;

    for (const nodo of geometria) {
      if (!nodo.nodo_id) {
        continue;
      }

      if (!nodosMap.has(nodo.nodo_id)) {
        nodosMap.set(nodo.nodo_id, {
          id: nodo.nodo_id,
          latitud: nodo.latitud,
          longitud: nodo.longitud,
          conexiones: new Set(),
        });
      }
    }

    for (let i = 0; i < geometria.length - 1; i++) {
      const nodoOrigen = geometria[i];
      const nodoDestino = geometria[i + 1];

      if (
        !nodoOrigen.nodo_id ||
        !nodoDestino.nodo_id
      ) {
        continue;
      }

      const distancia = distanciaEntreNodos(
        nodoOrigen,
        nodoDestino
      );

      const arista = {
        id: `${via.id_osm}-${i}`,
        id_osm: via.id_osm,

        nodo_origen: nodoOrigen.nodo_id,
        nodo_destino: nodoDestino.nodo_id,

        distancia_metros: distancia,

        nombre: via.nombre,
        comuna: via.comuna,

        tipo: via.tipo,
        categoria_peatonal:
          via.categoria_peatonal,

        superficie:
          via.superficie,

        acceso_peatonal:
          via.acceso_peatonal,

        sidewalk:
          via.sidewalk,

        footway:
          via.footway,

        crossing:
          via.crossing,

        smoothness:
          via.smoothness,

        incline:
          via.incline,

        wheelchair:
          via.wheelchair,

        width:
          via.width,

        step_count:
          via.step_count,
      };

      aristas.push(arista);

      nodosMap
        .get(nodoOrigen.nodo_id)
        .conexiones
        .add(nodoDestino.nodo_id);

      nodosMap
        .get(nodoDestino.nodo_id)
        .conexiones
        .add(nodoOrigen.nodo_id);
    }
  }

  const nodos = Array.from(
    nodosMap.values()
  ).map((nodo) => ({
    ...nodo,
    conexiones: Array.from(
      nodo.conexiones
    ),
  }));

  const conectividad =
    analizarConectividad(nodos);

  return {
    nodos,
    aristas,

    conectividad,

    resumen: {
      cantidad_nodos: nodos.length,
      cantidad_aristas: aristas.length,
      cantidad_vias: vias.length,

      componentes_conectados:
        conectividad.cantidad_componentes,

      nodo_mas_conectado:
        conectividad.nodo_mas_conectado,
    },
  };
};

/*
 * Busca el nodo más cercano a una coordenada.
 */
const obtenerNodoMasCercano = (
  nodos,
  latitud,
  longitud
) => {
  if (!Array.isArray(nodos) || nodos.length === 0) {
    return null;
  }

  let nodoMasCercano = null;
  let distanciaMinima = Infinity;

  const punto = {
    latitud: Number(latitud),
    longitud: Number(longitud),
  };

  for (const nodo of nodos) {
    const distancia = distanciaEntreNodos(
      punto,
      nodo
    );

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      nodoMasCercano = nodo;
    }
  }

  if (!nodoMasCercano) {
    return null;
  }

  return {
    ...nodoMasCercano,
    distancia_metros:
      distanciaMinima,
  };
};

/*
 * Analiza los componentes conectados del grafo.
 */
const analizarConectividad = (
  nodos
) => {
  const nodosMap = new Map(
    nodos.map((nodo) => [
      nodo.id,
      nodo,
    ])
  );

  const visitados = new Set();
  const componentes = [];

  for (const nodo of nodos) {
    if (visitados.has(nodo.id)) {
      continue;
    }

    const componente = [];

    const cola = [nodo.id];

    visitados.add(nodo.id);

    while (cola.length > 0) {
      const actualId =
        cola.shift();

      componente.push(
        actualId
      );

      const actual =
        nodosMap.get(actualId);

      if (!actual) {
        continue;
      }

      for (
        const conexion
        of actual.conexiones
      ) {
        if (
          !visitados.has(
            conexion
          )
        ) {
          visitados.add(
            conexion
          );

          cola.push(
            conexion
          );
        }
      }
    }

    componentes.push(
      componente
    );
  }

  let nodoMasConectado = null;
  let cantidadConexionesMaxima = -1;

  for (const nodo of nodos) {
    if (
      nodo.conexiones.length >
      cantidadConexionesMaxima
    ) {
      cantidadConexionesMaxima =
        nodo.conexiones.length;

      nodoMasConectado = {
        id: nodo.id,
        latitud: nodo.latitud,
        longitud: nodo.longitud,
        cantidad_conexiones:
          nodo.conexiones.length,
      };
    }
  }

  return {
    cantidad_componentes:
      componentes.length,

    componentes: componentes.map(
      (componente, indice) => ({
        id: indice + 1,
        cantidad_nodos:
          componente.length,
      })
    ),

    nodo_mas_conectado:
      nodoMasConectado,
  };
};

const distanciaEntreNodos = (
  nodoA,
  nodoB
) => {
  const radioTierra = 6371000;

  const lat1 =
    (Number(nodoA.latitud) *
      Math.PI) /
    180;

  const lat2 =
    (Number(nodoB.latitud) *
      Math.PI) /
    180;

  const diferenciaLatitud =
    ((Number(nodoB.latitud) -
      Number(nodoA.latitud)) *
      Math.PI) /
    180;

  const diferenciaLongitud =
    ((Number(nodoB.longitud) -
      Number(nodoA.longitud)) *
      Math.PI) /
    180;

  const a =
    Math.sin(
      diferenciaLatitud / 2
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        diferenciaLongitud / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return Number(
    (
      radioTierra * c
    ).toFixed(2)
  );
};

module.exports = {
  obtenerGrafoPeatonal,
  obtenerNodoMasCercano,
};