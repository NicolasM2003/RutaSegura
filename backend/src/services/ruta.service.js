const {
  PERFILES_RUTA,
} = require("../config/perfiles-ruta.config");
const {
  calcularCostoOperativoArista,
  PESO_DISTANCIA,
  PESO_RIESGO,
} = require("./costo-ruta.service");
const { clasificarRiesgo } = require("./riesgo.service");
const { performance } = require("node:perf_hooks");
const {
  YEN_MAX_CANDIDATOS,
  YEN_MAX_BUSQUEDAS_DESVIACION,
} = require("../config/rutas-alternativas.config");
const { ejecutarLoteBusqueda } = require("./trabajadores-rutas.service");

const diagnosticoRutasActivo =
  process.env.NODE_ENV !== "production" &&
  process.env.RUTASEGURA_DEBUG_ALGORITMOS === "true";

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
  // Cargar el servicio de datos solo en el proceso que prepara la ruta.
  // Los workers reciben el grafo ya preparado y no deben inicializar Supabase.
  const { obtenerGrafoPeatonal } = require("./grafo-peatonal.service");
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
 * Cota inferior geográfica para A*.
 * Cada distancia de arista se redondea al centímetro más cercano, por lo
 * que puede quedar hasta 0.005 m por debajo de la distancia geodésica.
 * Un camino simple usa como máximo N-1 aristas. Restar ese error máximo
 * acumulado de la distancia Haversine mantiene la cota por debajo de la
 * suma de distancias de cualquier camino simple. Como riesgo >= 0,
 * cada costo operativo es >= pesoDistancia * distanciaArista.
 */
const heuristicaAStar = ({ nodo, nodoDestino, nodosMap, pesoDistancia, cantidadNodos }) => {
  if (nodo === nodoDestino || pesoDistancia === 0) return 0;
  const actual = nodosMap.get(nodo);
  const destino = nodosMap.get(nodoDestino);
  if (!actual || !destino) return 0;

  const distanciaDirecta = distanciaHaversine(
    actual.latitud,
    actual.longitud,
    destino.latitud,
    destino.longitud
  );
  if (!Number.isFinite(distanciaDirecta)) return 0;

  const margenRedondeo = 0.005 * Math.max(0, cantidadNodos - 1);
  return pesoDistancia * Math.max(0, distanciaDirecta - margenRedondeo);
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

  const nivelRiesgo = clasificarRiesgo(puntajeRiesgo);

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

const crearRespuestaRuta = ({
  grafo,
  origen,
  destino,
  origenCercano,
  destinoCercano,
  resultadoBusqueda,
  perfil,
  perfilRuta,
}) => {
  if (!resultadoBusqueda) {
    return {
      encontrada: false,
      mensaje: "No fue posible encontrar una ruta peatonal entre los puntos seleccionados.",
      origen,
      destino,
    };
  }

  const inicioResumen = diagnosticoRutasActivo ? performance.now() : 0;
  const nodosMap = new Map(grafo.nodos.map((nodo) => [nodo.id, nodo]));
  const resumen = calcularResumenRuta({
    aristasRuta: resultadoBusqueda.aristasRuta,
    costoTotal: resultadoBusqueda.costoTotal,
  });
  const tiempoResumenMs = diagnosticoRutasActivo ? performance.now() - inicioResumen : 0;
  const inicioGeometria = diagnosticoRutasActivo ? performance.now() : 0;
  resumen.geometria = construirGeometriaRuta(nodosMap, resultadoBusqueda.nodosRuta);
  const tiempoGeometriaMs = diagnosticoRutasActivo ? performance.now() - inicioGeometria : 0;
  const inicioSegmentos = diagnosticoRutasActivo ? performance.now() : 0;
  let costoAcumulado = 0;
  const segmentos = resultadoBusqueda.aristasRuta.map((arista) => {
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
      costo_arista: costoSegmento,
      costo_arista_operativo: costoSegmento,
      costo_acumulado_ruta: costoAcumulado,
      zonas_intersectadas: arista.zonas_intersectadas,
      nombre: arista.nombre,
      tipo: arista.tipo,
      categoria_peatonal: arista.categoria_peatonal,
    };
  });
  const tiempoSegmentosMs = diagnosticoRutasActivo ? performance.now() - inicioSegmentos : 0;

  const respuesta = {
    encontrada: true,
    origen: {
      ...origen,
      nodo_mas_cercano: origenCercano.nodo.id,
      distancia_al_nodo_metros: origenCercano.distancia_metros,
    },
    destino: {
      ...destino,
      nodo_mas_cercano: destinoCercano.nodo.id,
      distancia_al_nodo_metros: destinoCercano.distancia_metros,
    },
    ...resumen,
    ...(perfilRuta ? { perfil_ruta: perfilRuta, nombre_perfil_ruta: perfil.nombre } : {}),
    nodos_ruta: resultadoBusqueda.nodosRuta,
    segmentos,
  };
  if (diagnosticoRutasActivo) {
    respuesta.diagnostico_tiempos_construccion_ms = {
      resumen: tiempoResumenMs,
      geometria: tiempoGeometriaMs,
      segmentos: tiempoSegmentosMs,
    };
  }
  return respuesta;
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
  contextoPrecalculado = null,
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

  const contexto = contextoPrecalculado;
  const grafo = validarGrafoPeatonal(
    contexto?.grafo || grafoPrecalculado ||
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

  const origenCercano = contexto?.origenCercano ||
    obtenerNodoMasCercanoEnGrafo(
      grafo.nodos,
      latOrigen,
      lonOrigen
    );

  const destinoCercano = contexto?.destinoCercano ||
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

  // Carga el MinHeap de forma diferida para evitar un ciclo de dependencias:
  // su servicio reutiliza la heurística y el costo exportados por este módulo.
  const { aStarMinHeap } = require("./busqueda-a-star-min-heap.service");
  const resultadoBusqueda = aStarMinHeap({
    nodos: grafo.nodos,
    aristas: grafo.aristas,
    adyacenciaPreparada: contexto?.adyacencia,

    nodoOrigen: origenCercano.nodo.id,
    nodoDestino: destinoCercano.nodo.id,

    perfil,
  });

  const resultado = crearRespuestaRuta({
    grafo,
    origen: { latitud: latOrigen, longitud: lonOrigen },
    destino: { latitud: latDestino, longitud: lonDestino },
    origenCercano,
    destinoCercano,
    resultadoBusqueda,
    perfil,
    perfilRuta,
  });

  if (!resultadoBusqueda) return resultado;

  console.log(
    `RUTA - Encontrada: ${resultado.cantidad_segmentos} segmentos`
  );

  console.log(
    `RUTA - Distancia: ${resultado.distancia_metros} m`
  );

  console.log(
    `RUTA - Costo: ${resultado.costo_navegacion}`
  );

  console.log(
    `RUTA - Riesgo: ${resultado.puntaje_riesgo} (${resultado.nivel_riesgo})`
  );

  return resultado;
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
 * Prioridad: par físico de nodos (independiente de la dirección),
 * y luego nombre normalizado o identificador OSM como respaldo.
 */
const obtenerHuellaCorredores = (ruta) => {
  const segmentos = Array.isArray(ruta.segmentos)
    ? ruta.segmentos
    : [];

  const distanciasPorCorredor = new Map();

  let distanciaSegmentos = 0;
  let distanciaIdentificable = 0;
  let cantidadSegmentosConNombre = 0;
  let cantidadSegmentosConIdOsm = 0;
  let cantidadSegmentosConAmbos = 0;
  let cantidadSegmentosSinIdentificador = 0;
  let cantidadSegmentosConCorredor = 0;

  for (const segmento of segmentos) {
    const nombreVia = normalizarNombreVia(segmento.nombre);
    const tieneNombre = Boolean(nombreVia);
    const tieneIdOsm = segmento.id_osm !== null && segmento.id_osm !== undefined;

    if (tieneNombre) cantidadSegmentosConNombre += 1;
    if (tieneIdOsm) cantidadSegmentosConIdOsm += 1;
    if (tieneNombre && tieneIdOsm) cantidadSegmentosConAmbos += 1;
    if (!tieneNombre && !tieneIdOsm) cantidadSegmentosSinIdentificador += 1;

    const distancia = Number(segmento.distancia_metros);

    if (!Number.isFinite(distancia) || distancia <= 0) {
      continue;
    }

    distanciaSegmentos += distancia;

    const nodoOrigen = segmento.nodo_origen;
    const nodoDestino = segmento.nodo_destino;
    let claveCorredor = null;
    if (nodoOrigen !== undefined && nodoOrigen !== null && nodoDestino !== undefined && nodoDestino !== null) {
      const [primero, segundo] = [String(nodoOrigen), String(nodoDestino)].sort();
      claveCorredor = `arista:${primero}<->${segundo}${tieneIdOsm ? `|osm:${segmento.id_osm}` : ""}`;
    } else if (tieneNombre) {
      claveCorredor = `via:${nombreVia}`;
    } else if (tieneIdOsm) {
      claveCorredor = `osm:${segmento.id_osm}`;
    }

    // Sin nombre ni identificador no podemos comparar
    // de forma fiable este segmento por corredor.
    if (!claveCorredor) {
      continue;
    }

    distanciaIdentificable += distancia;
    cantidadSegmentosConCorredor += 1;

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

  const toleranciaCobertura = 1e-9 * Math.max(1, distanciaTotal);
  const cobertura = distanciaTotal > 0
    ? Math.min(1, distanciaIdentificable / distanciaTotal)
    : 0;

  return {
    distanciasPorCorredor,
    distanciaTotal,
    distanciaIdentificable,
    cobertura,
    coberturaSuficiente: distanciaTotal > 0 &&
      distanciaIdentificable >= distanciaTotal - toleranciaCobertura,
    cantidadSegmentos: segmentos.length,
    cantidadSegmentosConNombre,
    cantidadSegmentosConIdOsm,
    cantidadSegmentosConAmbos,
    cantidadSegmentosSinIdentificador,
    cantidadSegmentosConCorredor,
  };
};

const obtenerDiagnosticoCorredores = (ruta) => {
  const huella = obtenerHuellaCorredores(ruta);
  return {
    distancia_total_metros: huella.distanciaTotal,
    distancia_identificable_metros: huella.distanciaIdentificable,
    cobertura_identificable: huella.cobertura,
    cobertura_suficiente: huella.coberturaSuficiente,
    cantidad_segmentos: huella.cantidadSegmentos,
    cantidad_segmentos_con_nombre: huella.cantidadSegmentosConNombre,
    cantidad_segmentos_con_id_osm: huella.cantidadSegmentosConIdOsm,
    cantidad_segmentos_con_ambos: huella.cantidadSegmentosConAmbos,
    cantidad_segmentos_sin_identificador: huella.cantidadSegmentosSinIdentificador,
    cantidad_segmentos_con_corredor: huella.cantidadSegmentosConCorredor,
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
  return compararCorredores(rutaA, rutaB).similitud;
};

const compararCorredores = (rutaA, rutaB) => {
  const huellaA = obtenerHuellaCorredores(rutaA);
  const huellaB = obtenerHuellaCorredores(rutaB);

  if (
    huellaA.distanciaTotal <= 0 ||
    huellaB.distanciaTotal <= 0 ||
    huellaA.distanciasPorCorredor.size === 0 ||
    huellaB.distanciasPorCorredor.size === 0
  ) {
    return {
      distancia_compartida_metros: 0,
      similitud: 0,
    };
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

  return {
    distancia_compartida_metros: distanciaCompartida,
    similitud: Math.min(
      1,
      distanciaCompartida /
        Math.max(
          huellaA.distanciaTotal,
          huellaB.distanciaTotal
        )
    ),
  };
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

/* Aplica la misma deduplicación utilizada por las alternativas habituales. */
const filtrarRutasAlternativas = (rutasCandidatas) => {
  const rutasUnicas = [];
  const recorridosVistos = new Set();
  const evaluacion = [];

  for (const ruta of rutasCandidatas) {
    const identificadorRecorrido = Array.isArray(ruta.nodos_ruta)
      ? ruta.nodos_ruta.join("->")
      : "";
    const rutaRepetidaPorSecuencia = recorridosVistos.has(identificadorRecorrido);
    const equivalente = rutasUnicas.find((rutaExistente) =>
      sonRutasEquivalentes(rutaExistente, ruta)
    );
    const conservada = !rutaRepetidaPorSecuencia && !equivalente;
    const referencia = equivalente || (rutaRepetidaPorSecuencia
      ? rutasUnicas.find((rutaExistente) =>
          Array.isArray(rutaExistente.nodos_ruta) &&
          rutaExistente.nodos_ruta.join("->") === identificadorRecorrido
        )
      : null);

    evaluacion.push({
      ruta,
      conservada,
      motivo_descarte: conservada
        ? null
        : rutaRepetidaPorSecuencia || (
            referencia &&
            Array.isArray(referencia.nodos_ruta) &&
            referencia.nodos_ruta.join("->") === identificadorRecorrido
          )
          ? "secuencia_nodos"
          : "similitud_corredores",
      perfil_redundante_con: conservada ? null : referencia?.perfil_ruta ?? null,
    });

    if (conservada) {
      recorridosVistos.add(identificadorRecorrido);
      rutasUnicas.push(ruta);
    }
  }

  return {
    rutasUnicas,
    evaluacion,
  };
};

const firmaRuta = (nodosRuta) => nodosRuta.join("->");

const rutaDominadaPorAlguna = (ruta, seleccionadas) => {
  const distancia = Number(ruta.distancia_metros);
  const riesgo = Number(ruta.puntaje_riesgo);
  return seleccionadas.some((otra) => {
    const otraDistancia = Number(otra.distancia_metros);
    const otroRiesgo = Number(otra.puntaje_riesgo);
    const noPeor = otraDistancia <= distancia && otroRiesgo <= riesgo;
    const estrictamenteMejor = otraDistancia < distancia || otroRiesgo < riesgo;
    return noPeor && estrictamenteMejor;
  });
};

const generarCaminosYen = ({
  contexto,
  resultadoInicial,
  perfil,
  maxCandidatos = YEN_MAX_CANDIDATOS,
  maxDesviaciones = YEN_MAX_BUSQUEDAS_DESVIACION,
  signal,
}) => {
  const {
    aStarMinHeap,
    claveAristaFisica,
  } = require("./busqueda-a-star-min-heap.service");
  if (!resultadoInicial || maxCandidatos <= 1) {
    return {
      caminos: resultadoInicial ? [resultadoInicial] : [],
      caminosCandidatosUnicos: [],
      metricas: {
        candidatosEvaluados: resultadoInicial ? 1 : 0,
        candidatosUnicos: resultadoInicial ? 1 : 0,
        candidatosDuplicados: 0,
        busquedasDesviacion: 0,
        ...(diagnosticoRutasActivo ? { detalleDesviaciones: [] } : {}),
      },
    };
  }

  const caminos = [resultadoInicial];
  const candidatos = [];
  const candidatosUnicos = new Map();
  const firmasAceptadas = new Set([firmaRuta(resultadoInicial.nodosRuta)]);
  const firmasCandidatas = new Set();
  let busquedasDesviacion = 0;
  let candidatosGenerados = 0;
  let candidatosDuplicados = 0;
  const detalleDesviaciones = [];
  let limiteDesviacionesAlcanzado = false;
  let limiteCandidatosAlcanzado = false;

  for (let indiceCamino = 1; indiceCamino < maxCandidatos; indiceCamino += 1) {
    const anterior = caminos[indiceCamino - 1];
    for (let indiceDesvio = 0; indiceDesvio < anterior.nodosRuta.length - 1; indiceDesvio += 1) {
      if (signal?.aborted) {
        const error = new Error("La solicitud de rutas fue cancelada.");
        error.code = "BUSQUEDA_CANCELADA";
        throw error;
      }
      if (busquedasDesviacion >= maxDesviaciones) {
        limiteDesviacionesAlcanzado = true;
        break;
      }
      busquedasDesviacion += 1;

      const nodosRaiz = anterior.nodosRuta.slice(0, indiceDesvio + 1);
      const aristasRaiz = anterior.aristasRuta.slice(0, indiceDesvio);
      const nodoDesvio = nodosRaiz[nodosRaiz.length - 1];
      const nodosExcluidos = new Set(nodosRaiz.slice(0, -1));
      const aristasExcluidas = new Set();

      for (const caminoAceptado of caminos) {
        const compartePrefijo = nodosRaiz.every(
          (id, indice) => caminoAceptado.nodosRuta[indice] === id,
        );
        if (compartePrefijo && caminoAceptado.aristasRuta[indiceDesvio]) {
          const arista = caminoAceptado.aristasRuta[indiceDesvio];
          aristasExcluidas.add(arista);
          aristasExcluidas.add(claveAristaFisica(arista));
        }
      }

      const spur = aStarMinHeap({
        ...contexto,
        nodoOrigen: nodoDesvio,
        nodoDestino: contexto.nodoDestino,
        perfil,
        nodosExcluidos,
        aristasExcluidas,
        estaCancelada: () => Boolean(signal?.aborted),
      });
      if (!spur) {
        if (diagnosticoRutasActivo) detalleDesviaciones.push({
          busqueda: busquedasDesviacion,
          indice_desvio: indiceDesvio,
          nodo_desvio: nodoDesvio,
          estado: "sin_conexion",
          motivo: "falta_de_conexion",
        });
        continue;
      }

      const nodosRuta = [...nodosRaiz.slice(0, -1), ...spur.nodosRuta];
      const aristasRuta = [...aristasRaiz, ...spur.aristasRuta];
      const firma = firmaRuta(nodosRuta);
      if (diagnosticoRutasActivo && new Set(nodosRuta).size !== nodosRuta.length) {
        if (diagnosticoRutasActivo) detalleDesviaciones.push({
          busqueda: busquedasDesviacion,
          indice_desvio: indiceDesvio,
          nodo_desvio: nodoDesvio,
          estado: "camino_invalido",
          motivo: "ciclo_detectado",
          cantidad_nodos_ruta: nodosRuta.length,
        });
        continue;
      }
      candidatosGenerados += 1;
      if (firmasAceptadas.has(firma) || firmasCandidatas.has(firma)) {
        candidatosDuplicados += 1;
        if (diagnosticoRutasActivo) detalleDesviaciones.push({
          busqueda: busquedasDesviacion,
          indice_desvio: indiceDesvio,
          nodo_desvio: nodoDesvio,
          estado: "duplicado",
          motivo: "secuencia_ya_generada",
          cantidad_nodos_ruta: nodosRuta.length,
        });
        continue;
      }

      const costoRaiz = aristasRaiz.reduce(
        (suma, arista) => suma + calcularCostoArista(arista, perfil),
        0,
      );
      const candidato = {
        nodosRuta,
        aristasRuta,
        costoTotal: costoRaiz + spur.costoTotal,
      };
      if (diagnosticoRutasActivo) candidatosUnicos.set(firma, candidato);
      candidatos.push(candidato);
      candidatos.sort((a, b) =>
        a.costoTotal - b.costoTotal || firmaRuta(a.nodosRuta).localeCompare(firmaRuta(b.nodosRuta))
      );
      firmasCandidatas.add(firma);
      if (diagnosticoRutasActivo) detalleDesviaciones.push({
        busqueda: busquedasDesviacion,
        indice_desvio: indiceDesvio,
        nodo_desvio: nodoDesvio,
        estado: "candidato_unico_generado",
        costo_perfil: candidato.costoTotal,
        cantidad_nodos_ruta: nodosRuta.length,
      });
      if (candidatos.length >= maxCandidatos - 1) {
        limiteCandidatosAlcanzado = true;
        break;
      }
    }

    if (!candidatos.length) break;
    const siguiente = candidatos.shift();
    const firmaSiguiente = firmaRuta(siguiente.nodosRuta);
    firmasCandidatas.delete(firmaSiguiente);
    firmasAceptadas.add(firmaSiguiente);
    caminos.push(siguiente);
  }

  return {
    caminos,
    caminosCandidatosUnicos: Array.from(candidatosUnicos.values()).sort((a, b) =>
      a.costoTotal - b.costoTotal || firmaRuta(a.nodosRuta).localeCompare(firmaRuta(b.nodosRuta)),
    ),
    metricas: {
      candidatosEvaluados: caminos.length,
      candidatosGenerados,
      candidatosUnicos: diagnosticoRutasActivo
        ? candidatosUnicos.size
        : candidatosGenerados - candidatosDuplicados,
      candidatosDuplicados,
      busquedasDesviacion,
      limiteCandidatos: maxCandidatos,
      limiteDesviaciones: maxDesviaciones,
      limiteCandidatosAlcanzado,
      limiteDesviacionesAlcanzado,
      ...(diagnosticoRutasActivo ? { detalleDesviaciones } : {}),
    },
  };
};

/*
 * Prepara las tres rutas en una sola solicitud. El grafo, los riesgos, los
 * extremos asociados y la adyacencia se construyen una vez; tres workers
 * reutilizables ejecutan A* + MinHeap sobre copias estructuradas del mismo
 * contexto. El principal se encola primero y conserva siempre la prioridad.
 */
const calcularRutasAlternativas = async ({
  comuna,
  origen,
  destino,
  rangoHorario,
  perfilRuta = "menor_riesgo",
  signal,
}) => {
  const perfilPrincipal = perfilRuta || "menor_riesgo";
  if (!PERFILES_RUTA[perfilPrincipal]) {
    throw new Error(`Perfil de ruta no válido: ${perfilPrincipal}`);
  }
  const inicioTotal = performance.now();
  const inicioPreparacionGrafo = performance.now();
  const coordenadas = normalizarCoordenadasRuta({ origen, destino });
  const origenNormalizado = { latitud: coordenadas.latOrigen, longitud: coordenadas.lonOrigen };
  const destinoNormalizado = { latitud: coordenadas.latDestino, longitud: coordenadas.lonDestino };
  const grafo = await obtenerGrafoRuta({
    comuna,
    origen: origenNormalizado,
    destino: destinoNormalizado,
    rangoHorario,
  });
  const tiempoPreparacionGrafoRiesgoMs = performance.now() - inicioPreparacionGrafo;

  const inicioSeleccionNodos = performance.now();
  const origenCercano = obtenerNodoMasCercanoEnGrafo(
    grafo.nodos,
    coordenadas.latOrigen,
    coordenadas.lonOrigen,
  );
  const destinoCercano = obtenerNodoMasCercanoEnGrafo(
    grafo.nodos,
    coordenadas.latDestino,
    coordenadas.lonDestino,
  );
  const tiempoSeleccionNodosMs = performance.now() - inicioSeleccionNodos;

  const inicioAdyacencia = performance.now();
  const adyacencia = construirAdyacencia(grafo.aristas);
  const tiempoAdyacenciaMs = performance.now() - inicioAdyacencia;
  const contexto = {
    nodos: grafo.nodos,
    aristas: grafo.aristas,
    adyacenciaPreparada: adyacencia,
    nodoOrigen: origenCercano.nodo.id,
    nodoDestino: destinoCercano.nodo.id,
  };

  const ordenPerfiles = [
    perfilPrincipal,
    ...Object.keys(PERFILES_RUTA).filter((perfil) => perfil !== perfilPrincipal),
  ];
  const tareas = ordenPerfiles.map((perfil, indice) => ({
    perfil: PERFILES_RUTA[perfil],
    perfilRuta: perfil,
    contexto,
    prioridad: indice === 0 ? 0 : 1,
  }));
  const inicioBusquedas = performance.now();
  const lote = await ejecutarLoteBusqueda(tareas, { signal });
  const tiempoLoteBusquedasMs = performance.now() - inicioBusquedas;
  const resultadosBase = Object.fromEntries(
    tareas.map((tarea, indice) => [tarea.perfilRuta, lote.resultados[indice]]),
  );
  const nodosDestinoRuta = {
    origen: origenNormalizado,
    destino: destinoNormalizado,
    origenCercano,
    destinoCercano,
    grafo,
  };

  const rutasPorPerfil = {};
  const estadoPorPerfil = {};
  let tiempoGeneracionYenMs = 0;
  let activacionesYen = 0;
  let candidatosYenEvaluados = 0;
  let busquedasYen = 0;
  let tiempoPerfilPrincipalMs = 0;
  let tiempoPerfilesSecundariosMs = 0;
  let tiempoParedPerfilesSecundariosMs = 0;
  let tiempoConstruccionRutasMs = 0;
  const tiemposConstruccionPorEtapa = { resumen: 0, geometria: 0, segmentos: 0 };
  let tiempoEvaluacionAlternativasMs = 0;
  const diagnosticosYenPorPerfil = {};
  const seleccionadas = [];

  for (const perfil of ordenPerfiles) {
    const base = resultadosBase[perfil];
    if (perfil === perfilPrincipal) tiempoPerfilPrincipalMs = base.tiempoBusquedaMs;
    else {
      tiempoPerfilesSecundariosMs += base.tiempoBusquedaMs;
      tiempoParedPerfilesSecundariosMs = Math.max(
        tiempoParedPerfilesSecundariosMs,
        base.tiempoBusquedaMs,
      );
    }

    if (!base.resultado) {
      estadoPorPerfil[perfil] = {
        estado: "sin_ruta",
        metodo: "astar_min_heap",
        tiempo_busqueda_ms: base.tiempoBusquedaMs,
        candidatos_yen_evaluados: 0,
      };
      continue;
    }

    const inicioConstruccionBase = performance.now();
    const rutaBase = crearRespuestaRuta({
      ...nodosDestinoRuta,
      resultadoBusqueda: base.resultado,
      perfil: PERFILES_RUTA[perfil],
      perfilRuta: perfil,
    });
    tiempoConstruccionRutasMs += performance.now() - inicioConstruccionBase;
    for (const etapa of Object.keys(tiemposConstruccionPorEtapa)) {
      tiemposConstruccionPorEtapa[etapa] += rutaBase.diagnostico_tiempos_construccion_ms?.[etapa] || 0;
    }
    const inicioEvaluacionBase = performance.now();
    const redundante = seleccionadas.some((ruta) => sonRutasEquivalentes(ruta, rutaBase));
    const dominada = rutaDominadaPorAlguna(rutaBase, seleccionadas);
    tiempoEvaluacionAlternativasMs += performance.now() - inicioEvaluacionBase;
    let rutaSeleccionada = null;
    let metodo = "astar_min_heap";
    let metricasYen = { candidatosEvaluados: 1, busquedasDesviacion: 0 };

    if (perfil === perfilPrincipal || (!redundante && !dominada)) {
      rutaSeleccionada = rutaBase;
    } else {
      activacionesYen += 1;
      const inicioYen = performance.now();
      const resultadoYen = generarCaminosYen({
        contexto,
        resultadoInicial: base.resultado,
        perfil: PERFILES_RUTA[perfil],
        signal,
      });
      tiempoGeneracionYenMs += performance.now() - inicioYen;
      metricasYen = resultadoYen.metricas;
      candidatosYenEvaluados += metricasYen.candidatosEvaluados;
      busquedasYen += metricasYen.busquedasDesviacion;

      const diagnosticoCandidatos = [];
      for (const camino of resultadoYen.caminos.slice(1)) {
        const inicioConstruccionCandidato = performance.now();
        const respuesta = crearRespuestaRuta({
          ...nodosDestinoRuta,
          resultadoBusqueda: camino,
          perfil: PERFILES_RUTA[perfil],
          perfilRuta: perfil,
        });
        tiempoConstruccionRutasMs += performance.now() - inicioConstruccionCandidato;
        for (const etapa of Object.keys(tiemposConstruccionPorEtapa)) {
          tiemposConstruccionPorEtapa[etapa] += respuesta.diagnostico_tiempos_construccion_ms?.[etapa] || 0;
        }
        const inicioEvaluacionCandidato = performance.now();
        const equivalente = seleccionadas.some((ruta) => sonRutasEquivalentes(ruta, respuesta));
        const dominadaPorOtra = rutaDominadaPorAlguna(respuesta, seleccionadas);
        tiempoEvaluacionAlternativasMs += performance.now() - inicioEvaluacionCandidato;
        if (diagnosticoRutasActivo) {
          const comparaciones = seleccionadas.map((referencia) => {
            const corredores = compararCorredores(referencia, respuesta);
            const mismaSecuencia = firmaRuta(referencia.nodos_ruta) === firmaRuta(respuesta.nodos_ruta);
            const riesgoDiferente = Math.abs(Number(referencia.puntaje_riesgo) - Number(respuesta.puntaje_riesgo));
            const riesgoRelevante = riesgoDiferente >= DIFERENCIA_RIESGO_RELEVANTE;
            const costoReferenciaPerfil = (referencia.segmentos || []).reduce(
              (total, segmento) => total + calcularCostoArista(segmento, PERFILES_RUTA[perfil]),
              0,
            );
            return {
              perfil_referencia: referencia.perfil_ruta,
              misma_secuencia: mismaSecuencia,
              distancia_compartida_metros: corredores.distancia_compartida_metros,
              similitud_corredor: corredores.similitud,
              diferencia_distancia_metros: Number(respuesta.distancia_metros) - Number(referencia.distancia_metros),
              diferencia_riesgo: Number(respuesta.puntaje_riesgo) - Number(referencia.puntaje_riesgo),
              diferencia_costo_perfil: Number(camino.costoTotal) - costoReferenciaPerfil,
              diferencia_riesgo_relevante: riesgoRelevante,
              similitud_excesiva: corredores.similitud >= UMBRAL_SIMILITUD_CORREDOR,
            };
          });
          const mismaSecuencia = comparaciones.some((item) => item.misma_secuencia);
          const similitudExcesiva = comparaciones.some((item) => item.similitud_excesiva && !item.diferencia_riesgo_relevante);
          const excepcionRiesgo = comparaciones.some((item) => item.similitud_excesiva && item.diferencia_riesgo_relevante);
          diagnosticoCandidatos.push({
            nodos_ruta: respuesta.nodos_ruta,
            costo_perfil: camino.costoTotal,
            distancia_metros: respuesta.distancia_metros,
            puntaje_riesgo: respuesta.puntaje_riesgo,
            comparaciones,
            aceptado: !equivalente && !dominadaPorOtra,
            seleccionado: false,
            motivo: equivalente
              ? (mismaSecuencia ? "secuencia_identica" : "similitud_corredor_excesiva")
              : dominadaPorOtra
                ? "dominada_en_distancia_y_riesgo"
                : excepcionRiesgo
                  ? "aceptada_por_diferencia_relevante_de_riesgo"
                  : "aceptada_como_alternativa_no_redundante",
            filtro_costo_no_aplicado: true,
            costo_no_competitivo_es_criterio_de_descarte: false,
          });
        }
        if (equivalente || dominadaPorOtra) continue;
        if (!rutaSeleccionada) {
          rutaSeleccionada = respuesta;
          metodo = "yen_astar_min_heap";
          if (diagnosticoRutasActivo) {
            diagnosticoCandidatos[diagnosticoCandidatos.length - 1].seleccionado = true;
          } else {
            break;
          }
        } else if (diagnosticoRutasActivo) {
          diagnosticoCandidatos[diagnosticoCandidatos.length - 1].motivo =
            "alternativa_aceptable_no_seleccionada_limite_una_por_perfil";
        }
      }
      if (diagnosticoRutasActivo) {
        const firmasDentroDelLimite = new Set(
          resultadoYen.caminos.slice(1).map((camino) => firmaRuta(camino.nodosRuta)),
        );
        const fueraDelLimite = (resultadoYen.caminosCandidatosUnicos || [])
          .filter((camino) => !firmasDentroDelLimite.has(firmaRuta(camino.nodosRuta)))
          .map((camino) => ({
            nodos_ruta: camino.nodosRuta,
            costo_perfil: camino.costoTotal,
            evaluado_por_filtro: false,
            aceptado: null,
            seleccionado: false,
            motivo: "fuera_del_maximo_de_cinco_caminos_yen",
          }));
        const comparacionesIniciales = seleccionadas.map((referencia) => {
          const corredores = compararCorredores(referencia, rutaBase);
          const costoReferenciaPerfil = (referencia.segmentos || []).reduce(
            (total, segmento) => total + calcularCostoArista(segmento, PERFILES_RUTA[perfil]),
            0,
          );
          return {
            perfil_referencia: referencia.perfil_ruta,
            misma_secuencia: firmaRuta(referencia.nodos_ruta) === firmaRuta(rutaBase.nodos_ruta),
            distancia_compartida_metros: corredores.distancia_compartida_metros,
            similitud_corredor: corredores.similitud,
            diferencia_distancia_metros: Number(rutaBase.distancia_metros) - Number(referencia.distancia_metros),
            diferencia_riesgo: Number(rutaBase.puntaje_riesgo) - Number(referencia.puntaje_riesgo),
            diferencia_costo_perfil: Number(base.resultado.costoTotal) - costoReferenciaPerfil,
          };
        });
        diagnosticosYenPorPerfil[perfil] = {
          ruta_inicial: {
            nodos_ruta: rutaBase.nodos_ruta,
            distancia_metros: rutaBase.distancia_metros,
            puntaje_riesgo: rutaBase.puntaje_riesgo,
            costo_perfil: base.resultado.costoTotal,
            redundante: redundante,
            dominada,
            comparaciones: comparacionesIniciales,
          },
          metricas: metricasYen,
          candidatos: diagnosticoCandidatos,
          candidatos_unicos_fuera_del_limite: fueraDelLimite,
        };
      }
    }

    if (rutaSeleccionada) {
      rutaSeleccionada.es_ruta_principal = perfil === perfilPrincipal;
      rutaSeleccionada.metodo_generacion = metodo;
      seleccionadas.push(rutaSeleccionada);
      estadoPorPerfil[perfil] = {
        estado: "preparada",
        metodo,
        tiempo_busqueda_ms: base.tiempoBusquedaMs,
        candidatos_yen_evaluados: metricasYen.candidatosEvaluados,
        ...(diagnosticoRutasActivo ? {
          candidatos_yen_generados: metricasYen.candidatosGenerados ?? metricasYen.candidatosEvaluados,
          candidatos_yen_unicos: metricasYen.candidatosUnicos ?? metricasYen.candidatosEvaluados,
          candidatos_yen_duplicados: metricasYen.candidatosDuplicados ?? 0,
        } : {}),
        busquedas_yen: metricasYen.busquedasDesviacion,
        ruta_inicial_redundante: redundante,
        ruta_inicial_dominada: dominada,
      };
    } else {
      estadoPorPerfil[perfil] = {
        estado: "sin_alternativa_aceptable",
        metodo: activacionesYen ? "yen_astar_min_heap" : "astar_min_heap",
        tiempo_busqueda_ms: base.tiempoBusquedaMs,
        candidatos_yen_evaluados: metricasYen.candidatosEvaluados,
        ...(diagnosticoRutasActivo ? {
          candidatos_yen_generados: metricasYen.candidatosGenerados ?? metricasYen.candidatosEvaluados,
          candidatos_yen_unicos: metricasYen.candidatosUnicos ?? metricasYen.candidatosEvaluados,
          candidatos_yen_duplicados: metricasYen.candidatosDuplicados ?? 0,
        } : {}),
        busquedas_yen: metricasYen.busquedasDesviacion,
        ruta_inicial_redundante: redundante,
        ruta_inicial_dominada: dominada,
      };
    }
  }

  const inicioDiversidad = performance.now();
  const diversidad = [];
  for (let i = 0; i < seleccionadas.length; i += 1) {
    for (let j = i + 1; j < seleccionadas.length; j += 1) {
      const a = seleccionadas[i];
      const b = seleccionadas[j];
      const comparacion = compararCorredores(a, b);
      diversidad.push({
        perfil_a: a.perfil_ruta,
        perfil_b: b.perfil_ruta,
        secuencias_iguales: firmaRuta(a.nodos_ruta) === firmaRuta(b.nodos_ruta),
        distancia_compartida_metros: comparacion.distancia_compartida_metros,
        similitud_corredor: comparacion.similitud,
        diferencia_riesgo: Math.abs(a.puntaje_riesgo - b.puntaje_riesgo),
      });
    }
  }
  const tiempoFiltradoDiversidadMs = performance.now() - inicioDiversidad;
  const tiempoTotalMs = performance.now() - inicioTotal;
  const mensaje = seleccionadas.length === 0
    ? "No fue posible encontrar una ruta peatonal entre los puntos seleccionados."
    : seleccionadas.length < Object.keys(PERFILES_RUTA).length
      ? `Se prepararon ${seleccionadas.length} rutas distintas; no se forzaron recorridos redundantes.`
      : null;

  return {
    encontrada: seleccionadas.length > 0,
    cantidad_rutas: seleccionadas.length,
    perfil_principal: perfilPrincipal,
    rutas: seleccionadas,
    estado_generacion_por_perfil: estadoPorPerfil,
    diversidad,
    generacion: {
      estrategia: "astar_min_heap_workers_yen_condicional",
      max_rutas: Object.keys(PERFILES_RUTA).length,
      metricas: {
        tiempo_preparacion_grafo_riesgo_ms: tiempoPreparacionGrafoRiesgoMs,
        tiempo_seleccion_nodos_ms: tiempoSeleccionNodosMs,
        tiempo_construccion_adyacencia_ms: tiempoAdyacenciaMs,
        tiempo_transferencia_contexto_workers_ms: lote.metricas.tiempoTransferenciaContextoMs,
        tiempo_espera_cola_workers_ms: lote.metricas.tiempoEsperaColaMs,
        tiempo_lote_busquedas_iniciales_ms: tiempoLoteBusquedasMs,
        tiempo_busqueda_perfil_principal_ms: tiempoPerfilPrincipalMs,
        tiempo_busquedas_perfiles_secundarios_ms: tiempoPerfilesSecundariosMs,
        tiempo_pared_perfiles_secundarios_ms: tiempoParedPerfilesSecundariosMs,
        tiempo_generacion_yen_ms: tiempoGeneracionYenMs,
        tiempo_filtrado_diversidad_ms: tiempoFiltradoDiversidadMs + tiempoEvaluacionAlternativasMs,
        tiempo_conversion_rutas_ms: tiempoConstruccionRutasMs,
        tiempo_total_respuesta_ms: tiempoTotalMs,
        ...(diagnosticoRutasActivo ? {
          tiempo_arranque_workers_ms: lote.metricas.tiempoArranqueWorkersMs,
          tiempo_round_trip_workers_ms: lote.metricas.tiempoRoundTripWorkersMs,
          trabajos_workers: lote.metricas.detalleTrabajos,
          tiempo_evaluacion_candidatos_ms: tiempoEvaluacionAlternativasMs,
          tiempos_construccion_rutas_por_etapa_ms: tiemposConstruccionPorEtapa,
          diagnostico_yen_por_perfil: diagnosticosYenPorPerfil,
        } : {}),
      },
      yen: {
        max_candidatos_por_perfil: YEN_MAX_CANDIDATOS,
        max_busquedas_desviacion_por_perfil: YEN_MAX_BUSQUEDAS_DESVIACION,
        activaciones: activacionesYen,
        candidatos_evaluados: candidatosYenEvaluados,
        busquedas_desviacion: busquedasYen,
      },
    },
    grafo: {
      cantidad_nodos: grafo.nodos.length,
      cantidad_aristas: grafo.aristas.length,
      fuente: "supabase",
      carga_unica: true,
    },
    ...(mensaje ? { mensaje } : {}),
  };
};

module.exports = {
  calcularRutaSegura,
  calcularRutasAlternativas,
  construirBboxRuta,
  distanciaHaversine,
  construirAdyacencia,
  calcularCostoArista,
  heuristicaAStar,
  obtenerGrafoRuta,
  obtenerNodoMasCercanoEnGrafo,
  calcularResumenRuta,
  construirGeometriaRuta,
  filtrarRutasAlternativas,
  compararCorredores,
  sonRutasEquivalentes,
  obtenerDiagnosticoCorredores,
  generarCaminosYen,
};
