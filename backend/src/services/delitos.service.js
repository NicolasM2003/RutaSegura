const supabase = require("../config/supabase");

const obtenerDelitos = async () => {
  const { data, error } = await supabase
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
    `)
    .order("fecha", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  obtenerDelitos,
};