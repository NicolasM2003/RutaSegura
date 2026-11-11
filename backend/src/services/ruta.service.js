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

const METROS_POR_GRADO_LATITUD = 111_320;

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
  perfil = null
) => {
  const distancia = Number(
    arista.distancia_metros
  );

  const puntajeRiesgo = Number(
    arista.puntaje_riesgo
  );

  const riesgoNormalizado = puntajeRiesgo / 100;

  return calcularCostoOperativoArista(
    distancia,
    riesgoNormalizado,
    perfil?.peso_distancia ?? PESO_DISTANCIA,
    perfil?.peso_riesgo ?? PESO_RIESGO
  );
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
        costo = calcularCostoArista(vecino.arista, perfil);
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

  const resultadoDijkstra = dijkstra({
    nodos: grafo.nodos,
    aristas: grafo.aristas,

    nodoOrigen: origenCercano.nodo.id,
    nodoDestino: destinoCercano.nodo.id,

    perfil,
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

  const nodosMap = new Map(
    grafo.nodos.map((nodo) => [nodo.id, nodo])
  );

  const resumen = calcularResumenRuta({
    aristasRuta: resultadoDijkstra.aristasRuta,
    costoTotal: resultadoDijkstra.costoTotal,
  });

  resumen.geometria = construirGeometriaRuta(
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

    segmentos: (() => {
      let costoAcumulado = 0;
      return resultadoDijkstra.aristasRuta.map(
        (arista) => {
          const costoSegmento = calcularCostoArista(arista, perfil);
          costoAcumulado += costoSegmento;
          return {
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

/*
 * Agrupa la distancia recorrida según la calle.
 *
 * Prioridad:
 * 1. Nombre normalizado de la calle.
 * 2. Identificador OSM, cuando el segmento no tiene nombre.
 */
const obtenerHuellaCorredores = (ruta) => {
  const segmentos = Array.isArray(ruta.segmentos)
    ? ruta.segmentos
    : [];

  const distanciasPorCorredor = new Map();

  let distanciaSegmentos = 0;

  for (const segmento of segmentos) {
    const distancia = Number(segmento.distancia_metros);

    if (!Number.isFinite(distancia) || distancia <= 0) {
      continue;
    }

    distanciaSegmentos += distancia;

    const nombreVia = normalizarNombreVia(segmento.nombre);

    let claveCorredor = null;

    if (nombreVia) {
      claveCorredor = `via:${nombreVia}`;
    } else if (segmento.id_osm != null) {
      claveCorredor = `osm:${segmento.id_osm}`;
    }

    // Sin nombre ni identificador no podemos comparar
    // de forma fiable este segmento por corredor.
    if (!claveCorredor) {
      continue;
    }

    const distanciaAnterior =
      distanciasPorCorredor.get(claveCorredor) || 0;

    distanciasPorCorredor.set(
      claveCorredor,
      distanciaAnterior + distancia
    );
  }

  const distanciaInformada = Number(ruta.distancia_metros);

  const distanciaTotal =
    Number.isFinite(distanciaInformada) &&
    distanciaInformada > 0
      ? distanciaInformada
      : distanciaSegmentos;

  return {
    distanciasPorCorredor,
    distanciaTotal,
  };
};

/*
 * Calcula cuánto comparten dos rutas según las calles utilizadas.
 *
 * El resultado va de 0 a 1:
 * 0 = no comparten corredores identificables.
 * 1 = comparten toda la distancia identificada.
 */
const calcularSimilitudCorredor = (rutaA, rutaB) => {
  const huellaA = obtenerHuellaCorredores(rutaA);
  const huellaB = obtenerHuellaCorredores(rutaB);

  if (
    huellaA.distanciaTotal <= 0 ||
    huellaB.distanciaTotal <= 0 ||
    huellaA.distanciasPorCorredor.size === 0 ||
    huellaB.distanciasPorCorredor.size === 0
  ) {
    return 0;
  }

  let distanciaCompartida = 0;

  for (const [corredor, distanciaA] of
    huellaA.distanciasPorCorredor) {
    const distanciaB =
      huellaB.distanciasPorCorredor.get(corredor) || 0;

    distanciaCompartida += Math.min(
      distanciaA,
      distanciaB
    );
  }

  return Math.min(
    1,
    distanciaCompartida /
      Math.max(
        huellaA.distanciaTotal,
        huellaB.distanciaTotal
      )
  );
};

/*
 * Determina si dos alternativas son redundantes.
 */
const sonRutasEquivalentes = (rutaA, rutaB) => {
  const nodosA = Array.isArray(rutaA.nodos_ruta)
    ? rutaA.nodos_ruta.join("->")
    : "";

  const nodosB = Array.isArray(rutaB.nodos_ruta)
    ? rutaB.nodos_ruta.join("->")
    : "";

  // Caso 1: misma secuencia exacta de nodos.
  if (nodosA && nodosA === nodosB) {
    return true;
  }

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

  const grafo = await obtenerGrafoRuta({
    comuna,
    origen: origenNormalizado,
    destino: destinoNormalizado,
    rangoHorario,
  });

  const rutasUnicas = [];
  const recorridosVistos = new Set();

  for (const perfilRuta of Object.keys(PERFILES_RUTA)) {
    const resultado = await calcularRutaSegura({
      comuna,

      origen: origenNormalizado,
      destino: destinoNormalizado,

      rangoHorario,
      perfilRuta,

      grafoPrecalculado: grafo,
    });

    if (
      !resultado.encontrada ||
      !Array.isArray(resultado.nodos_ruta)
    ) {
      continue;
    }

    const identificadorRecorrido =
      resultado.nodos_ruta.join("->");

    const rutaRedundante = rutasUnicas.some(
      (rutaExistente) =>
        sonRutasEquivalentes(
          rutaExistente,
          resultado
        )
    );

    if (
      recorridosVistos.has(identificadorRecorrido) ||
      rutaRedundante
    ) {
      console.log(
        `RUTA - Alternativa redundante descartada: ${perfilRuta}`
      );

      continue;
    }

    recorridosVistos.add(
      identificadorRecorrido
    );

    rutasUnicas.push(resultado);
  }

  const cantidadPerfiles =
    Object.keys(PERFILES_RUTA).length;

  let mensaje = null;

  if (rutasUnicas.length === 0) {
    mensaje =
      "No fue posible encontrar una ruta peatonal entre los puntos seleccionados.";
  } else if (rutasUnicas.length < cantidadPerfiles) {
    mensaje =
      `Solo fue posible generar ${rutasUnicas.length} rutas peatonales diferentes de ${cantidadPerfiles} posibles.`;
  }

  console.log(
    `RUTA - Alternativas diferentes: ${rutasUnicas.length}/${cantidadPerfiles}`
  );

  return {
    encontrada: rutasUnicas.length > 0,

    cantidad_rutas: rutasUnicas.length,

    rutas: rutasUnicas,

    ...(mensaje ? { mensaje } : {}),
  };
};

module.exports = {
  calcularRutaSegura,
  calcularRutasAlternativas,
  construirBboxRuta,
};
