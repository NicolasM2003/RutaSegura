const {
  calcularRutaSegura,
} = require("../services/ruta.service");

const obtenerRuta = async (req, res) => {
  try {
    const {
      comuna,
      origen_lat,
      origen_lon,
      destino_lat,
      destino_lon,
      rango_horario,
    } = req.query;

    const resultado = await calcularRutaSegura({
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
    });

    return res.json(resultado);
  } catch (error) {
    console.error("ERROR - Cálculo de ruta:", error);

    return res.status(400).json({
      error: error.message,
    });
  }
};

module.exports = {
  obtenerRuta,
};