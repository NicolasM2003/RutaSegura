const { calcularRiesgoZona } = require("../services/riesgo-datos.service");

const obtenerRiesgo = async (req, res) => {
  try {
    const { comuna, rango_horario: rangoHorario } = req.query;

    if (!comuna) {
      return res.status(400).json({
        error: "El parámetro comuna es obligatorio.",
      });
    }

    const resultado = await calcularRiesgoZona({
      comuna,
      rangoHorario,
      cantidadMaxima: 853,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al calcular riesgo:", error);

    return res.status(500).json({
      error: "No fue posible calcular el nivel de riesgo.",
    });
  }
};

module.exports = {
  obtenerRiesgo,
};