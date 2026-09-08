const supabase = require("../config/supabase");

const obtenerDelitos = async (filtros = {}) => {
  const {
    comuna,
    fecha_desde,
    fecha_hasta,
    rango_horario,
  } = filtros;

  let comunaId = null;

  // Buscar ID de la comuna cuando se solicita el filtro
  if (comuna) {
    const { data: comunaData, error: comunaError } = await supabase
      .from("comunas")
      .select("id")
      .ilike("nombre", comuna.trim())
      .maybeSingle();

    if (comunaError) {
      throw comunaError;
    }

    // Si la comuna no existe, no hay resultados
    if (!comunaData) {
      return [];
    }

    comunaId = comunaData.id;
  }

  let query = supabase
    .from("delitos")
    .select(`
      id,
      fecha,
      rango_horario,
      latitud,
      longitud,
      created_at,
      clasificaciones (
        nombre
      ),
      grupos_delitos (
        nombre,
        familias_delitos (
          nombre
        )
      ),
      lugares (
        nombre
      ),
      comunas (
        nombre,
        regiones (
          nombre
        )
      ),
      fuentes (
        nombre
      )
    `);

  // Filtro por comuna
  if (comunaId) {
    query = query.eq("comuna_id", comunaId);
  }

  // Filtro por fecha inicial
  if (fecha_desde) {
    query = query.gte("fecha", fecha_desde);
  }

  // Filtro por fecha final
  if (fecha_hasta) {
    query = query.lte("fecha", fecha_hasta);
  }

  // Filtro por rango horario
  if (rango_horario) {
    query = query.eq("rango_horario", rango_horario);
  }

  const { data, error } = await query.order("fecha", {
    ascending: false,
  });

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  obtenerDelitos,
};