const supabase = require("../config/supabase");
const { calcularRiesgo } = require("./riesgo.service");

const obtenerDatosZona = async (comuna) => {
  let query = supabase
    .from("delitos")
    .select(`
      id,
      fecha,
      rango_horario,
      grupo_delito_id,
      comunas!inner (
        id,
        nombre
      )
    `);

  if (comuna) {
    query = query.eq("comunas.nombre", comuna);
  }

  const { data: delitos, error: delitosError } = await query;

  if (delitosError) {
    throw delitosError;
  }

  const grupoIds = [
    ...new Set(delitos.map((delito) => delito.grupo_delito_id)),
  ];

  if (grupoIds.length === 0) {
    return [];
  }

  const { data: gravedades, error: gravedadError } = await supabase
    .from("niveles_gravedad")
    .select(`
      grupo_delito_id,
      nivel,
      puntaje
    `)
    .in("grupo_delito_id", grupoIds);

  if (gravedadError) {
    throw gravedadError;
  }

  const gravedadPorGrupo = new Map(
    gravedades.map((gravedad) => [
      gravedad.grupo_delito_id,
      {
        nivel: gravedad.nivel,
        puntaje: Number(gravedad.puntaje),
      },
    ])
  );

  return delitos.map((delito) => ({
    ...delito,
    gravedad:
      gravedadPorGrupo.get(delito.grupo_delito_id) ?? null,
  }));
};

const calcularRiesgoZona = async ({
  comuna,
  rangoHorario,
  cantidadMaxima,
}) => {
  const delitos = await obtenerDatosZona(comuna);

  const cantidadDelitos = delitos.length;

  const delitosEnHorario = rangoHorario
    ? delitos.filter(
        (delito) => delito.rango_horario === rangoHorario
      ).length
    : cantidadDelitos;

  const puntajesTipo = delitos
    .map((delito) => delito.gravedad?.puntaje)
    .filter((puntaje) => typeof puntaje === "number");

  const puntajeTipo =
    puntajesTipo.length > 0
      ? puntajesTipo.reduce(
          (total, puntaje) => total + puntaje,
          0
        ) / puntajesTipo.length
      : 0;

  const resultado = calcularRiesgo({
    cantidadDelitos,
    cantidadMaxima,
    puntajeTipo,
    delitosEnHorario,
    delitosTotalesZona: cantidadDelitos,
  });

  return {
    comuna,
    rango_horario: rangoHorario ?? null,
    total_delitos: cantidadDelitos,
    delitos_en_horario: delitosEnHorario,
    puntajeTipo: Number(puntajeTipo.toFixed(2)),
    ...resultado,
  };
};

module.exports = {
  obtenerDatosZona,
  calcularRiesgoZona,
};