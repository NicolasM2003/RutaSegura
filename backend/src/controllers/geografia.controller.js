const {
  obtenerDatosGeograficos,
} = require("../services/geografia.service");

const obtenerGeografia = async (req, res) => {
  try {
    const {
      comuna,
      rango_horario: rangoHorario,
    } = req.query;

    const datos = await obtenerDatosGeograficos({
      comuna,
      rangoHorario,
    });

    return res.status(200).json({
      data: datos,
      total: datos.length,
    });
  } catch (error) {
    console.error("Error al obtener datos geográficos:", error);

    return res.status(500).json({
      error: "No fue posible obtener los datos geográficos.",
    });
  }
};

module.exports = {
  obtenerGeografia,
};