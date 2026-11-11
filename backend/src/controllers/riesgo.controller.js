const {
  calcularRiesgoZona,
} = require("../services/riesgo-datos.service");

const {
  obtenerZonasRiesgo,
} = require("../services/zonas-riesgo.service");

const {
  obtenerRedPeatonalConRiesgo,
} = require("../services/riesgo-red.service");

const obtenerRiesgo = async (
  req,
  res
) => {
  try {
    const {
      comuna,
      rango_horario:
        rangoHorario,
    } = req.query;

    if (!comuna) {
      return res.status(400).json({
        error:
          "El parámetro comuna es obligatorio.",
      });
    }

    const resultado =
      await calcularRiesgoZona({
        comuna,
        rangoHorario,
      });

    return res.status(200).json(
      resultado
    );
  } catch (error) {
    console.error(
      "Error al calcular riesgo:",
      error
    );

    return res.status(500).json({
      error:
        "No fue posible calcular el nivel de riesgo.",
    });
  }
};

const obtenerRiesgoZonas = async (
  req,
  res
) => {
  try {
    const {
      comuna,
      rango_horario:
        rangoHorario,
    } = req.query;

    if (!comuna) {
      return res.status(400).json({
        error:
          "El parámetro comuna es obligatorio.",
      });
    }

    const zonas =
      await obtenerZonasRiesgo({
        comuna,
        rangoHorario,
      });

    return res.status(200).json({
      data: zonas,
      total: zonas.length,
      comuna,
      rango_horario:
        rangoHorario ?? null,
    });
  } catch (error) {
    console.error(
      "Error al obtener riesgo por zonas:",
      error
    );

    return res.status(500).json({
      error:
        "No fue posible obtener el riesgo de las zonas.",
    });
  }
};

const obtenerRiesgoRedPeatonal =
  async (req, res) => {
    try {
      const {
        comuna,
        rango_horario:
          rangoHorario,
        bbox,
      } = req.query;

      if (!comuna) {
        return res.status(400).json({
          error:
            "El parámetro comuna es obligatorio.",
        });
      }

      const datos =
        await obtenerRedPeatonalConRiesgo({
          comuna,
          rangoHorario,
          bbox,
        });

      return res.status(200).json({
        data: datos,
        total: datos.length,
        comuna,
        rango_horario:
          rangoHorario ?? null,
        bbox: bbox ?? null,
      });
    } catch (error) {
      console.error(
        "Error al calcular riesgo de red peatonal:",
        error
      );

      return res.status(500).json({
        error:
          "No fue posible calcular el riesgo de la red peatonal.",
      });
    }
  };

module.exports = {
  obtenerRiesgo,
  obtenerRiesgoZonas,
  obtenerRiesgoRedPeatonal,
};