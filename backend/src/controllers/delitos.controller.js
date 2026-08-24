const delitosService = require("../services/delitos.service");

const obtenerDelitos = async (req, res) => {
  try {
    const delitos = await delitosService.obtenerDelitos();

    const resultado = delitos.map((delito) => ({
      id: delito.id,
      fecha: delito.fecha,
      rango_horario: delito.rango_horario,
      clasificacion: delito.clasificaciones?.nombre ?? null,
      familia_delito: delito.grupos_delitos?.familias_delitos?.nombre ?? null,
      grupo_delito: delito.grupos_delitos?.nombre ?? null,
      lugar: delito.lugares?.nombre ?? null,
      comuna: delito.comunas?.nombre ?? null,
      region: delito.comunas?.regiones?.nombre ?? null,
      latitud: delito.latitud,
      longitud: delito.longitud,
      fuente: delito.fuentes?.nombre ?? null,
    }));

    return res.status(200).json({
      data: resultado,
      total: resultado.length,
    });
  } catch (error) {
    console.error("Error al obtener delitos:", error);

    return res.status(500).json({
      error: "No fue posible obtener los delitos.",
    });
  }
};

module.exports = {
  obtenerDelitos,
};