const {
  HIGHWAY_VALIDOS,
  HIGHWAY_EXCLUIDOS,
  HIGHWAY_EXCLUSIVOS_PEATONALES,
  HIGHWAY_COMPARTIDOS,
  HIGHWAY_ACCESO_PEATONAL_EXPLICITO,
  FOOT_PERMITIDOS,
} = require("../config/red-peatonal.config");

const supabase = require("../config/supabase");

const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";

const GRUPOS_HIGHWAYS = [
  [
    "footway",
    "pedestrian",
    "path",
    "steps",
  ],
  [
    "cycleway",
    "track",
    "living_street",
    "residential",
  ],
  [
    "unclassified",
    "service",
    "tertiary",
  ],
  [
    "secondary",
    "primary",
  ],
];

const DELAY_ENTRE_CONSULTAS_MS = 1200;

const OVERPASS_TIMEOUT_SEGUNDOS = 60;

const MAX_REINTENTOS = 2;

const CACHE_TTL_MS =
  24 * 60 * 60 * 1000;

const SUPABASE_PAGE_SIZE = 1000;

const SUPABASE_INSERT_CHUNK_SIZE = 500;

/*
 * ==========================================================
 * CACHE EN MEMORIA
 * ==========================================================
 */

const cacheRedPeatonal =
  new Map();

const esperar = (milisegundos) =>
  new Promise((resolve) =>
    setTimeout(resolve, milisegundos)
  );

/*
 * ==========================================================
 * REGLAS PEATONALES
 * ==========================================================
 */

const obtenerCategoriaPeatonal = (
  tipo,
  tags = {}
) => {
  if (
    HIGHWAY_EXCLUSIVOS_PEATONALES.includes(
      tipo
    )
  ) {
    return "exclusiva";
  }

  if (
    HIGHWAY_COMPARTIDOS.includes(tipo)
  ) {
    if (
      tags.sidewalk &&
      tags.sidewalk !== "no"
    ) {
      return "compartida_con_acera";
    }

    return "compartida";
  }

  if (
    HIGHWAY_ACCESO_PEATONAL_EXPLICITO.includes(
      tipo
    ) &&
    FOOT_PERMITIDOS.includes(tags.foot)
  ) {
    return "compartida";
  }

  return "no_definida";
};

const esPeatonalmenteUtilizable = (
  tipo,
  tags = {}
) => {
  if (
    tags.foot === "no" ||
    tags.access === "no" ||
    tags.access === "private"
  ) {
    return false;
  }

  if (
    HIGHWAY_EXCLUIDOS.includes(tipo)
  ) {
    return false;
  }

  if (
    HIGHWAY_EXCLUSIVOS_PEATONALES.includes(
      tipo
    )
  ) {
    return true;
  }

  if (
    HIGHWAY_ACCESO_PEATONAL_EXPLICITO.includes(
      tipo
    )
  ) {
    return FOOT_PERMITIDOS.includes(
      tags.foot
    );
  }

  if (
    HIGHWAY_COMPARTIDOS.includes(tipo)
  ) {
    return true;
  }

  return false;
};

/*
 * ==========================================================
 * DISTANCIAS
 * ==========================================================
 */

const calcularDistanciaMetros = (
  puntoA,
  puntoB
) => {
  const radioTierra = 6371000;

  const lat1 =
    (Number(puntoA.latitud) *
      Math.PI) /
    180;

  const lat2 =
    (Number(puntoB.latitud) *
      Math.PI) /
    180;

  const diferenciaLatitud =
    ((Number(puntoB.latitud) -
      Number(puntoA.latitud)) *
      Math.PI) /
    180;

  const diferenciaLongitud =
    ((Number(puntoB.longitud) -
      Number(puntoA.longitud)) *
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

  return radioTierra * c;
};

const calcularLongitudTotal = (
  geometria
) => {
  let distancia = 0;

  for (
    let i = 0;
    i < geometria.length - 1;
    i++
  ) {
    distancia +=
      calcularDistanciaMetros(
        geometria[i],
        geometria[i + 1]
      );
  }

  return Number(
    distancia.toFixed(2)
  );
};

/*
 * ==========================================================
 * CACHE
 * ==========================================================
 */

const obtenerClaveCache = (
  comuna
) => {
  return comuna
    ? comuna.trim().toLowerCase()
    : "bbox";
};

const obtenerCacheComuna = (
  comuna
) => {
  const clave =
    obtenerClaveCache(comuna);

  if (
    !cacheRedPeatonal.has(
      clave
    )
  ) {
    cacheRedPeatonal.set(
      clave,
      new Map()
    );
  }

  return cacheRedPeatonal.get(
    clave
  );
};

const cacheEstaVigente = (
  entrada
) => {
  if (!entrada) {
    return false;
  }

  return (
    Date.now() -
      entrada.fecha <
    CACHE_TTL_MS
  );
};

/*
 * ==========================================================
 * BBOX
 * ==========================================================
 */

const normalizarBbox = (
  bbox
) => {
  if (!bbox) {
    return null;
  }

  if (typeof bbox === "object") {
    const minLat = Number(
      bbox.minLat
    );

    const minLon = Number(
      bbox.minLon
    );

    const maxLat = Number(
      bbox.maxLat
    );

    const maxLon = Number(
      bbox.maxLon
    );

    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(minLon) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(maxLon)
    ) {
      throw new Error(
        "BBOX inválido. Todos sus valores deben ser numéricos."
      );
    }

    if (
      minLat >= maxLat ||
      minLon >= maxLon
    ) {
      throw new Error(
        "BBOX inválido. Los mínimos deben ser menores que los máximos."
      );
    }

    return {
      minLat,
      minLon,
      maxLat,
      maxLon,
    };
  }

  const valores =
    String(bbox)
      .split(",")
      .map((valor) =>
        Number(valor.trim())
      );

  if (
    valores.length !== 4
  ) {
    throw new Error(
      "BBOX inválido. Formato esperado: minLat,minLon,maxLat,maxLon"
    );
  }

  const [
    minLat,
    minLon,
    maxLat,
    maxLon,
  ] = valores;

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(minLon) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(maxLon)
  ) {
    throw new Error(
      "BBOX inválido. Todos sus valores deben ser numéricos."
    );
  }

  if (
    minLat >= maxLat ||
    minLon >= maxLon
  ) {
    throw new Error(
      "BBOX inválido. Los mínimos deben ser menores que los máximos."
    );
  }

  return {
    minLat,
    minLon,
    maxLat,
    maxLon,
  };
};

const puntoDentroBbox = (
  punto,
  bbox
) => {
  return (
    punto.latitud >=
      bbox.minLat &&
    punto.latitud <=
      bbox.maxLat &&
    punto.longitud >=
      bbox.minLon &&
    punto.longitud <=
      bbox.maxLon
  );
};

const segmentoDentroBbox = (
  segmento,
  bbox
) => {
  if (
    !Array.isArray(
      segmento.geometria
    ) ||
    !segmento.geometria.length
  ) {
    return false;
  }

  if (
    segmento.geometria.some(
      (punto) =>
        puntoDentroBbox(
          punto,
          bbox
        )
    )
  ) {
    return true;
  }

  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;

  for (
    const punto of
      segmento.geometria
  ) {
    const latitud =
      Number(
        punto.latitud
      );

    const longitud =
      Number(
        punto.longitud
      );

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud)
    ) {
      continue;
    }

    minLat = Math.min(
      minLat,
      latitud
    );

    minLon = Math.min(
      minLon,
      longitud
    );

    maxLat = Math.max(
      maxLat,
      latitud
    );

    maxLon = Math.max(
      maxLon,
      longitud
    );
  }

  if (
    minLat === Infinity ||
    minLon === Infinity
  ) {
    return false;
  }

  return !(
    maxLat < bbox.minLat ||
    minLat > bbox.maxLat ||
    maxLon < bbox.minLon ||
    minLon > bbox.maxLon
  );
};

const filtrarPorBbox = (
  segmentos,
  bbox
) => {
  if (!bbox) {
    return segmentos;
  }

  return segmentos.filter(
    (segmento) =>
      segmentoDentroBbox(
        segmento,
        bbox
      )
  );
};

/*
 * ==========================================================
 * BBOX DE GEOMETRÍA
 * ==========================================================
 */

const calcularBboxGeometria = (
  geometria
) => {
  if (
    !Array.isArray(geometria) ||
    !geometria.length
  ) {
    return null;
  }

  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;

  for (
    const punto of geometria
  ) {
    const latitud =
      Number(
        punto.latitud
      );

    const longitud =
      Number(
        punto.longitud
      );

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud)
    ) {
      continue;
    }

    minLat = Math.min(
      minLat,
      latitud
    );

    minLon = Math.min(
      minLon,
      longitud
    );

    maxLat = Math.max(
      maxLat,
      latitud
    );

    maxLon = Math.max(
      maxLon,
      longitud
    );
  }

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(minLon) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(maxLon)
  ) {
    return null;
  }

  return {
    minLat,
    minLon,
    maxLat,
    maxLon,
  };
};

/*
 * ==========================================================
 * SUPABASE
 * ==========================================================
 */

/*
 * Convierte un segmento al formato
 * utilizado por la tabla red_peatonal.
 */
const prepararSegmentoParaSupabase = (
  segmento
) => {
  const bbox =
    calcularBboxGeometria(
      segmento.geometria
    );

  if (!bbox) {
    return null;
  }

  return {
    id_osm:
      String(segmento.id_osm),

    comuna:
      segmento.comuna || null,

    nombre:
      segmento.nombre ?? null,

    tipo:
      segmento.tipo ?? null,

    categoria_peatonal:
      segmento.categoria_peatonal ??
      null,

    superficie:
      segmento.superficie ?? null,

    acceso_peatonal:
      segmento.acceso_peatonal ??
      null,

    sidewalk:
      segmento.sidewalk ?? null,

    footway:
      segmento.footway ?? null,

    crossing:
      segmento.crossing ?? null,

    smoothness:
      segmento.smoothness ?? null,

    incline:
      segmento.incline ?? null,

    wheelchair:
      segmento.wheelchair ?? null,

    width:
      segmento.width ?? null,

    step_count:
      segmento.step_count ?? null,

    maxspeed:
      segmento.maxspeed ?? null,

    motorroad:
      segmento.motorroad ?? null,

    nodo_inicio:
      segmento.nodo_inicio ?? null,

    nodo_fin:
      segmento.nodo_fin ?? null,

    geometria:
      segmento.geometria,

    cantidad_nodos:
      segmento.cantidad_nodos ??
      null,

    longitud_metros:
      segmento.longitud_metros ??
      null,

    bbox_min_lat:
      bbox.minLat,

    bbox_min_lon:
      bbox.minLon,

    bbox_max_lat:
      bbox.maxLat,

    bbox_max_lon:
      bbox.maxLon,

    updated_at:
      new Date().toISOString(),
  };
};

/*
 * Busca todos los segmentos de una comuna
 * en Supabase utilizando paginación.
 */
const obtenerTodosDesdeSupabase = async (
  comuna
) => {
  if (!comuna) {
    return [];
  }

  const segmentos = [];
  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase
        .from("red_peatonal")
        .select("*")
        .eq("comuna", comuna)
        .order("id_osm", {
          ascending: true,
        })
        .range(
          offset,
          offset +
            SUPABASE_PAGE_SIZE -
            1
        );

    if (error) {
      throw new Error(
        `Error consultando Supabase: ${error.message}`
      );
    }

    if (
      !data ||
      data.length === 0
    ) {
      break;
    }

    segmentos.push(
      ...data
    );

    if (
      data.length <
      SUPABASE_PAGE_SIZE
    ) {
      break;
    }

    offset +=
      SUPABASE_PAGE_SIZE;
  }

  return segmentos.map(
    convertirSegmentoDesdeSupabase
  );
};

/*
 * Busca solamente los segmentos que
 * intersectan el BBOX.
 */
const obtenerBboxDesdeSupabase = async (
  comuna,
  bbox
) => {
  if (
    !comuna ||
    !bbox
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("red_peatonal")
      .select("*")
      .eq("comuna", comuna)
      .lte(
        "bbox_min_lat",
        bbox.maxLat
      )
      .gte(
        "bbox_max_lat",
        bbox.minLat
      )
      .lte(
        "bbox_min_lon",
        bbox.maxLon
      )
      .gte(
        "bbox_max_lon",
        bbox.minLon
      )
      .order("id_osm", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Error consultando BBOX en Supabase: ${error.message}`
    );
  }

  return (
    data || []
  ).map(
    convertirSegmentoDesdeSupabase
  );
};

/*
 * Convierte una fila de Supabase
 * al formato que espera el frontend.
 */
const convertirSegmentoDesdeSupabase = (
  segmento
) => {
  return {
    id_osm:
      segmento.id_osm,

    nombre:
      segmento.nombre,

    comuna:
      segmento.comuna,

    tipo:
      segmento.tipo,

    categoria_peatonal:
      segmento.categoria_peatonal,

    superficie:
      segmento.superficie,

    acceso_peatonal:
      segmento.acceso_peatonal,

    sidewalk:
      segmento.sidewalk,

    footway:
      segmento.footway,

    crossing:
      segmento.crossing,

    smoothness:
      segmento.smoothness,

    incline:
      segmento.incline,

    wheelchair:
      segmento.wheelchair,

    width:
      segmento.width,

    step_count:
      segmento.step_count,

    maxspeed:
      segmento.maxspeed,

    motorroad:
      segmento.motorroad,

    nodo_inicio:
      segmento.nodo_inicio,

    nodo_fin:
      segmento.nodo_fin,

    geometria:
      Array.isArray(
        segmento.geometria
      )
        ? segmento.geometria
        : [],

    cantidad_nodos:
      segmento.cantidad_nodos,

    longitud_metros:
      Number(
        segmento.longitud_metros
      ),
  };
};

/*
 * Determina si Supabase tiene datos
 * suficientes para la comuna.
 */
const obtenerRedDesdeSupabase = async (
  comuna,
  bbox
) => {
  if (!comuna) {
    return [];
  }

  try {
    if (bbox) {
      const segmentos =
        await obtenerBboxDesdeSupabase(
          comuna,
          bbox
        );

      if (
        segmentos.length > 0
      ) {
        console.log(
          `SUPABASE HIT - ${comuna} - BBOX: ${segmentos.length} segmentos`
        );

        return {
          encontrada: true,
          segmentos,
        };
      }

      /*
       * Puede significar que el BBOX
       * realmente no contiene segmentos.
       *
       * Verificamos si la comuna tiene
       * datos antes de decidir consultar
       * Overpass.
       */
      const todos =
        await obtenerTodosDesdeSupabase(
          comuna
        );

      if (
        todos.length > 0
      ) {
        console.log(
          `SUPABASE HIT - ${comuna}: BBOX sin segmentos`
        );

        return {
          encontrada: true,
          segmentos:
            filtrarPorBbox(
              todos,
              bbox
            ),
        };
      }

      return {
        encontrada: false,
        segmentos: [],
      };
    }

    const segmentos =
      await obtenerTodosDesdeSupabase(
        comuna
      );

    if (
      segmentos.length > 0
    ) {
      console.log(
        `SUPABASE HIT - ${comuna}: ${segmentos.length} segmentos`
      );

      return {
        encontrada: true,
        segmentos,
      };
    }

    return {
      encontrada: false,
      segmentos: [],
    };
  } catch (error) {
    console.warn(
      `Advertencia consultando Supabase para ${comuna}:`,
      error.message
    );

    return {
      encontrada: false,
      segmentos: [],
    };
  }
};

/*
 * Guarda segmentos en Supabase
 * por lotes para no enviar un payload
 * demasiado grande.
 */
const guardarEnSupabase = async (
  segmentos
) => {
  if (
    !Array.isArray(segmentos) ||
    segmentos.length === 0
  ) {
    return;
  }

  const segmentosPreparados =
    segmentos
      .map(
        prepararSegmentoParaSupabase
      )
      .filter(Boolean);

  for (
    let i = 0;
    i <
    segmentosPreparados.length;
    i +=
      SUPABASE_INSERT_CHUNK_SIZE
  ) {
    const lote =
      segmentosPreparados.slice(
        i,
        i +
          SUPABASE_INSERT_CHUNK_SIZE
      );

    const {
      error,
    } =
      await supabase
        .from("red_peatonal")
        .upsert(
          lote,
          {
            onConflict:
              "id_osm,comuna",
          }
        );

    if (error) {
      throw new Error(
        `Error guardando red peatonal en Supabase: ${error.message}`
      );
    }

    console.log(
      `SUPABASE GUARDADO - ${lote.length} segmentos`
    );
  }
};

/*
 * ==========================================================
 * OVERPASS
 * ==========================================================
 */

const ejecutarConsultaOverpass = async (
  consulta,
  descripcion = ""
) => {
  let ultimoError = null;

  for (
    let intento = 0;
    intento <= MAX_REINTENTOS;
    intento++
  ) {
    try {
      const respuesta =
        await fetch(
          OVERPASS_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",

              "User-Agent":
                "RutaSegura/1.0 (proyecto universitario de seguridad peatonal)",

              Accept:
                "application/json",
            },

            body:
              `data=${encodeURIComponent(
                consulta
              )}`,
          }
        );

      if (respuesta.ok) {
        return await respuesta.json();
      }

      const detalle =
        await respuesta.text();

      console.error(
        `Respuesta de Overpass HTTP ${respuesta.status}${
          descripcion
            ? ` (${descripcion})`
            : ""
        }:`
      );

      console.error(
        detalle
      );

      const erroresReintentables = [
        429,
        500,
        502,
        503,
        504,
      ];

      const esReintentable =
        erroresReintentables.includes(
          respuesta.status
        );

      ultimoError =
        new Error(
          `Overpass respondió con HTTP ${
            respuesta.status
          }${
            descripcion
              ? ` (${descripcion})`
              : ""
          }. ${detalle.slice(
            0,
            1500
          )}`
        );

      if (
        !esReintentable ||
        intento === MAX_REINTENTOS
      ) {
        throw ultimoError;
      }

      const espera =
        2000 * (intento + 1);

      console.warn(
        `Reintentando Overpass ${
          intento + 1
        }/${MAX_REINTENTOS} en ${
          espera
        } ms`
      );

      await esperar(
        espera
      );
    } catch (error) {
      if (
        error?.message?.includes(
          "Overpass respondió con HTTP"
        )
      ) {
        ultimoError = error;

        if (
          intento ===
          MAX_REINTENTOS
        ) {
          throw error;
        }

        continue;
      }

      throw error;
    }
  }

  throw (
    ultimoError ||
    new Error(
      "No fue posible consultar Overpass."
    )
  );
};

/*
 * ==========================================================
 * CONSULTA OVERPASS
 * ==========================================================
 */

const construirConsulta = (
  highways,
  comuna
) => {
  const expresionHighway =
    highways.join("|");

  if (comuna) {
    return `
      [out:json][timeout:${OVERPASS_TIMEOUT_SEGUNDOS}];

      area[
        "name"="${comuna}"
      ][
        "boundary"="administrative"
      ][
        "admin_level"="8"
      ]->.comuna;

      way(area.comuna)
        ["highway"~"^(${expresionHighway})$"];

      out body geom;
    `;
  }

  return `
    [out:json][timeout:${OVERPASS_TIMEOUT_SEGUNDOS}];

    way(
      -33.18,
      -71.70,
      -32.90,
      -71.35
    )["highway"~"^(${expresionHighway})$"];

    out body geom;
  `;
};

/*
 * ==========================================================
 * TRANSFORMAR SEGMENTOS
 * ==========================================================
 */

const transformarSegmentos = (
  elementos,
  comuna
) => {
  return (
    elementos || []
  )
    .filter(
      (elemento) =>
        elemento.type === "way" &&
        Array.isArray(
          elemento.geometry
        ) &&
        Array.isArray(
          elemento.nodes
        ) &&
        elemento.geometry.length >= 2 &&
        elemento.nodes.length ===
          elemento.geometry.length
    )
    .filter(
      (elemento) =>
        esPeatonalmenteUtilizable(
          elemento.tags?.highway,
          elemento.tags || {}
        )
    )
    .map((elemento) => {
      const tipo =
        elemento.tags?.highway ??
        null;

      const tags =
        elemento.tags || {};

      const geometria =
        elemento.geometry.map(
          (punto, indice) => ({
            nodo_id:
              String(
                elemento.nodes[
                  indice
                ]
              ),

            latitud:
              Number(
                punto.lat
              ),

            longitud:
              Number(
                punto.lon
              ),
          })
        );

      const nodoInicio =
        geometria[0];

      const nodoFin =
        geometria[
          geometria.length - 1
        ];

      return {
        id_osm:
          String(elemento.id),

        nombre:
          tags.name ?? null,

        comuna:
          comuna ?? null,

        tipo,

        categoria_peatonal:
          obtenerCategoriaPeatonal(
            tipo,
            tags
          ),

        superficie:
          tags.surface ?? null,

        acceso_peatonal:
          tags.foot ??
          tags.access ??
          null,

        sidewalk:
          tags.sidewalk ?? null,

        footway:
          tags.footway ?? null,

        crossing:
          tags.crossing ?? null,

        smoothness:
          tags.smoothness ?? null,

        incline:
          tags.incline ?? null,

        wheelchair:
          tags.wheelchair ?? null,

        width:
          tags.width ?? null,

        step_count:
          tags.step_count
            ? Number(
                tags.step_count
              )
            : null,

        maxspeed:
          tags.maxspeed ?? null,

        motorroad:
          tags.motorroad ?? null,

        nodo_inicio:
          nodoInicio.nodo_id,

        nodo_fin:
          nodoFin.nodo_id,

        geometria,

        cantidad_nodos:
          geometria.length,

        longitud_metros:
          calcularLongitudTotal(
            geometria
          ),
      };
    });
};

/*
 * ==========================================================
 * CARGAR GRUPO DESDE OVERPASS
 * ==========================================================
 */

const obtenerGrupoDesdeOverpass = async ({
  grupo,
  indiceGrupo,
  comuna,
}) => {
  const cacheComuna =
    obtenerCacheComuna(
      comuna
    );

  const entradaCache =
    cacheComuna.get(
      indiceGrupo
    );

  if (
    cacheEstaVigente(
      entradaCache
    )
  ) {
    console.log(
      `CACHÉ HIT - ${
        comuna || "BBOX"
      } - grupo ${
        indiceGrupo + 1
      }/${GRUPOS_HIGHWAYS.length}: ${
        entradaCache.segmentos.length
      } segmentos`
    );

    return entradaCache.segmentos;
  }

  console.log(
    `CACHÉ MISS - ${
      comuna || "BBOX"
    } - grupo ${
      indiceGrupo + 1
    }/${GRUPOS_HIGHWAYS.length}`
  );

  const consulta =
    construirConsulta(
      grupo,
      comuna
    );

  try {
    const resultado =
      await ejecutarConsultaOverpass(
        consulta,
        `${
          comuna || "BBOX"
        } / grupo ${
          indiceGrupo + 1
        } de ${
          GRUPOS_HIGHWAYS.length
        }`
      );

    const segmentos =
      transformarSegmentos(
        resultado.elements || [],
        comuna
      );

    cacheComuna.set(
      indiceGrupo,
      {
        segmentos,
        fecha: Date.now(),
      }
    );

    console.log(
      `CACHÉ GUARDADO - ${
        comuna || "BBOX"
      } - grupo ${
        indiceGrupo + 1
      }/${
        GRUPOS_HIGHWAYS.length
      }: ${
        segmentos.length
      } segmentos`
    );

    return segmentos;
  } catch (error) {
    throw new Error(
      `No se pudo cargar la red peatonal de ${
        comuna || "la Región"
      }. Falló el grupo ${
        indiceGrupo + 1
      }/${
        GRUPOS_HIGHWAYS.length
      }: ${
        error.message
      }`
    );
  }
};

/*
 * ==========================================================
 * OBTENER RED PEATONAL
 * ==========================================================
 */

const obtenerRedPeatonal = async ({
  highway,
  comuna,
  bbox,
} = {}) => {
  const bboxNormalizado =
    normalizarBbox(
      bbox
    );

  /*
   * ========================================================
   * HIGHWAY ESPECÍFICO
   * ========================================================
   */

  if (highway) {
    if (
      !HIGHWAY_VALIDOS.includes(
        highway
      )
    ) {
      throw new Error(
        `Tipo de highway no permitido: ${highway}`
      );
    }

    /*
     * Para highway específico mantenemos
     * el comportamiento actual.
     */

    const cacheComuna =
      obtenerCacheComuna(
        comuna
      );

    const claveCache =
      `highway:${highway}`;

    const entradaCache =
      cacheComuna.get(
        claveCache
      );

    let segmentos;

    if (
      cacheEstaVigente(
        entradaCache
      )
    ) {
      console.log(
        `CACHÉ HIT - ${
          comuna || "BBOX"
        } - ${highway}: ${
          entradaCache.segmentos.length
        } segmentos`
      );

      segmentos =
        entradaCache.segmentos;
    } else {
      console.log(
        `CACHÉ MISS - ${
          comuna || "BBOX"
        } - ${highway}`
      );

      const consulta =
        construirConsulta(
          [highway],
          comuna
        );

      const resultado =
        await ejecutarConsultaOverpass(
          consulta,
          `${
            comuna || "BBOX"
          } / ${highway}`
        );

      segmentos =
        transformarSegmentos(
          resultado.elements || [],
          comuna
        );

      cacheComuna.set(
        claveCache,
        {
          segmentos,
          fecha: Date.now(),
        }
      );

      /*
       * Persistimos también los highways
       * específicos si existe comuna.
       */
      if (
        comuna &&
        segmentos.length > 0
      ) {
        try {
          await guardarEnSupabase(
            segmentos
          );
        } catch (error) {
          console.warn(
            "No fue posible guardar highway específico en Supabase:",
            error.message
          );
        }
      }
    }

    return filtrarPorBbox(
      segmentos,
      bboxNormalizado
    );
  }

  /*
   * ========================================================
   * INTENTAR SUPABASE PRIMERO
   * ========================================================
   */

  if (comuna) {
    const resultadoSupabase =
      await obtenerRedDesdeSupabase(
        comuna,
        bboxNormalizado
      );

    if (
      resultadoSupabase.encontrada
    ) {
      console.log(
        `Red peatonal ${comuna}: ${resultadoSupabase.segmentos.length} segmentos ${
          bboxNormalizado
            ? "dentro del BBOX"
            : "totales"
        }`
      );

      return resultadoSupabase.segmentos;
    }
  }

  /*
   * ========================================================
   * CACHE / OVERPASS
   * ========================================================
   */

  const segmentosTodos = [];

  for (
    let i = 0;
    i < GRUPOS_HIGHWAYS.length;
    i++
  ) {
    const grupo =
      GRUPOS_HIGHWAYS[i];

    const segmentosGrupo =
      await obtenerGrupoDesdeOverpass({
        grupo,
        indiceGrupo: i,
        comuna,
      });

    segmentosTodos.push(
      ...segmentosGrupo
    );

    if (
      i <
      GRUPOS_HIGHWAYS.length - 1
    ) {
      await esperar(
        5000
      );
    }
  }

  /*
   * ========================================================
   * ELIMINAR DUPLICADOS
   * ========================================================
   */

  const mapaUnico =
    new Map();

  for (
    const segmento of
      segmentosTodos
  ) {
    mapaUnico.set(
      segmento.id_osm,
      segmento
    );
  }

  const resultado =
    Array.from(
      mapaUnico.values()
    );

  /*
   * ========================================================
   * GUARDAR EN SUPABASE
   * ========================================================
   */

  if (
    comuna &&
    resultado.length > 0
  ) {
    try {
      await guardarEnSupabase(
        resultado
      );

      console.log(
        `SUPABASE - Red peatonal ${comuna} persistida: ${resultado.length} segmentos`
      );
    } catch (error) {
      /*
       * No detenemos el endpoint si Supabase
       * falla. Overpass sigue funcionando
       * como respaldo.
       */
      console.warn(
        `No fue posible persistir la red peatonal de ${comuna} en Supabase:`,
        error.message
      );
    }
  }

  /*
   * ========================================================
   * APLICAR BBOX
   * ========================================================
   */

  const resultadoFiltrado =
    filtrarPorBbox(
      resultado,
      bboxNormalizado
    );

  console.log(
    `Red peatonal ${
      comuna || "BBOX"
    }: ${
      resultadoFiltrado.length
    } segmentos ${
      bboxNormalizado
        ? "dentro del BBOX"
        : "totales"
    }`
  );

  return resultadoFiltrado;
};

module.exports = {
  obtenerRedPeatonal,
};