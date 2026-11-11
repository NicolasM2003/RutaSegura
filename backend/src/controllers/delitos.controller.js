const delitosService = require("../services/delitos.service");

const RANGOS_HORARIOS_VALIDOS = [
  "00:00 - 03:59",
  "04:00 - 07:59",
  "08:00 - 11:59",
  "12:00 - 15:59",
  "16:00 - 19:59",
  "20:00 - 23:59",
];

const esFechaValida = (fecha) => {
  if (!fecha) return true;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const fechaObjeto = new Date(`${fecha}T00:00:00`);

  return !Number.isNaN(fechaObjeto.getTime());
};

const obtenerDelitos = async (req, res) => {
  try {
    const {
      comuna,
      fecha_desde,
      fecha_hasta,
      rango_horario,
    } = req.query;

    // Validar formato de fechas
    if (!esFechaValida(fecha_desde) || !esFechaValida(fecha_hasta)) {
      return res.status(400).json({
        error: "Las fechas deben tener el formato YYYY-MM-DD.",
      });
    }

    // Validar que fecha_desde no sea posterior a fecha_hasta
    if (
      fecha_desde &&
      fecha_hasta &&
      fecha_desde > fecha_hasta
    ) {
      return res.status(400).json({
        error: "fecha_desde no puede ser posterior a fecha_hasta.",
      });
    }

    // Validar rango horario
    if (
      rango_horario &&
      !RANGOS_HORARIOS_VALIDOS.includes(rango_horario)
    ) {
      return res.status(400).json({
        error: "El rango horario indicado no es válido.",
        rangos_validos: RANGOS_HORARIOS_VALIDOS,
      });
    }

    const delitos = await delitosService.obtenerDelitos({
      comuna,
      fecha_desde,
      fecha_hasta,
      rango_horario,
    });

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