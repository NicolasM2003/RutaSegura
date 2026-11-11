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
  };
};

const {
  interpretarRutasAlternativas,
} = require("../services/ia/interpretacion-rutas.service");

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
  try {
    const parametros = obtenerParametrosRuta(req);

    const resultado = await calcularRutasAlternativas(
      parametros
    );

    // Si no hay rutas, no se llama a OpenAI.
    if (
      !resultado.encontrada ||
      !Array.isArray(resultado.rutas) ||
      resultado.rutas.length === 0
    ) {
      return res.json(resultado);
    }

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

      return res.json({
        ...resultado,
        interpretacion_ia: {
          disponible: true,
          ...interpretacion,
        },
      });
    } catch (error) {
      console.error(
        "ERROR - Interpretación IA de rutas:",
        error.message
      );

      // Conservamos las rutas aunque falle la IA.
      return res.json({
        ...resultado,
        interpretacion_ia: {
          disponible: false,
          mensaje:
            "No fue posible generar la recomendación automática. Las rutas calculadas siguen disponibles.",
        },
      });
    }
  } catch (error) {
    console.error(
      "ERROR - Cálculo de rutas alternativas:",
      error
    );

    return res.status(400).json({
      error: error.message,
    });
  }
};

module.exports = {
  obtenerRuta,
  obtenerRutasAlternativas,
};