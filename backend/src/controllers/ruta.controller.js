const { performance } = require("node:perf_hooks");
const {
  calcularRutaSegura,
  calcularRutasAlternativas,
} = require("../services/ruta.service");

/*
 * Obtiene los parámetros comunes de consulta.
 */
const obtenerParametrosRuta = (req) => {
  const {
    comuna,
    origen_lat,
    origen_lon,
    destino_lat,
    destino_lon,
    rango_horario,
  } = req.query;

  return {
    comuna,

    origen: {
      latitud: Number(origen_lat),
      longitud: Number(origen_lon),
    },

    destino: {
      latitud: Number(destino_lat),
      longitud: Number(destino_lon),
    },

    rangoHorario: rango_horario,
    perfilRuta: req.query.perfil_ruta || null,
  };
};

const {
  interpretarRutasAlternativas,
} = require("../services/ia/interpretacion-rutas.service");

const diagnosticoRutasActivo =
  process.env.NODE_ENV !== "production" &&
  process.env.RUTASEGURA_DEBUG_ALGORITMOS === "true";

const responderRutasAlternativas = (req, res, resultado, inicioSolicitud, tiempos = {}) => {
  if (!diagnosticoRutasActivo || !resultado.generacion?.metricas) {
    if (resultado.generacion?.metricas) {
      resultado.generacion.metricas.tiempo_total_endpoint_ms = performance.now() - inicioSolicitud;
    }
    return res.json(resultado);
  }

  const metricas = resultado.generacion.metricas;
  const antesSerializacionMs = performance.now() - inicioSolicitud;
  const serializacionInicio = performance.now();
  const jsonInicial = JSON.stringify(resultado);
  const serializacionMs = performance.now() - serializacionInicio;
  metricas.diagnostico_endpoint = {
    tiempo_ia_ms: tiempos.tiempoIaMs || 0,
    tiempo_preparacion_respuesta_ms: tiempos.tiempoPreparacionRespuestaMs || 0,
    tiempo_antes_serializacion_ms: antesSerializacionMs,
    tiempo_serializacion_aproximado_ms: serializacionMs,
    tiempo_no_atribuido_antes_serializacion_ms: Math.max(
      0,
      antesSerializacionMs - (metricas.tiempo_total_respuesta_ms || 0) - (tiempos.tiempoIaMs || 0),
    ),
    bytes_json_aproximados: Buffer.byteLength(jsonInicial),
  };
  metricas.tiempo_total_endpoint_ms = antesSerializacionMs + serializacionMs;
  const jsonFinal = JSON.stringify(resultado);
  res.once("finish", () => {
    console.info("RUTA_ALTERNATIVAS_DIAGNOSTICO", JSON.stringify({
      tiempo_total_hasta_finish_ms: performance.now() - inicioSolicitud,
      bytes_respuesta: Buffer.byteLength(jsonFinal),
      perfil_principal: resultado.perfil_principal,
      cantidad_rutas: resultado.cantidad_rutas,
    }));
  });
  return res.status(200).type("application/json").send(jsonFinal);
};

/*
 * Endpoint existente:
 * devuelve una sola ruta.
 *
 * Se conserva para no romper la aplicación actual.
 */
const obtenerRuta = async (req, res) => {
  try {
    const parametros =
      obtenerParametrosRuta(req);

    const resultado =
      await calcularRutaSegura(parametros);

    return res.json(resultado);
  } catch (error) {
    console.error(
      "ERROR - Cálculo de ruta:",
      error
    );

    return res.status(400).json({
      error: error.message,
    });
  }
};

/*
 * Nuevo endpoint:
 * devuelve las alternativas disponibles.
 */
const obtenerRutasAlternativas = async (req, res) => {
  const inicioSolicitud = performance.now();
  const controlador = new AbortController();
  const cancelarSiClienteDesconecta = () => {
    if (!res.writableEnded) controlador.abort();
  };
  req.once("aborted", cancelarSiClienteDesconecta);
  res.once("close", cancelarSiClienteDesconecta);
  try {
    const parametros = obtenerParametrosRuta(req);

    const resultado = await calcularRutasAlternativas(
      { ...parametros, signal: controlador.signal }
    );

    // Si no hay rutas, no se llama a OpenAI.
    if (
      !resultado.encontrada ||
      !Array.isArray(resultado.rutas) ||
      resultado.rutas.length === 0
    ) {
      return responderRutasAlternativas(req, res, resultado, inicioSolicitud);
    }

    const inicioIa = performance.now();
    try {
      // La IA interpreta las alternativas ya calculadas.
      const interpretacion =
        await interpretarRutasAlternativas({
          comuna: parametros.comuna,
          origen: parametros.origen,
          destino: parametros.destino,
          rangoHorario: parametros.rangoHorario,
          resultado,
        });
      const resultadoConIa = {
        ...resultado,
        interpretacion_ia: {
          disponible: true,
          ...interpretacion,
        },
      };
      return responderRutasAlternativas(req, res, resultadoConIa, inicioSolicitud, {
        tiempoIaMs: performance.now() - inicioIa,
      });
    } catch (error) {
      const tiempoIaMs = performance.now() - inicioIa;
      console.error(
        "ERROR - Interpretación IA de rutas:",
        error.message
      );

      // Conservamos las rutas aunque falle la IA.
      const resultadoSinIa = {
        ...resultado,
        interpretacion_ia: {
          disponible: false,
          mensaje:
            "No fue posible generar la recomendación automática. Las rutas calculadas siguen disponibles.",
        },
      };
      return responderRutasAlternativas(req, res, resultadoSinIa, inicioSolicitud, { tiempoIaMs });
    }
  } catch (error) {
    if (error?.code === "BUSQUEDA_CANCELADA") return;
    console.error(
      "ERROR - Cálculo de rutas alternativas:",
      error
    );

    const status = error?.code === "BUSQUEDA_SATURADA" ? 503 : 400;
    return res.status(status).json({
      error: error.message,
    });
  } finally {
    req.off("aborted", cancelarSiClienteDesconecta);
    res.off("close", cancelarSiClienteDesconecta);
  }
};

module.exports = {
  obtenerRuta,
  obtenerRutasAlternativas,
};
