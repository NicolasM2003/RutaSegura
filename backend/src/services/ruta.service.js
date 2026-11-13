const {
  obtenerGrafoPeatonal,
} = require("./grafo-peatonal.service");

const {
  PERFILES_RUTA,
} = require("../config/perfiles-ruta.config");
const {
  calcularCostoOperativoArista,
  PESO_DISTANCIA,
  PESO_RIESGO,
} = require("./costo-ruta.service");

const {
  proyectarPuntoSobreSegmento,
  obtenerAristaMasCercanaEnGrafo,
  integrarProyeccionesEnGrafo,
  crearSegmentoConexion,
} = require("../utils/proyeccion-punto-segmento");

const METROS_POR_GRADO_LATITUD = 111_320;
const IDS_SEGMENTOS_RUTA = Symbol("idsSegmentosRuta");
const METADATOS_SEGMENTOS_RUTA = Symbol("metadatosSegmentosRuta");
const IDS_LEGACY_ARISTAS = new WeakMap();
let siguienteIdLegacy = 0;
const obtenerIdSegmento = (arista) => {
  if (arista.id != null) return arista.id;
  if (!IDS_LEGACY_ARISTAS.has(arista)) {
    IDS_LEGACY_ARISTAS.set(arista, `legacy-arista-${++siguienteIdLegacy}`);
  }
  return IDS_LEGACY_ARISTAS.get(arista);
};

// Velocidad peatonal inicial para estimar el tiempo de recorrido.
// Valor provisional: 1,2 metros por segundo.
const VELOCIDAD_PEATONAL_METROS_SEGUNDO = 1.2;

const MARGEN_BBOX_RUTA_METROS = (() => {
  const configurado = Number(process.env.RUTA_BBOX_MARGEN_METROS);

  return Number.isFinite(configurado) && configurado > 0
    ? configurado
    : 1_000;
})();

const limitar = (valor, minimo, maximo) =>
  Math.min(maximo, Math.max(minimo, valor));

const construirBboxRuta = (origen, destino) => {
  const latitudes = [
    Number(origen.latitud),
    Number(destino.latitud),
  ];

  const longitudes = [
    Number(origen.longitud),
    Number(destino.longitud),
  ];

  const margenLatitud =
    MARGEN_BBOX_RUTA_METROS /
    METROS_POR_GRADO_LATITUD;

  const latitudMayorEnValorAbsoluto =
    Math.max(...latitudes.map(Math.abs));

  const cosenoLatitud = Math.max(
    Math.cos(
      (latitudMayorEnValorAbsoluto * Math.PI) / 180
    ),
    0.01,
  );

  const margenLongitud =
    margenLatitud / cosenoLatitud;

  return {
    minLat: limitar(
      Math.min(...latitudes) - margenLatitud,
      -90,
      90
    ),

    minLon: limitar(
      Math.min(...longitudes) - margenLongitud,
      -180,
      180
    ),

    maxLat: limitar(
      Math.max(...latitudes) + margenLatitud,
      -90,
      90
    ),

    maxLon: limitar(
      Math.max(...longitudes) + margenLongitud,
      -180,
      180
    ),
  };
};

/*
 * Valida y normaliza las coordenadas de origen y destino.
 */
const normalizarCoordenadasRuta = ({
  origen,
  destino,
}) => {
  if (
    !origen ||
    !Number.isFinite(Number(origen.latitud)) ||
    !Number.isFinite(Number(origen.longitud))
  ) {
    throw new Error(
      "El origen debe contener latitud y longitud válidas."
    );
  }

  if (
    !destino ||
    !Number.isFinite(Number(destino.latitud)) ||
    !Number.isFinite(Number(destino.longitud))
  ) {
    throw new Error(
      "El destino debe contener latitud y longitud válidas."
    );
  }

  return {
    latOrigen: Number(origen.latitud),
    lonOrigen: Number(origen.longitud),
    latDestino: Number(destino.latitud),
    lonDestino: Number(destino.longitud),
  };
};

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
    const nodoLatitud = Number(nodo.latitud);
    const nodoLongitud = Number(nodo.longitud);

    if (
      !Number.isFinite(nodoLatitud) ||
      !Number.isFinite(nodoLongitud)
    ) {
      continue;
    }

    const distancia = distanciaHaversine(
      lat,
      lon,
      nodoLatitud,
      nodoLongitud
    );

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      nodoMasCercano = nodo;
    }
  }

  if (!nodoMasCercano) {
    throw new Error(
      "No se encontró un nodo cercano."
    );
  }

  return {
    nodo: nodoMasCercano,
    distancia_metros: Number(
      distanciaMinima.toFixed(2)
    ),
  };
};

const prepararGrafoConProyeccionesRuta = (
  grafo,
  latOrigen,
  lonOrigen,
  latDestino,
  lonDestino
) => {
  const origenProyectado = obtenerAristaMasCercanaEnGrafo(
    grafo.nodos,
    grafo.aristas,
    latOrigen,
    lonOrigen
  );

  const destinoProyectado = obtenerAristaMasCercanaEnGrafo(
    grafo.nodos,
    grafo.aristas,
    latDestino,
    lonDestino
  );

  // Validamos ambas proyecciones antes de acceder a sus propiedades.
  // Así evitamos un TypeError y entregamos un error controlado si no hay
  // una arista peatonal disponible cerca de alguno de los puntos.
  if (!origenProyectado || !destinoProyectado) {
    throw new Error(
      "No fue posible conectar el origen o destino con una arista peatonal."
    );
  }

  const nodoDestinoMasCercano = obtenerNodoMasCercanoEnGrafo(
    grafo.nodos,
    latDestino,
    lonDestino
  );

  console.log("RUTA - Diagnóstico de proyección destino:", {
    coordenadaSeleccionada: {
      latitud: latDestino,
      longitud: lonDestino,
    },
    aristaSeleccionada: {
      id: destinoProyectado.arista.id,
      id_osm: destinoProyectado.arista.id_osm,
      nodo_origen: destinoProyectado.arista.nodo_origen,
      nodo_destino: destinoProyectado.arista.nodo_destino,
    },
    coordenadasArista: {
      origen: destinoProyectado.nodo_origen,
      destino: destinoProyectado.nodo_destino,
    },
    fraccion: destinoProyectado.fraccion,
    puntoProyectado: destinoProyectado.punto,
    distanciaProyeccion:
      destinoProyectado.distancia_proyeccion_metros,
    nodoMasCercano: {
      id: nodoDestinoMasCercano.nodo.id,
      latitud: nodoDestinoMasCercano.nodo.latitud,
      longitud: nodoDestinoMasCercano.nodo.longitud,
      distancia: nodoDestinoMasCercano.distancia_metros,
    },
  });

  const grafoIntegrado = integrarProyeccionesEnGrafo(
    grafo.nodos,
    grafo.aristas,
    [
      {
        id: "origen",
        arista: origenProyectado.arista,
        fraccion: origenProyectado.fraccion,
        punto: origenProyectado.punto,
      },
      {
        id: "destino",
        arista: destinoProyectado.arista,
        fraccion: destinoProyectado.fraccion,
        punto: destinoProyectado.punto,
      },
    ]
  );

  if (!grafoIntegrado) {
    throw new Error(
      "No fue posible integrar las proyecciones al grafo peatonal."
    );
  }

  const nodosMap = new Map(
    grafoIntegrado.nodos.map((nodo) => [nodo.id, nodo])
  );

  const obtenerConexion = (id, proyeccion) => {
    const idNodo = grafoIntegrado.nodos_por_proyeccion[id];
    const nodo = nodosMap.get(idNodo);

    if (!nodo) {
      throw new Error(
        `No se encontró el nodo virtual correspondiente a ${id}.`
      );
    }

    return {
      nodo,
      arista: proyeccion.arista,
      distancia_metros: proyeccion.distancia_proyeccion_metros,
      punto_proyectado: proyeccion.punto,
    };
  };

  return {
    grafo: {
      ...grafo,
      ...grafoIntegrado,
      resumen: grafo.resumen
        ? {
            ...grafo.resumen,
            cantidad_nodos: grafoIntegrado.nodos.length,
            cantidad_aristas: grafoIntegrado.aristas.length,
          }
        : grafo.resumen,
    },

    origen: obtenerConexion("origen", origenProyectado),
    destino: obtenerConexion("destino", destinoProyectado),
  };
};

/*
 * Valida el grafo peatonal obtenido.
 */
const validarGrafoPeatonal = (grafo) => {
  if (!grafo?.nodos || !grafo?.aristas) {
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

  return grafo;
};

/*
 * Obtiene el grafo para un trayecto.
 *
 * Esta función se ejecuta una sola vez en
 * calcularRutasAlternativas().
 */
const obtenerGrafoRuta = async ({
  comuna,
  origen,
  destino,
  rangoHorario,
}) => {
  const bboxRuta = construirBboxRuta(
    origen,
    destino
  );

  const grafo = await obtenerGrafoPeatonal({
    comuna,
    rangoHorario,
    bbox: bboxRuta,
    soloSupabase: true,
  });

  return validarGrafoPeatonal(grafo);
};

/*
 * Cola de prioridad simple para Dijkstra.
 */
class ColaPrioridad {
  constructor() {
    this.items = [];
  }

  insertar(item, prioridad) {
    this.items.push({
      item,
      prioridad,
    });

    this.items.sort(
      (a, b) => a.prioridad - b.prioridad
    );
  }

  extraerMinimo() {
    return this.items.shift();
  }

  get size() {
    return this.items.length;
  }
};

/*
 * Construye la lista de vecinos de cada nodo.
 * Las aristas son bidireccionales.
 */
const construirAdyacencia = (aristas) => {
  const adyacencia = new Map();

  for (const arista of aristas) {
    if (!adyacencia.has(arista.nodo_origen)) {
      adyacencia.set(arista.nodo_origen, []);
    }

    if (!adyacencia.has(arista.nodo_destino)) {
      adyacencia.set(arista.nodo_destino, []);
    }

    adyacencia.get(arista.nodo_origen).push({
      nodo: arista.nodo_destino,
      arista,
    });

    adyacencia.get(arista.nodo_destino).push({
      nodo: arista.nodo_origen,
      arista,
    });
  }

  return adyacencia;
};

/*
 * Calcula el costo de una arista según el perfil.
 *
 * Sin perfil, conserva la ponderación base 30/70 del grafo.
 */
const calcularCostoArista = (
  arista,
  perfil = null,
  { factorPenalizacion = 0, usosSegmento = 0 } = {}
) => {
  const distancia = Number(
    arista.distancia_metros
  );

  const puntajeRiesgo = Number(
    arista.puntaje_riesgo
  );

  const riesgoNormalizado = puntajeRiesgo / 100;

  const costoOriginal = calcularCostoOperativoArista(
    distancia,
    riesgoNormalizado,
    perfil?.peso_distancia ?? PESO_DISTANCIA,
    perfil?.peso_riesgo ?? PESO_RIESGO
  );
  return costoOriginal * (1 + factorPenalizacion * usosSegmento);
};

/*
 * Algoritmo Dijkstra.
 *
 * Utiliza costo_arista si no hay perfil.
 * Si existe perfil, calcula el costo de cada arista
 * usando las ponderaciones de riesgo y distancia.
 */
const dijkstra = ({
  nodos,
  aristas,
  nodoOrigen,
  nodoDestino,
  perfil = null,
  factorPenalizacion = 0,
  usosSegmento = new Map(),
}) => {
  const adyacencia = construirAdyacencia(aristas);

  const nodosMap = new Map(
    nodos.map((nodo) => [nodo.id, nodo])
  );

  const distancias = new Map();
  const anteriores = new Map();
  const aristasAnteriores = new Map();

  for (const idNodo of nodosMap.keys()) {
    distancias.set(idNodo, Infinity);
  }

  distancias.set(nodoOrigen, 0);

  const cola = new ColaPrioridad();
  cola.insertar(nodoOrigen, 0);

  while (cola.size > 0) {
    const actual = cola.extraerMinimo();
    const nodoActual = actual.item;
    const distanciaActual = actual.prioridad;

    if (
      distanciaActual >
      distancias.get(nodoActual)
    ) {
      continue;
    }

    if (nodoActual === nodoDestino) {
      break;
    }

    const vecinos =
      adyacencia.get(nodoActual) || [];

    for (const vecino of vecinos) {
      let costo;
      try {
        const usos = usosSegmento.get(obtenerIdSegmento(vecino.arista)) || 0;
        costo = calcularCostoArista(vecino.arista, perfil, {
          factorPenalizacion,
          usosSegmento: usos,
        });
      } catch {
        continue;
      }

      if (
        !Number.isFinite(costo) ||
        costo < 0
      ) {
        continue;
      }

      const nuevaDistancia =
        distanciaActual + costo;

      const distanciaAnterior =
        distancias.get(vecino.nodo);

      if (nuevaDistancia < distanciaAnterior) {
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
    distancias.get(nodoDestino);

  if (!Number.isFinite(distanciaDestino)) {
    return null;
  }

  const nodosRuta = [];
  const aristasRuta = [];

  let actual = nodoDestino;

  while (actual !== nodoOrigen) {
    nodosRuta.unshift(actual);

    const arista =
      aristasAnteriores.get(actual);

    if (!arista) {
      return null;
    }

    aristasRuta.unshift(arista);

    actual = anteriores.get(actual);

    if (!actual) {
      return null;
    }
  }

  nodosRuta.unshift(nodoOrigen);

  return {
    nodosRuta,
    aristasRuta,
    costoTotal: distanciaDestino,
  };
};

/*
 * Construye el resumen de la ruta encontrada.
 */
const calcularResumenRuta = ({
  aristasRuta,
  costoTotal,
}) => {
  let distanciaTotal = 0;
  let riesgoPonderado = 0;

  const zonas = new Set();

  for (const arista of aristasRuta) {
    const distancia =
      Number(arista.distancia_metros) || 0;

    const riesgo =
      Number(arista.puntaje_riesgo) || 0;

    distanciaTotal += distancia;
    riesgoPonderado += riesgo * distancia;

    if (Array.isArray(arista.zonas_intersectadas)) {
      for (const zona of arista.zonas_intersectadas) {
        if (zona?.id_zona) {
          zonas.add(zona.id_zona);
        }
      }
    }
  }

  const puntajeRiesgo =
    distanciaTotal > 0
      ? riesgoPonderado / distanciaTotal
      : 0;

  const tiempoEstimadoSegundos =
  distanciaTotal /
  VELOCIDAD_PEATONAL_METROS_SEGUNDO;

  const tiempoEstimadoMinutos =
    Number((tiempoEstimadoSegundos / 60).toFixed(1));

  let nivelRiesgo = "Bajo";

  if (puntajeRiesgo > 66) {
    nivelRiesgo = "Alto";
  } else if (puntajeRiesgo > 33) {
    nivelRiesgo = "Medio";
  }

  return {
    distancia_metros: Number(
      distanciaTotal.toFixed(2)
    ),

    tiempo_estimado_minutos:
      tiempoEstimadoMinutos,

    costo_navegacion: costoTotal,

    puntaje_riesgo: Number(
      puntajeRiesgo.toFixed(2)
    ),

    nivel_riesgo: nivelRiesgo,

    cantidad_segmentos: aristasRuta.length,

    zonas_riesgo_afectadas: Array.from(zonas),

    geometria: [],
  };
};

/*
 * Construye las coordenadas de la ruta.
 */
const construirGeometriaRuta = (
  nodosMap,
  nodosRuta
) => {
  return nodosRuta
    .map((idNodo) => nodosMap.get(idNodo))
    .filter(Boolean)
    .map((nodo) => [
      Number(nodo.latitud),
      Number(nodo.longitud),
    ]);
};

/*
 * Calcula una ruta para un perfil específico.
 *
 * grafoPrecalculado permite reutilizar un mismo
 * grafo cuando se generan varias alternativas.
 */
const calcularRutaSegura = async ({
  comuna,
  origen,
  destino,
  rangoHorario,
  perfilRuta = null,
  grafoPrecalculado = null,
  conexionesProyectadas = null,
  factorPenalizacion = 0,
  usosSegmento = new Map(),
}) => {
  const perfil = perfilRuta
    ? PERFILES_RUTA[perfilRuta]
    : null;

  if (perfilRuta && !perfil) {
    throw new Error(
      `Perfil de ruta no válido: ${perfilRuta}`
    );
  }

  const {
    latOrigen,
    lonOrigen,
    latDestino,
    lonDestino,
  } = normalizarCoordenadasRuta({
    origen,
    destino,
  });

  console.log(
    `RUTA - Calculando ${comuna || "área del mapa"}`
  );

  console.log(
    `RUTA - Origen: ${latOrigen}, ${lonOrigen}`
  );

  console.log(
    `RUTA - Destino: ${latDestino}, ${lonDestino}`
  );

  if (perfilRuta) {
    console.log(
      `RUTA - Perfil: ${perfil.nombre}`
    );
  }

  const grafo = validarGrafoPeatonal(
    grafoPrecalculado ||
      await obtenerGrafoRuta({
        comuna,

        origen: {
          latitud: latOrigen,
          longitud: lonOrigen,
        },

        destino: {
          latitud: latDestino,
          longitud: lonDestino,
        },

        rangoHorario,
      })
  );

  const obtenerNodoTerminal = (
    conexionProyectada,
    latitud,
    longitud
  ) => {
    if (!conexionProyectada?.nodo?.id) {
      return obtenerNodoMasCercanoEnGrafo(
        grafo.nodos,
        latitud,
        longitud
      );
    }

    const nodo = grafo.nodos.find(
      (elemento) => elemento.id === conexionProyectada.nodo.id
    );

    if (!nodo) {
      throw new Error(
        "El nodo proyectado no existe en el grafo."
      );
    }

    return {
      nodo,
      distancia_metros:
        Number(conexionProyectada.distancia_metros) || 0,
    };
  };

  const origenCercano = obtenerNodoTerminal(
    conexionesProyectadas?.origen,
    latOrigen,
    lonOrigen
  );

  const destinoCercano = obtenerNodoTerminal(
    conexionesProyectadas?.destino,
    latDestino,
    lonDestino
  );

  console.log(
    `RUTA - Nodo origen: ${origenCercano.nodo.id} (${origenCercano.distancia_metros} m)`
  );

  console.log(
    `RUTA - Nodo destino: ${destinoCercano.nodo.id} (${destinoCercano.distancia_metros} m)`
  );

  const resultadoDijkstra = dijkstra({
    nodos: grafo.nodos,
    aristas: grafo.aristas,

    nodoOrigen: origenCercano.nodo.id,
    nodoDestino: destinoCercano.nodo.id,

    perfil,
    factorPenalizacion,
    usosSegmento,
  });

  if (!resultadoDijkstra) {
    return {
      encontrada: false,

      mensaje:
        "No fue posible encontrar una ruta peatonal entre los puntos seleccionados.",

      origen: {
        latitud: latOrigen,
        longitud: lonOrigen,
      },

      destino: {
        latitud: latDestino,
        longitud: lonDestino,
      },
    };
  }

  const construirConectorRuta = (
    id,
    conexion,
    coordenadaSeleccionada,
    invertirSentido = false
  ) => {
    if (!conexion) return null;

    const distancia = Number(conexion.distancia_metros) || 0;

    if (distancia <= 0) return null;

    const conector = crearSegmentoConexion({
      id,
      coordenadaSeleccionada,
      puntoProyectado: conexion.punto_proyectado,
      distanciaMetros: distancia,
      aristaReferencia: conexion.arista,
    });

    if (!conector) {
      throw new Error(
        `No fue posible construir el conector de ${id}.`
      );
    }

    if (invertirSentido) {
      return {
        ...conector,
        inicio: conector.fin,
        fin: conector.inicio,
      };
    }

    return conector;
  };

  const conectorOrigen = construirConectorRuta(
    "origen",
    conexionesProyectadas?.origen,
    {
      latitud: latOrigen,
      longitud: lonOrigen,
    }
  );

  const conectorDestino = construirConectorRuta(
    "destino",
    conexionesProyectadas?.destino,
    {
      latitud: latDestino,
      longitud: lonDestino,
    },
    true
  );

  const aristasParaResumen = [
    ...(conectorOrigen ? [conectorOrigen] : []),
    ...resultadoDijkstra.aristasRuta,
    ...(conectorDestino ? [conectorDestino] : []),
  ];

  const distanciaRed = resultadoDijkstra.aristasRuta.reduce(
    (total, arista) =>
      total + (Number(arista.distancia_metros) || 0),
    0
  );

  console.log("RUTA - Diagnóstico de distancia:", {
    conectorOrigen: conectorOrigen?.distancia_metros ?? 0,
    conectorDestino: conectorDestino?.distancia_metros ?? 0,
    distanciaRed: Number(distanciaRed.toFixed(2)),
    distanciaTotal: Number(
      aristasParaResumen.reduce(
        (total, arista) =>
          total + (Number(arista.distancia_metros) || 0),
        0
      ).toFixed(2)
    ),
  });

  const nodosMap = new Map(
    grafo.nodos.map((nodo) => [nodo.id, nodo])
  );

  const resumen = calcularResumenRuta({
    aristasRuta: aristasParaResumen,
    costoTotal: aristasParaResumen.reduce(
      (total, arista) =>
        total + calcularCostoArista(arista, perfil),
      0
    ),
  });

  const geometriaRed = construirGeometriaRuta(
    nodosMap,
    resultadoDijkstra.nodosRuta
  );

  const geometriaCompleta = [
    [latOrigen, lonOrigen],
    ...geometriaRed,
    [latDestino, lonDestino],
  ];

  resumen.geometria = geometriaCompleta.filter(
    (coordenada, indice, arreglo) => {
      if (indice === 0) return true;

      const anterior = arreglo[indice - 1];

      return distanciaHaversine(
        anterior[0],
        anterior[1],
        coordenada[0],
        coordenada[1]
      ) > 0.01;
    }
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
    encontrada: true,

    origen: {
      latitud: latOrigen,
      longitud: lonOrigen,

      nodo_mas_cercano: origenCercano.nodo.id,

      distancia_al_nodo_metros:
        origenCercano.distancia_metros,
    },

    destino: {
      latitud: latDestino,
      longitud: lonDestino,

      nodo_mas_cercano: destinoCercano.nodo.id,

      distancia_al_nodo_metros:
        destinoCercano.distancia_metros,
    },

    ...resumen,

    ...(perfilRuta
      ? {
          perfil_ruta: perfilRuta,
          nombre_perfil_ruta: perfil.nombre,
        }
      : {}),

    nodos_ruta: resultadoDijkstra.nodosRuta,
    [IDS_SEGMENTOS_RUTA]: resultadoDijkstra.aristasRuta.map(obtenerIdSegmento),
    // Metadatos internos para comparar corredores. Los Symbols no forman
    // parte del JSON público ni alteran el contrato HTTP.
    [METADATOS_SEGMENTOS_RUTA]: resultadoDijkstra.aristasRuta.map((arista) => {
      const nodoOrigen = nodosMap.get(arista.nodo_origen);
      const nodoDestino = nodosMap.get(arista.nodo_destino);
      return {
        id: obtenerIdSegmento(arista),
        id_osm: arista.id_osm,
        nodo_origen: arista.nodo_origen,
        nodo_destino: arista.nodo_destino,
        distancia_metros: Number(arista.distancia_metros),
        nombre: arista.nombre,
        tipo: arista.tipo,
        categoria_peatonal: arista.categoria_peatonal,
        superficie: arista.superficie,
        acceso_peatonal: arista.acceso_peatonal,
        sidewalk: arista.sidewalk,
        footway: arista.footway,
        crossing: arista.crossing,
        inicio: nodoOrigen && [Number(nodoOrigen.longitud), Number(nodoOrigen.latitud)],
        fin: nodoDestino && [Number(nodoDestino.longitud), Number(nodoDestino.latitud)],
      };
    }),

    segmentos: (() => {
      let costoAcumulado = 0;

      return aristasParaResumen.map(
        (arista) => {
          const costoSegmento = calcularCostoArista(arista, perfil);
          costoAcumulado += costoSegmento;

          return {
            id: obtenerIdSegmento(arista),

            es_conector: arista.es_conector === true,
            riesgo_estimado: arista.riesgo_estimado === true,
            arista_referencia_id: arista.arista_referencia_id ?? null,

            inicio: arista.inicio ?? (
              nodosMap.get(arista.nodo_origen)
                ? [
                    Number(nodosMap.get(arista.nodo_origen).latitud),
                    Number(nodosMap.get(arista.nodo_origen).longitud),
                  ]
                : null
            ),

            fin: arista.fin ?? (
              nodosMap.get(arista.nodo_destino)
                ? [
                    Number(nodosMap.get(arista.nodo_destino).latitud),
                    Number(nodosMap.get(arista.nodo_destino).longitud),
                  ]
                : null
            ),

            id_osm: arista.id_osm,

            nodo_origen: arista.nodo_origen,
            nodo_destino: arista.nodo_destino,

            distancia_metros: arista.distancia_metros,

            puntaje_riesgo: arista.puntaje_riesgo,
            nivel_riesgo: arista.nivel_riesgo,

            costo_riesgo: arista.costo_riesgo,
            costo_distancia: arista.costo_distancia,

            // Publicamos la misma precisión usada por Dijkstra. Redondear cada
            // segmento por separado haría que su suma difiriera del costo total.
            costo_arista: costoSegmento,
            costo_arista_operativo: costoSegmento,
            costo_acumulado_ruta: costoAcumulado,

            zonas_intersectadas:
              arista.zonas_intersectadas,

            nombre: arista.nombre,
            tipo: arista.tipo,

            categoria_peatonal:
              arista.categoria_peatonal,
          };
        }
      );
    })(),
  };
};

/*
 * Parámetros para detectar recorridos redundantes.
 *
 * Dos rutas con al menos un 90 % de distancia compartida
 * por las mismas calles se consideran similares.
 *
 * Si sus puntajes de riesgo difieren en 8 puntos o más,
 * se conservan ambas por posible relevancia de seguridad.
 */
const UMBRAL_SIMILITUD_CORREDOR = 0.90;
const DIFERENCIA_RIESGO_RELEVANTE = 8;

const FACTORES_PENALIZACION_RECUPERACION = [
  0.25,
  0.50,
  0.75,
];

// Límites geométricos provisionales de esta implementación; sujetos a la
// validación de frontend de SEG-175 y a la revisión de calibración.
const ANGULO_MAXIMO_CORREDOR_GRADOS = 25;
const SEPARACION_MAXIMA_COINCIDENCIA_FISICA_METROS = 3;
const SEPARACION_MAXIMA_VIA_CONTINUA_METROS = 8;
const SEPARACION_MAXIMA_ACERAS_OPUESTAS_METROS = 12;
const DISTANCIA_MAXIMA_EXTREMO_CRUCE_METROS = 5;

/*
 * Normaliza el nombre de una calle para comparar variantes como:
 *
 * "Avenida Libertad" -> "libertad"
 * "Av. Libertad"     -> "libertad"
 * "Libertad"         -> "libertad"
 *
 * Esto permite comparar aceras representadas mediante
 * distintos elementos de OpenStreetMap.
 */
const normalizarNombreVia = (nombre) => {
  if (typeof nombre !== "string" || !nombre.trim()) {
    return null;
  }

  const normalizado = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(?:avenida|avda|av|calle|pasaje|pje|camino|ruta|diagonal|paseo|caletera)\b/g,
      " "
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizado || null;
};

const proyectarPuntoLocal = (punto, referencia) => {
  const latitudMedia = ((punto[1] + referencia[1]) / 2) * Math.PI / 180;
  return [
    (punto[0] - referencia[0]) * METROS_POR_GRADO_LATITUD * Math.cos(latitudMedia),
    (punto[1] - referencia[1]) * METROS_POR_GRADO_LATITUD,
  ];
};

/* Longitud longitudinal común entre dos aristas rectas, con orientación reversible. */
const medirSolapamientoGeometrico = (a, b) => {
  if (!a.inicio || !a.fin || !b.inicio || !b.fin) return null;
  const origen = a.inicio;
  const p1 = [0, 0];
  const p2 = proyectarPuntoLocal(a.fin, origen);
  const q1 = proyectarPuntoLocal(b.inicio, origen);
  const q2 = proyectarPuntoLocal(b.fin, origen);
  const ax = p2[0] - p1[0]; const ay = p2[1] - p1[1];
  const bx = q2[0] - q1[0]; const by = q2[1] - q1[1];
  const longitudA = Math.hypot(ax, ay); const longitudB = Math.hypot(bx, by);
  if (longitudA < 0.5 || longitudB < 0.5) return null;
  const coseno = Math.abs((ax * bx + ay * by) / (longitudA * longitudB));
  const angulo = Math.acos(Math.min(1, coseno)) * 180 / Math.PI;
  if (angulo > ANGULO_MAXIMO_CORREDOR_GRADOS) return null;
  const ux = ax / longitudA; const uy = ay / longitudA;
  const proyecciones = [
    q1[0] * ux + q1[1] * uy,
    q2[0] * ux + q2[1] * uy,
  ];
  const inicio = Math.max(0, Math.min(...proyecciones));
  const fin = Math.min(longitudA, Math.max(...proyecciones));
  const solapamiento = Math.max(0, fin - inicio);
  if (solapamiento <= 0) return null;
  // Separación perpendicular (no punto a segmento acotado), para que una
  // subdivisión que sobrepasa longitudinalmente al otro tramo siga solapando.
  const separaciones = [q1, q2].map((q) => Math.abs(q[0] * uy - q[1] * ux));
  const separacion = (separaciones[0] + separaciones[1]) / 2;
  // El solapamiento relativo se evalúa al unir intervalos de la ruta completa,
  // no por arista: cortes OSM pequeños no deben romper una continuidad válida.
  const ubx = bx / longitudB; const uby = by / longitudB;
  const proyeccionesB = [p1, p2].map((p) => (p[0] - q1[0]) * ubx + (p[1] - q1[1]) * uby);
  const inicioB = Math.max(0, Math.min(...proyeccionesB));
  const finB = Math.min(longitudB, Math.max(...proyeccionesB));
  return {
    longitud: Math.min(solapamiento, longitudA, longitudB),
    separacion,
    inicio: inicio / longitudA,
    fin: fin / longitudA,
    inicioB: inicioB / longitudB,
    finB: finB / longitudB,
  };
};

const esCrucePeatonal = (segmento) =>
  segmento && (segmento.footway === "crossing" || segmento.crossing != null);

const distanciaPuntoAArista = (punto, arista) => {
  if (!punto || !arista?.inicio || !arista?.fin) return Infinity;
  const extremo = proyectarPuntoLocal(arista.fin, arista.inicio);
  const objetivo = proyectarPuntoLocal(punto, arista.inicio);
  const largo2 = extremo[0] ** 2 + extremo[1] ** 2;
  if (largo2 === 0) return Math.hypot(objetivo[0], objetivo[1]);
  const t = Math.max(0, Math.min(1, (objetivo[0] * extremo[0] + objetivo[1] * extremo[1]) / largo2));
  return Math.hypot(objetivo[0] - t * extremo[0], objetivo[1] - t * extremo[1]);
};

const cruceConectaAristas = (cruces, a, b) => (cruces || []).some((cruce) => {
  if (!cruce.inicio || !cruce.fin) return false;
  const extremos = [cruce.inicio, cruce.fin];
  const conectaEnSentidoDirecto =
    distanciaPuntoAArista(extremos[0], a) <= DISTANCIA_MAXIMA_EXTREMO_CRUCE_METROS &&
    distanciaPuntoAArista(extremos[1], b) <= DISTANCIA_MAXIMA_EXTREMO_CRUCE_METROS;
  const conectaEnSentidoInverso =
    distanciaPuntoAArista(extremos[1], a) <= DISTANCIA_MAXIMA_EXTREMO_CRUCE_METROS &&
    distanciaPuntoAArista(extremos[0], b) <= DISTANCIA_MAXIMA_EXTREMO_CRUCE_METROS;
  return conectaEnSentidoDirecto || conectaEnSentidoInverso;
});

const obtenerSegmentosComparables = (ruta) => {
  const segmentos = Array.isArray(
    ruta?.[METADATOS_SEGMENTOS_RUTA]
  )
    ? ruta[METADATOS_SEGMENTOS_RUTA]
    : (ruta?.segmentos || []).map((segmento) => ({
        ...segmento,
      }));

  // Los conectores no representan calles de OpenStreetMap.
  return segmentos.filter(
    (segmento) => segmento?.es_conector !== true
  );
};

const evaluarCoincidenciaCorredor = (a, b, crucesA = [], crucesB = []) => {
  const distanciaA = Number(a.distancia_metros);
  const distanciaB = Number(b.distancia_metros);
  if (!(distanciaA > 0) || !(distanciaB > 0) || esCrucePeatonal(a) || esCrucePeatonal(b)) return null;

  const nodosMismos = a.nodo_origen != null && a.nodo_destino != null &&
    ((String(a.nodo_origen) === String(b.nodo_origen) && String(a.nodo_destino) === String(b.nodo_destino)) ||
     (String(a.nodo_origen) === String(b.nodo_destino) && String(a.nodo_destino) === String(b.nodo_origen)));
  const osmMismo = a.id_osm != null && String(a.id_osm) === String(b.id_osm);
  if (osmMismo && nodosMismos) return {
    longitud: Math.min(distanciaA, distanciaB), exacta: true,
    inicio: 0, fin: 1, inicioB: 0, finB: 1,
  };

  const nombreA = normalizarNombreVia(a.nombre);
  const nombreB = normalizarNombreVia(b.nombre);
  const mismoNombre = Boolean(nombreA && nombreA === nombreB);
  const mismoNodoExtremo = [a.nodo_origen, a.nodo_destino].some((nodo) =>
    nodo != null && [b.nodo_origen, b.nodo_destino].some((otro) => String(nodo) === String(otro)));
  const acerasOpuestas = ["left", "right"].includes(a.sidewalk) &&
    ["left", "right"].includes(b.sidewalk) && a.sidewalk !== b.sidewalk;
  const cruceConectado = cruceConectaAristas([...crucesA, ...crucesB], a, b);
  const solapamiento = medirSolapamientoGeometrico(a, b);
  if (!solapamiento) return null;

  // Tolerancia amplia solo con evidencia semántica de aceras opuestas en la
  // misma calle. Proximidad/paralelismo por sí solos nunca crean equivalencia.
  if (mismoNombre && (acerasOpuestas || cruceConectado) && solapamiento.separacion <= SEPARACION_MAXIMA_ACERAS_OPUESTAS_METROS) {
    return { ...solapamiento, exacta: false, corredor: true };
  }
  // En rutas distintas, OSM puede modelar una misma calle/acera con nodos y
  // ways independientes. Nombre normalizado + orientación + solapamiento
  // longitudinal local permiten reconocer el corredor aun sin nodos comunes.
  // La suma posterior une intervalos y el filtro exige 90 % de la ruta mayor;
  // una calle paralela con otro nombre no se fusiona por distancia solamente.
  if (mismoNombre && solapamiento.separacion <= SEPARACION_MAXIMA_VIA_CONTINUA_METROS) {
    return { ...solapamiento, exacta: false, corredor: true };
  }
  // Para nombres diferentes o ausentes exigimos una superposición casi física
  // y continuidad topológica (un extremo común); evita unir calles cercanas.
  if (solapamiento.separacion <= SEPARACION_MAXIMA_COINCIDENCIA_FISICA_METROS && mismoNodoExtremo) {
    return { ...solapamiento, exacta: false, corredor: true };
  }
  // El mismo nombre puede respaldar una coincidencia casi física si también
  // hay solapamiento longitudinal y orientación compatible.
  if (mismoNombre && solapamiento.separacion <= SEPARACION_MAXIMA_COINCIDENCIA_FISICA_METROS) {
    return { ...solapamiento, exacta: false, corredor: true };
  }
  return null;
};

const esSegmentoFootway = (segmento) =>
  ["footway", "path"].includes(String(segmento.tipo || "").toLowerCase()) &&
  !esCrucePeatonal(segmento);

const esConectorTerminalCorto = (segmento) => {
  if (!segmento || esCrucePeatonal(segmento)) return false;

  const tipo = String(segmento.tipo || "").toLowerCase();
  const distancia = Number(segmento.distancia_metros);

  return (
    ["residential", "unclassified", "service", "living_street"].includes(tipo) &&
    Number.isFinite(distancia) &&
    distancia > 0 &&
    distancia <= 10
  );
};

const esSubrutaFootway = (segmentos) => {
  if (!Array.isArray(segmentos) || segmentos.length === 0) {
    return false;
  }

  const indicesNoFootway = segmentos
    .map((segmento, indice) => ({
      segmento,
      indice,
    }))
    .filter(({ segmento }) => !esSegmentoFootway(segmento));

  // Una secuencia compuesta exclusivamente por footways es válida.
  if (indicesNoFootway.length === 0) return true;

  // Solo permitimos un conector corto en uno de los extremos.
  if (indicesNoFootway.length !== 1) return false;

  const { segmento, indice } = indicesNoFootway[0];

  const esExtremo =
    indice === 0 || indice === segmentos.length - 1;

  return esExtremo && esConectorTerminalCorto(segmento);
};

const esSubrutaCalleNombrada = (segmentos) => {
  if (!segmentos.length || segmentos.some(esCrucePeatonal)) return false;
  if (segmentos.some(esSegmentoFootway)) return false;

  const nombres = new Set(
    segmentos
      .map((segmento) => normalizarNombreVia(segmento.nombre))
      .filter(Boolean)
  );

  return nombres.size === 1;
};

/*
 * Reconstruye el sentido de recorrido usando los nodos de cada arista.
 * Las coordenadas quedan ordenadas según el recorrido, aunque la arista
 * original de OSM esté almacenada en sentido contrario.
 */
const obtenerRecorridosOrientados = (segmentos) => {
  if (!Array.isArray(segmentos) || !segmentos.length) return [];

  const primero = segmentos[0];
  const posiblesInicios = [
    primero.nodo_origen,
    primero.nodo_destino,
  ].filter((nodo) => nodo != null);

  const recorridos = [];
  const firmas = new Set();

  for (const posibleInicio of posiblesInicios) {
    let nodoActual = String(posibleInicio);
    const nodos = [nodoActual];
    const puntos = [];
    const indices = [];
    let valido = true;

    for (let indice = 0; indice < segmentos.length; indice++) {
      const segmento = segmentos[indice];

      if (
        segmento.nodo_origen == null ||
        segmento.nodo_destino == null ||
        !Array.isArray(segmento.inicio) ||
        !Array.isArray(segmento.fin)
      ) {
        valido = false;
        break;
      }

      const origen = String(segmento.nodo_origen);
      const destino = String(segmento.nodo_destino);

      let siguiente;
      let puntoInicio;
      let puntoFin;

      if (origen === nodoActual) {
        siguiente = destino;
        puntoInicio = segmento.inicio;
        puntoFin = segmento.fin;
      } else if (destino === nodoActual) {
        siguiente = origen;
        puntoInicio = segmento.fin;
        puntoFin = segmento.inicio;
      } else {
        valido = false;
        break;
      }

      const coordenadasValidas = [puntoInicio, puntoFin].every(
        (punto) =>
          Number.isFinite(Number(punto[0])) &&
          Number.isFinite(Number(punto[1]))
      );

      if (!coordenadasValidas) {
        valido = false;
        break;
      }

      if (indice === 0) {
        puntos.push(puntoInicio);
      }

      puntos.push(puntoFin);
      nodos.push(siguiente);
      indices.push(indice);
      nodoActual = siguiente;
    }

    if (!valido) continue;

    const firma = nodos.join("->");
    if (firmas.has(firma)) continue;

    firmas.add(firma);
    recorridos.push({ nodos, puntos, indices });
  }

  return recorridos;
};

const distanciaPuntoSegmentoLocal = (punto, inicio, fin) => {
  const dx = fin[0] - inicio[0];
  const dy = fin[1] - inicio[1];
  const longitudCuadrada = dx * dx + dy * dy;

  if (longitudCuadrada === 0) {
    return Math.hypot(
      punto[0] - inicio[0],
      punto[1] - inicio[1]
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      (
        (punto[0] - inicio[0]) * dx +
        (punto[1] - inicio[1]) * dy
      ) / longitudCuadrada
    )
  );

  const proyeccionX = inicio[0] + t * dx;
  const proyeccionY = inicio[1] + t * dy;

  return Math.hypot(
    punto[0] - proyeccionX,
    punto[1] - proyeccionY
  );
};

const distanciaPuntoPolilineaLocal = (punto, polilinea) => {
  let minima = Infinity;

  for (let indice = 0; indice < polilinea.length - 1; indice++) {
    minima = Math.min(
      minima,
      distanciaPuntoSegmentoLocal(
        punto,
        polilinea[indice],
        polilinea[indice + 1]
      )
    );
  }

  return minima;
};

/* Genera muestras cada 5 metros para comparar la geometría completa. */
const muestrearPolilineaLocal = (polilinea) => {
  const muestras = [];

  for (let indice = 0; indice < polilinea.length - 1; indice++) {
    const inicio = polilinea[indice];
    const fin = polilinea[indice + 1];

    const longitud = Math.hypot(
      fin[0] - inicio[0],
      fin[1] - inicio[1]
    );

    const pasos = Math.max(1, Math.ceil(longitud / 5));

    for (let paso = 0; paso < pasos; paso++) {
      const t = paso / pasos;

      muestras.push([
        inicio[0] + (fin[0] - inicio[0]) * t,
        inicio[1] + (fin[1] - inicio[1]) * t,
      ]);
    }
  }

  muestras.push(polilinea[polilinea.length - 1]);
  return muestras;
};

/*
 * Mide la separación máxima aproximada entre dos polilíneas.
 * Se revisan ambas direcciones para evitar que una ruta se aleje
 * considerablemente aunque la otra permanezca cerca.
 */
const medirSeparacionMaximaPolilineas = (puntosA, puntosB) => {
  if (puntosA.length < 2 || puntosB.length < 2) return Infinity;

  const referencia = puntosA[0];

  const polilineaA = puntosA.map((punto) =>
    proyectarPuntoLocal(punto, referencia)
  );

  const polilineaB = puntosB.map((punto) =>
    proyectarPuntoLocal(punto, referencia)
  );

  const muestrasA = muestrearPolilineaLocal(polilineaA);
  const muestrasB = muestrearPolilineaLocal(polilineaB);

  const maximaA = Math.max(
    ...muestrasA.map((punto) =>
      distanciaPuntoPolilineaLocal(punto, polilineaB)
    )
  );

  const maximaB = Math.max(
    ...muestrasB.map((punto) =>
      distanciaPuntoPolilineaLocal(punto, polilineaA)
    )
  );

  return Math.max(maximaA, maximaB);
};

/*
 * Detecta subrutas que comparten nodos de inicio y fin, aunque una
 * esté representada por una sola arista y la otra por varias.
 *
 * En esta primera versión, la equivalencia entre tipos distintos
 * se limita al caso footway frente a calle nombrada.
 */
const obtenerCoincidenciasSubrutas = (segmentosA, segmentosB) => {
  const recorridosA = obtenerRecorridosOrientados(segmentosA);
  const recorridosB = obtenerRecorridosOrientados(segmentosB);

  const coincidencias = [];
  const firmas = new Set();

  for (const recorridoA of recorridosA) {
    for (const recorridoB of recorridosB) {
      const nodosB = new Set(recorridoB.nodos);
      const nodosComunes = new Set(
        recorridoA.nodos.filter((nodo) => nodosB.has(nodo))
      );

      for (
        let inicioA = 0;
        inicioA < recorridoA.nodos.length - 1;
        inicioA++
      ) {
        const nodoInicio = recorridoA.nodos[inicioA];

        if (!nodosComunes.has(nodoInicio)) continue;

        const inicioB = recorridoB.nodos.indexOf(nodoInicio);
        if (inicioB < 0) continue;

        for (
          let finA = inicioA + 1;
          finA < recorridoA.nodos.length;
          finA++
        ) {
          const nodoFin = recorridoA.nodos[finA];

          if (!nodosComunes.has(nodoFin)) continue;

          const finB = recorridoB.nodos.indexOf(nodoFin);
          if (finB <= inicioB) continue;

          // Solo evaluamos tramos entre anclajes consecutivos compartidos.
          const tieneAnclaIntermediaA = recorridoA.nodos
            .slice(inicioA + 1, finA)
            .some((nodo) => nodosComunes.has(nodo));

          const tieneAnclaIntermediaB = recorridoB.nodos
            .slice(inicioB + 1, finB)
            .some((nodo) => nodosComunes.has(nodo));

          if (tieneAnclaIntermediaA || tieneAnclaIntermediaB) continue;

          const indicesA = recorridoA.indices.slice(inicioA, finA);
          const indicesB = recorridoB.indices.slice(inicioB, finB);

          const subrutaA = indicesA.map((indice) => segmentosA[indice]);
          const subrutaB = indicesB.map((indice) => segmentosB[indice]);

          const coincideFootwayYCalle =
            (esSubrutaFootway(subrutaA) &&
              esSubrutaCalleNombrada(subrutaB)) ||
            (esSubrutaCalleNombrada(subrutaA) &&
              esSubrutaFootway(subrutaB));

          if (!coincideFootwayYCalle) continue;

          const distanciaA = subrutaA.reduce(
            (total, segmento) =>
              total + (Number(segmento.distancia_metros) || 0),
            0
          );

          const distanciaB = subrutaB.reduce(
            (total, segmento) =>
              total + (Number(segmento.distancia_metros) || 0),
            0
          );

          if (!(distanciaA > 0) || !(distanciaB > 0)) continue;

          const proporcionLongitudes =
            Math.min(distanciaA, distanciaB) /
            Math.max(distanciaA, distanciaB);

          // Evita relacionar recorridos con longitudes demasiado diferentes.
          if (proporcionLongitudes < 0.80) continue;

          const puntosA = recorridoA.puntos.slice(inicioA, finA + 1);
          const puntosB = recorridoB.puntos.slice(inicioB, finB + 1);

          const separacion = medirSeparacionMaximaPolilineas(
            puntosA,
            puntosB
          );

          if (separacion > SEPARACION_MAXIMA_VIA_CONTINUA_METROS) {
            continue;
          }

          const firma = `${indicesA.join(",")}|${indicesB.join(",")}`;
          if (firmas.has(firma)) continue;

          firmas.add(firma);
          coincidencias.push({ indicesA, indicesB });
        }
      }
    }
  }

  return coincidencias;
};

/* Suma coincidencias locales con presupuesto por arista para evitar doble conteo. */
const calcularDistanciaCompartidaCorredor = (rutaA, rutaB) => {
  const segmentosA = obtenerSegmentosComparables(rutaA);
  const segmentosB = obtenerSegmentosComparables(rutaB);

  const intervalosPorA = segmentosA.map(() => []);
  const intervalosPorB = segmentosB.map(() => []);

  // Primero registramos las coincidencias de subrutas completas.
  const coincidenciasSubrutas = obtenerCoincidenciasSubrutas(
    segmentosA,
    segmentosB
  );

  for (const coincidencia of coincidenciasSubrutas) {
    for (const indice of coincidencia.indicesA) {
      const distancia =
        Number(segmentosA[indice].distancia_metros) || 0;

      if (distancia > 0) {
        intervalosPorA[indice].push([0, distancia]);
      }
    }

    for (const indice of coincidencia.indicesB) {
      const distancia =
        Number(segmentosB[indice].distancia_metros) || 0;

      if (distancia > 0) {
        intervalosPorB[indice].push([0, distancia]);
      }
    }
  }

  // Después conservamos la comparación individual que ya existía.
  const cruces = [...segmentosA, ...segmentosB].filter(esCrucePeatonal);
  const candidatos = [];

  segmentosA.forEach((a, indiceA) =>
    segmentosB.forEach((b, indiceB) => {
      const coincidencia = evaluarCoincidenciaCorredor(
        a,
        b,
        cruces,
        cruces
      );

      if (coincidencia) {
        candidatos.push({ indiceA, indiceB, ...coincidencia });
      }
    })
  );

  candidatos.sort(
    (a, b) =>
      Number(b.exacta) - Number(a.exacta) ||
      b.longitud - a.longitud
  );

  for (const candidato of candidatos) {
    const distanciaA =
      Math.max(
        0,
        Number(segmentosA[candidato.indiceA].distancia_metros) || 0
      );

    const distanciaB =
      Math.max(
        0,
        Number(segmentosB[candidato.indiceB].distancia_metros) || 0
      );

    if (distanciaA <= 0 || distanciaB <= 0) continue;

    intervalosPorA[candidato.indiceA].push([
      candidato.inicio * distanciaA,
      candidato.fin * distanciaA,
    ]);

    intervalosPorB[candidato.indiceB].push([
      candidato.inicioB * distanciaB,
      candidato.finB * distanciaB,
    ]);
  }

  const medirUnion = (intervalosPorSegmento, segmentos) =>
    intervalosPorSegmento.reduce((total, intervalos, indice) => {
      intervalos.sort((a, b) => a[0] - b[0]);

      let inicio = null;
      let fin = null;
      let union = 0;

      for (const intervalo of intervalos) {
        if (inicio == null) {
          [inicio, fin] = intervalo;
          continue;
        }

        if (intervalo[0] <= fin) {
          fin = Math.max(fin, intervalo[1]);
        } else {
          union += fin - inicio;
          [inicio, fin] = intervalo;
        }
      }

      if (inicio != null) union += fin - inicio;

      return total + Math.min(
        union,
        Number(segmentos[indice].distancia_metros) || 0
      );
    }, 0);

  return Math.min(
    medirUnion(intervalosPorA, segmentosA),
    medirUnion(intervalosPorB, segmentosB)
  );
};

const calcularSimilitudCorredor = (rutaA, rutaB) => {
  const segmentosA = obtenerSegmentosComparables(rutaA);
  const segmentosB = obtenerSegmentosComparables(rutaB);

  const distanciaA = segmentosA.reduce(
    (total, segmento) =>
      total + Math.max(
        0,
        Number(segmento.distancia_metros) || 0
      ),
    0
  );

  const distanciaB = segmentosB.reduce(
    (total, segmento) =>
      total + Math.max(
        0,
        Number(segmento.distancia_metros) || 0
      ),
    0
  );

  if (!(distanciaA > 0) || !(distanciaB > 0)) {
    return 0;
  }

  const distanciaCompartida =
    calcularDistanciaCompartidaCorredor(rutaA, rutaB);

  return Math.min(
    1,
    distanciaCompartida / Math.max(distanciaA, distanciaB)
  );
};

/*
 * Determina si dos alternativas son redundantes.
 */
const sonSegmentosIdenticos = (rutaA, rutaB) => {
  const idsA = rutaA[IDS_SEGMENTOS_RUTA];
  const idsB = rutaB[IDS_SEGMENTOS_RUTA];
  if (Array.isArray(idsA) && Array.isArray(idsB)) {
    return idsA.length === idsB.length && idsA.every((id, index) => id === idsB[index]);
  }

  const nodosA = Array.isArray(rutaA.nodos_ruta)
    ? rutaA.nodos_ruta.join("->")
    : "";

  const nodosB = Array.isArray(rutaB.nodos_ruta)
    ? rutaB.nodos_ruta.join("->")
    : "";

  return Boolean(nodosA && nodosA === nodosB);
};

/*
 * Determina si una ruta es dominada por otra considerando
 * distancia y riesgo.
 *
 * Una ruta está dominada cuando la otra es igual o mejor
 * en ambos indicadores y estrictamente mejor en al menos uno.
 */
const esRutaDominadaPor = (ruta, rutaComparadora) => {
  if (
    !ruta ||
    !rutaComparadora ||
    ruta.distancia_metros == null ||
    ruta.puntaje_riesgo == null ||
    rutaComparadora.distancia_metros == null ||
    rutaComparadora.puntaje_riesgo == null
  ) {
    return false;
  }

  const distancia = Number(ruta.distancia_metros);
  const riesgo = Number(ruta.puntaje_riesgo);

  const distanciaComparadora = Number(
    rutaComparadora.distancia_metros
  );

  const riesgoComparadora = Number(
    rutaComparadora.puntaje_riesgo
  );

  if (
    !Number.isFinite(distancia) ||
    !Number.isFinite(riesgo) ||
    !Number.isFinite(distanciaComparadora) ||
    !Number.isFinite(riesgoComparadora) ||
    distancia <= 0 ||
    distanciaComparadora <= 0
  ) {
    return false;
  }

  const noEsPeorEnDistancia =
    distanciaComparadora <= distancia;

  const noEsPeorEnRiesgo =
    riesgoComparadora <= riesgo;

  const esMejorEnAlgunIndicador =
    distanciaComparadora < distancia ||
    riesgoComparadora < riesgo;

  return (
    noEsPeorEnDistancia &&
    noEsPeorEnRiesgo &&
    esMejorEnAlgunIndicador
  );
};

const sonRutasEquivalentes = (rutaA, rutaB) => {
  if (sonSegmentosIdenticos(rutaA, rutaB)) return true;

  // Caso 2: utilizan prácticamente los mismos corredores.
  const similitud = calcularSimilitudCorredor(
    rutaA,
    rutaB
  );

  if (similitud < UMBRAL_SIMILITUD_CORREDOR) {
    return false;
  }

  // No descartar una posible alternativa más segura
  // cuando la diferencia de riesgo sea relevante.
  const riesgoA =
    rutaA.puntaje_riesgo == null
      ? NaN
      : Number(rutaA.puntaje_riesgo);

  const riesgoB =
    rutaB.puntaje_riesgo == null
      ? NaN
      : Number(rutaB.puntaje_riesgo);

  if (
    Number.isFinite(riesgoA) &&
    Number.isFinite(riesgoB) &&
    Math.abs(riesgoA - riesgoB) >=
      DIFERENCIA_RIESGO_RELEVANTE
  ) {
    return false;
  }

  return true;
};

/*
 * Genera las alternativas de navegación:
 * 1. Menor riesgo.
 * 2. Equilibrada.
 * 3. Más rápida.
 *
 * El grafo se obtiene una sola vez y se reutiliza
 * para ejecutar Dijkstra con cada perfil.
 *
 * Los recorridos duplicados se eliminan.
 * Si no hay tres recorridos diferentes, se devuelven
 * únicamente las alternativas disponibles.
 */

const calcularRutasAlternativas = async ({
  comuna,
  origen,
  destino,
  rangoHorario,
}) => {
  const {
    latOrigen,
    lonOrigen,
    latDestino,
    lonDestino,
  } = normalizarCoordenadasRuta({
    origen,
    destino,
  });

  const origenNormalizado = {
    latitud: latOrigen,
    longitud: lonOrigen,
  };

  const destinoNormalizado = {
    latitud: latDestino,
    longitud: lonDestino,
  };

const grafoOriginal = validarGrafoPeatonal(
  await obtenerGrafoRuta({
    comuna,
    origen: origenNormalizado,
    destino: destinoNormalizado,
    rangoHorario,
  })
);

const {
  grafo,
  origen: conexionOrigen,
  destino: conexionDestino,
} = prepararGrafoConProyeccionesRuta(
  grafoOriginal,
  latOrigen,
  lonOrigen,
  latDestino,
  lonDestino
);

console.log(
  `RUTA - Proyección origen: ${conexionOrigen.distancia_metros} m`
);

console.log(
  `RUTA - Proyección destino: ${conexionDestino.distancia_metros} m`
);

  const rutasUnicas = [];
  const perfilesPendientes = [];

  const cantidadPerfiles = Object.keys(PERFILES_RUTA).length;

  // Registra los segmentos que ya forman parte de corredores utilizados.
  // Se usa una marca binaria para no penalizar varias veces los tramos
  // compartidos por diferentes rutas.
  const registrarSegmentosPenalizados = (usos, ruta) => {
    const ids = ruta?.[IDS_SEGMENTOS_RUTA];

    if (!Array.isArray(ids)) return;

    for (const id of ids) {
      usos.set(id, 1);
    }
  };

  const obtenerMotivoRedundancia = (resultado) => {
    const duplicadaExacta = rutasUnicas.some((ruta) =>
      sonSegmentosIdenticos(ruta, resultado)
    );

    if (duplicadaExacta) {
      return "secuencia de segmentos idéntica";
    }

    const similar = rutasUnicas.some((ruta) =>
      sonRutasEquivalentes(ruta, resultado)
    );

    if (similar) {
      return "similitud de corredores >= 90%";
    }

    return null;
  };

  const resultadoValido = (resultado) =>
    resultado?.encontrada &&
    Array.isArray(resultado.nodos_ruta);

  // ETAPA 1: calcular los perfiles originales sin penalización.
  for (const perfilRuta of Object.keys(PERFILES_RUTA)) {
    const resultado = await calcularRutaSegura({
      comuna,
      origen: origenNormalizado,
      destino: destinoNormalizado,
      rangoHorario,
      perfilRuta,
      factorPenalizacion: 0,
      usosSegmento: new Map(),
      grafoPrecalculado: grafo,
      conexionesProyectadas: {
        origen: conexionOrigen,
        destino: conexionDestino,
      },
    });

    if (!resultadoValido(resultado)) {
      console.log(
        `RUTA - Alternativa no disponible: ${perfilRuta}`
      );
      continue;
    }

    const motivo = obtenerMotivoRedundancia(resultado);

    if (motivo) {
      console.log(
        `RUTA - Alternativa descartada: ${perfilRuta} (${motivo})`
      );

      // Guardamos el perfil para intentar encontrarle
      // un recorrido diferente en la segunda etapa.
      perfilesPendientes.push({
        perfilRuta,
        rutaBase: resultado,
      });

      continue;
    }

    rutasUnicas.push(resultado);
  }

  // ETAPA 2: buscar reemplazos para los perfiles descartados.
  for (const { perfilRuta, rutaBase } of perfilesPendientes) {
    if (rutasUnicas.length >= cantidadPerfiles) break;

    const usosSegmento = new Map();

    // Penalizamos las rutas que ya fueron aceptadas.
    for (const ruta of rutasUnicas) {
      registrarSegmentosPenalizados(usosSegmento, ruta);
    }

    // También penalizamos el recorrido óptimo descartado
    // para intentar explorar un corredor diferente.
    registrarSegmentosPenalizados(usosSegmento, rutaBase);

    let recuperada = false;

    for (const factorPenalizacion of FACTORES_PENALIZACION_RECUPERACION) {
      const resultado = await calcularRutaSegura({
        comuna,
        origen: origenNormalizado,
        destino: destinoNormalizado,
        rangoHorario,
        perfilRuta,
        factorPenalizacion,
        usosSegmento,
        grafoPrecalculado: grafo,
        conexionesProyectadas: {
          origen: conexionOrigen,
          destino: conexionDestino,
        },
      });

      if (!resultadoValido(resultado)) {
        console.log(
          `RUTA - Reintento sin recorrido: ${perfilRuta} (factor ${factorPenalizacion})`
        );
        continue;
      }

      const motivo = obtenerMotivoRedundancia(resultado);

      if (!motivo) {
        // Antes de aceptar el candidato, comprobar si alguna ruta
        // existente ya es igual o mejor en distancia y riesgo.
        const rutaDominante = rutasUnicas.find(
          (rutaExistente) =>
            esRutaDominadaPor(resultado, rutaExistente)
        );

        if (rutaDominante) {
          console.log(
            `RUTA - Candidato recuperado dominado: ${perfilRuta} ` +
            `(dominado por ${rutaDominante.perfil_ruta || "otra ruta"}, ` +
            `factor ${factorPenalizacion})`
          );

          // Evitamos volver a encontrar el mismo recorrido
          // en el siguiente intento.
          registrarSegmentosPenalizados(usosSegmento, resultado);

          // Continuamos con el siguiente factor de penalización.
          continue;
        }

        // El candidato no es redundante ni está dominado.
        resultado.es_alternativa_diversificada = true;

        rutasUnicas.push(resultado);

        console.log(
          `RUTA - Alternativa recuperada: ${perfilRuta} (factor ${factorPenalizacion})`
        );

        recuperada = true;
        break;
      }

      console.log(
        `RUTA - Candidato diversificado descartado: ${perfilRuta} (${motivo}, factor ${factorPenalizacion})`
      );

      // El siguiente intento también evitará los segmentos
      // utilizados por este candidato redundante.
      registrarSegmentosPenalizados(usosSegmento, resultado);
    }

    if (!recuperada) {
      console.log(
        `RUTA - No se encontró reemplazo diferente para: ${perfilRuta}`
      );
    }
  }

// ETAPA 3: eliminar rutas dominadas por otra alternativa.
// Se conservan las rutas que ofrecen una ventaja en distancia
// o en riesgo frente a las demás.
const rutasNoDominadas = rutasUnicas.filter((ruta, indice) => {
  const rutaDominante = rutasUnicas.find(
    (otraRuta, otroIndice) =>
      otroIndice !== indice &&
      esRutaDominadaPor(ruta, otraRuta)
  );

  if (rutaDominante) {
    console.log(
      `RUTA - Alternativa dominada descartada: ${ruta.perfil_ruta}`
    );
  }

  return !rutaDominante;
});

  let mensaje = null;

if (rutasNoDominadas.length === 0) {
  mensaje =
    "No fue posible encontrar una ruta peatonal entre los puntos seleccionados.";
} else if (rutasNoDominadas.length < cantidadPerfiles) {
  mensaje =
    `Solo fue posible generar ${rutasNoDominadas.length} rutas peatonales diferentes de ${cantidadPerfiles} posibles.`;
}

console.log(
  `RUTA - Alternativas diferentes: ${rutasNoDominadas.length}/${cantidadPerfiles}`
);

return {
  encontrada: rutasNoDominadas.length > 0,
  cantidad_rutas: rutasNoDominadas.length,
  rutas: rutasNoDominadas,
  ...(mensaje ? { mensaje } : {}),
};
};


module.exports = {
  calcularRutaSegura,
  calcularRutasAlternativas,
  construirBboxRuta,
  calcularSimilitudCorredor,
  calcularDistanciaCompartidaCorredor,
  esRutaDominadaPor,
  proyectarPuntoSobreSegmento,
};