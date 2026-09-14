const {
  obtenerRedPeatonalConRiesgo,
} = require("./riesgo-red.service");

/**
 * Normaliza la geometría de una vía a:
 *
 * [
 *   {
 *     nodo_id,
 *     latitud,
 *     longitud
 *   }
 * ]
 *
 * Soporta:
 *
 * 1. Formato interno:
 *    [
 *      { nodo_id, latitud, longitud },
 *      ...
 *    ]
 *
 * 2. Coordenadas:
 *    [
 *      [latitud, longitud],
 *      ...
 *    ]
 *
 * 3. GeoJSON LineString:
 *    {
 *      type: "LineString",
 *      coordinates: [
 *        [longitud, latitud],
 *        ...
 *      ]
 *    }
 *
 * 4. GeoJSON MultiLineString.
 */
const normalizarGeometria = (geometria, idVia) => {
  if (!geometria) {
    return [];
  }

  /*
   * Caso 1:
   * geometría ya viene como arreglo de objetos
   */
  if (
    Array.isArray(geometria) &&
    geometria.length > 0 &&
    typeof geometria[0] === "object" &&
    !Array.isArray(geometria[0])
  ) {
    return geometria
      .map((punto, indice) => {
        const latitud = Number(
          punto.latitud ??
            punto.lat ??
            punto.latitude
        );

        const longitud = Number(
          punto.longitud ??
            punto.lon ??
            punto.lng ??
            punto.longitude
        );

        if (
          !Number.isFinite(latitud) ||
          !Number.isFinite(longitud)
        ) {
          return null;
        }

        /*
         * Si ya existe nodo_id lo conservamos.
         *
         * Si no existe, generamos un identificador
         * determinístico usando la vía y coordenadas.
         */
        const nodoId =
          punto.nodo_id ??
          punto.id ??
          `coord:${latitud.toFixed(7)}:${longitud.toFixed(7)}`;

        return {
          nodo_id: String(nodoId),
          latitud,
          longitud,
        };
      })
      .filter(Boolean);
  }

  /*
   * Caso 2:
   * coordenadas simples:
   *
   * [
   *   [lat, lon],
   *   [lat, lon]
   * ]
   */
  if (
    Array.isArray(geometria) &&
    geometria.length > 0 &&
    Array.isArray(geometria[0])
  ) {
    return geometria
      .map((punto) => {
        if (punto.length < 2) {
          return null;
        }

        const latitud = Number(punto[0]);
        const longitud = Number(punto[1]);

        if (
          !Number.isFinite(latitud) ||
          !Number.isFinite(longitud)
        ) {
          return null;
        }

        return {
          nodo_id: `coord:${latitud.toFixed(7)}:${longitud.toFixed(7)}`,
          latitud,
          longitud,
        };
      })
      .filter(Boolean);
  }

  /*
   * Caso 3:
   * GeoJSON LineString
   */
  if (
    geometria.type === "LineString" &&
    Array.isArray(geometria.coordinates)
  ) {
    return geometria.coordinates
      .map((punto) => {
        if (!Array.isArray(punto) || punto.length < 2) {
          return null;
        }

        const longitud = Number(punto[0]);
        const latitud = Number(punto[1]);

        if (
          !Number.isFinite(latitud) ||
          !Number.isFinite(longitud)
        ) {
          return null;
        }

        return {
          nodo_id: `coord:${latitud.toFixed(7)}:${longitud.toFixed(7)}`,
          latitud,
          longitud,
        };
      })
      .filter(Boolean);
  }

  /*
   * Caso 4:
   * GeoJSON MultiLineString
   *
   * Se unen todas las líneas en una sola secuencia.
   */
  if (
    geometria.type === "MultiLineString" &&
    Array.isArray(geometria.coordinates)
  ) {
    const puntos = [];

    for (
      const linea of geometria.coordinates
    ) {
      if (!Array.isArray(linea)) {
        continue;
      }

      for (const punto of linea) {
        if (
          !Array.isArray(punto) ||
          punto.length < 2
        ) {
          continue;
        }

        const longitud = Number(punto[0]);
        const latitud = Number(punto[1]);

        if (
          !Number.isFinite(latitud) ||
          !Number.isFinite(longitud)
        ) {
          continue;
        }

        puntos.push({
          nodo_id: `coord:${latitud.toFixed(7)}:${longitud.toFixed(7)}`,
          latitud,
          longitud,
        });
      }
    }

    return puntos;
  }

  /*
   * Caso 5:
   * objeto que contiene coordinates.
   */
  if (Array.isArray(geometria.coordinates)) {
    return normalizarGeometria(
      {
        type: "LineString",
        coordinates: geometria.coordinates,
      },
      idVia
    );
  }

  return [];
};

const obtenerGrafoPeatonal = async ({
  comuna,
  highway,
  rangoHorario,
  bbox,
} = {}) => {
  const vias =
    await obtenerRedPeatonalConRiesgo({
      comuna,
      rangoHorario,
      bbox,
    });

  const nodosMap = new Map();
  const aristas = [];

  for (const via of vias) {
    const geometria =
      normalizarGeometria(
        via.geometria,
        via.id_osm
      );

    if (
      geometria.length < 2
    ) {
      continue;
    }

    /*
     * Riesgo normalizado entre 0 y 1.
     */
    const riesgoNormalizado =
      Math.min(
        Math.max(
          Number(
            via.puntaje_riesgo ?? 0
          ) / 100,
          0
        ),
        1
      );

    /*
     * Registrar nodos.
     */
    for (const nodo of geometria) {
      if (!nodo.nodo_id) {
        continue;
      }

      if (
        !nodosMap.has(
          nodo.nodo_id
        )
      ) {
        nodosMap.set(
          nodo.nodo_id,
          {
            id: nodo.nodo_id,

            latitud:
              nodo.latitud,

            longitud:
              nodo.longitud,

            conexiones:
              new Set(),
          }
        );
      }
    }

    /*
     * Cada tramo entre dos nodos
     * se convierte en una arista.
     */
    for (
      let i = 0;
      i < geometria.length - 1;
      i++
    ) {
      const nodoOrigen =
        geometria[i];

      const nodoDestino =
        geometria[i + 1];

      if (
        !nodoOrigen?.nodo_id ||
        !nodoDestino?.nodo_id
      ) {
        continue;
      }

      const distancia =
        distanciaEntreNodos(
          nodoOrigen,
          nodoDestino
        );

      if (
        !Number.isFinite(distancia) ||
        distancia <= 0
      ) {
        continue;
      }

      /*
       * MODELO PROVISIONAL DE NAVEGACIÓN
       *
       * 30% distancia
       * 70% riesgo
       *
       * factor = 0.3 + 0.7 * riesgo
       *
       * Riesgo 0:
       * factor = 0.3
       *
       * Riesgo 1:
       * factor = 1.0
       */
      const factorRiesgo =
        0.3 +
        0.7 *
          riesgoNormalizado;

      const costoArista =
        distancia *
        factorRiesgo;

      const arista = {
        id: `${via.id_osm}-${i}`,

        id_osm:
          via.id_osm,

        nodo_origen:
          nodoOrigen.nodo_id,

        nodo_destino:
          nodoDestino.nodo_id,

        distancia_metros:
          distancia,

        puntaje_riesgo:
          Number(
            via.puntaje_riesgo ?? 0
          ),

        nivel_riesgo:
          via.nivel_riesgo ??
          "Bajo",

        costo_riesgo:
          Number(
            (
              distancia *
              riesgoNormalizado
            ).toFixed(4)
          ),

        costo_distancia:
          Number(
            (
              distancia *
              0.3
            ).toFixed(4)
          ),

        costo_arista:
          Number(
            costoArista.toFixed(4)
          ),

        zonas_intersectadas:
          Array.isArray(
            via.zonas_intersectadas
          )
            ? via.zonas_intersectadas
            : [],

        nombre:
          via.nombre,

        comuna:
          via.comuna,

        tipo:
          via.tipo,

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

      /*
       * Conexión bidireccional.
       */
      const origen =
        nodosMap.get(
          nodoOrigen.nodo_id
        );

      const destino =
        nodosMap.get(
          nodoDestino.nodo_id
        );

      if (origen && destino) {
        origen.conexiones.add(
          nodoDestino.nodo_id
        );

        destino.conexiones.add(
          nodoOrigen.nodo_id
        );
      }
    }
  }

  /*
   * Convertimos Set -> Array.
   */
  const nodos = Array.from(
    nodosMap.values()
  ).map((nodo) => ({
    ...nodo,

    conexiones:
      Array.from(
        nodo.conexiones
      ),
  }));

  /*
   * Diagnóstico.
   */
  console.log(
    `GRAFO - Vías recibidas: ${vias.length}, nodos: ${nodos.length}, aristas: ${aristas.length}`
  );

  /*
   * Diagnóstico adicional.
   */
  if (
    vias.length > 0 &&
    nodos.length === 0
  ) {
    console.warn(
      "GRAFO - No se pudieron construir nodos. Revisar formato de geometria."
    );

    console.warn(
      "GRAFO - Ejemplo de geometria recibida:",
      JSON.stringify(
        vias[0]?.geometria
      ).slice(0, 1000)
    );
  }

  const conectividad =
    analizarConectividad(
      nodos
    );

  return {
    nodos,
    aristas,

    conectividad,

    resumen: {
      cantidad_nodos:
        nodos.length,

      cantidad_aristas:
        aristas.length,

      cantidad_vias:
        vias.length,

      componentes_conectados:
        conectividad.cantidad_componentes,

      nodo_mas_conectado:
        conectividad.nodo_mas_conectado,
    },
  };
};

/*
 * Busca el nodo más cercano.
 */
const obtenerNodoMasCercano = (
  nodos,
  latitud,
  longitud
) => {
  if (
    !Array.isArray(nodos) ||
    nodos.length === 0
  ) {
    return null;
  }

  let nodoMasCercano = null;

  let distanciaMinima =
    Infinity;

  const punto = {
    latitud:
      Number(latitud),

    longitud:
      Number(longitud),
  };

  for (
    const nodo of nodos
  ) {
    const distancia =
      distanciaEntreNodos(
        punto,
        nodo
      );

    if (
      distancia <
      distanciaMinima
    ) {
      distanciaMinima =
        distancia;

      nodoMasCercano =
        nodo;
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
 * Analiza componentes conectados.
 */
const analizarConectividad = (
  nodos
) => {
  const nodosMap =
    new Map(
      nodos.map(
        (nodo) => [
          nodo.id,
          nodo,
        ]
      )
    );

  const visitados =
    new Set();

  const componentes = [];

  for (
    const nodo of nodos
  ) {
    if (
      visitados.has(
        nodo.id
      )
    ) {
      continue;
    }

    const componente = [];

    const cola = [
      nodo.id,
    ];

    visitados.add(
      nodo.id
    );

    while (
      cola.length > 0
    ) {
      const actualId =
        cola.shift();

      componente.push(
        actualId
      );

      const actual =
        nodosMap.get(
          actualId
        );

      if (!actual) {
        continue;
      }

      for (
        const conexion of
          actual.conexiones
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

  let nodoMasConectado =
    null;

  let cantidadConexionesMaxima =
    -1;

  for (
    const nodo of nodos
  ) {
    if (
      nodo.conexiones.length >
      cantidadConexionesMaxima
    ) {
      cantidadConexionesMaxima =
        nodo.conexiones.length;

      nodoMasConectado = {
        id: nodo.id,

        latitud:
          nodo.latitud,

        longitud:
          nodo.longitud,

        cantidad_conexiones:
          nodo.conexiones.length,
      };
    }
  }

  return {
    cantidad_componentes:
      componentes.length,

    componentes:
      componentes.map(
        (
          componente,
          indice
        ) => ({
          id:
            indice + 1,

          cantidad_nodos:
            componente.length,
        })
      ),

    nodo_mas_conectado:
      nodoMasConectado,
  };
};

/*
 * Distancia Haversine.
 */
const distanciaEntreNodos = (
  nodoA,
  nodoB
) => {
  const radioTierra =
    6371000;

  const latitudA =
    Number(
      nodoA.latitud
    );

  const latitudB =
    Number(
      nodoB.latitud
    );

  const longitudA =
    Number(
      nodoA.longitud
    );

  const longitudB =
    Number(
      nodoB.longitud
    );

  if (
    !Number.isFinite(latitudA) ||
    !Number.isFinite(latitudB) ||
    !Number.isFinite(longitudA) ||
    !Number.isFinite(longitudB)
  ) {
    return 0;
  }

  const lat1 =
    (latitudA *
      Math.PI) /
    180;

  const lat2 =
    (latitudB *
      Math.PI) /
    180;

  const diferenciaLatitud =
    ((latitudB -
      latitudA) *
      Math.PI) /
    180;

  const diferenciaLongitud =
    ((longitudB -
      longitudA) *
      Math.PI) /
    180;

  const a =
    Math.sin(
      diferenciaLatitud / 2
    ) **
      2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        diferenciaLongitud / 2
      ) **
        2;

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
  normalizarGeometria,
};