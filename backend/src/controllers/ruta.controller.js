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
const obtenerRutasAlternativas = async (
  req,
  res
) => {
  try {
    const parametros =
      obtenerParametrosRuta(req);

    const resultado =
      await calcularRutasAlternativas(
        parametros
      );

    return res.json(resultado);
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