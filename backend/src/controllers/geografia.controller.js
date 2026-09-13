const {
  obtenerDatosGeograficos,
  obtenerDatosRedPeatonal,
  obtenerDatosGrafoPeatonal,
  obtenerDatosNodoCercano,
} = require("../services/geografia.service");

const obtenerGeografia = async (
  req,
  res
) => {
  try {
    const {
      comuna,
      rango_horario:
        rangoHorario,
    } = req.query;

    const datos =
      await obtenerDatosGeograficos({
        comuna,
        rangoHorario,
      });

    return res.status(200).json({
      data: datos,
      total: datos.length,
    });
  } catch (error) {
    console.error(
      "Error al obtener datos geográficos:",
      error
    );

    return res.status(500).json({
      error:
        "No fue posible obtener los datos geográficos.",
    });
  }
};

const obtenerRedPeatonalController =
  async (req, res) => {
    try {
      const {
        highway,
        comuna,
        bbox,
      } = req.query;

      const datos =
        await obtenerDatosRedPeatonal({
          highway,
          comuna,
          bbox,
        });

      return res.status(200).json({
        data: datos,
        total: datos.length,
      });
    } catch (error) {
      console.error(
        "Error al obtener red peatonal:",
        error
      );

      return res.status(500).json({
        error:
          "No fue posible obtener la red peatonal.",
      });
    }
  };

const obtenerGrafoPeatonalController =
  async (req, res) => {
    try {
      const {
        highway,
        comuna,
      } = req.query;

      const grafo =
        await obtenerDatosGrafoPeatonal({
          highway,
          comuna,
        });

      return res.status(200).json(
        grafo
      );
    } catch (error) {
      console.error(
        "Error al obtener grafo peatonal:",
        error
      );

      return res.status(500).json({
        error:
          "No fue posible obtener el grafo peatonal.",
      });
    }
  };

const obtenerNodoCercanoController =
  async (req, res) => {
    try {
      const {
        latitud,
        longitud,
        highway,
        comuna,
      } = req.query;

      if (
        latitud === undefined ||
        longitud === undefined
      ) {
        return res.status(400).json({
          error:
            "latitud y longitud son obligatorias.",
        });
      }

      const resultado =
        await obtenerDatosNodoCercano({
          latitud,
          longitud,
          highway,
          comuna,
        });

      if (!resultado) {
        return res.status(404).json({
          error:
            "No se encontró un nodo peatonal cercano.",
        });
      }

      return res.status(200).json(
        resultado
      );
    } catch (error) {
      console.error(
        "Error al buscar nodo cercano:",
        error
      );

      return res.status(500).json({
        error:
          "No fue posible encontrar el nodo cercano.",
      });
    }
  };

module.exports = {
  obtenerGeografia,
  obtenerRedPeatonalController,
  obtenerGrafoPeatonalController,
  obtenerNodoCercanoController,
};