const supabase = require("../config/supabase");
const { calcularRiesgo } = require("./riesgo.service");

const TAMANO_CELDA = 0.004;

const obtenerDelitosGeograficos = async (comuna) => {
  let comunaId = null;

  if (comuna) {
    const { data: comunaData, error: comunaError } = await supabase
      .from("comunas")
      .select("id, nombre")
      .eq("nombre", comuna)
      .maybeSingle();

    if (comunaError) {
      throw comunaError;
    }

    // Si la comuna no existe, no hay datos geográficos que devolver.
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
      grupo_delito_id,
      comuna_id,
      comunas (
        id,
        nombre
      )
    `)
    .not("latitud", "is", null)
    .not("longitud", "is", null);

  if (comunaId) {
    query = query.eq("comuna_id", comunaId);
  }

  const { data: delitos, error } = await query;

  if (error) {
    throw error;
  }

  // Obtener los grupos de delito utilizados
  const grupoIds = [
    ...new Set(delitos.map((delito) => delito.grupo_delito_id)),
  ];

  if (grupoIds.length === 0) {
    return [];
  }

  // Obtener la gravedad correspondiente a cada grupo
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

const obtenerClaveZona = (latitud, longitud) => {
  const fila = Math.floor(latitud / TAMANO_CELDA);
  const columna = Math.floor(longitud / TAMANO_CELDA);

  return `${fila}:${columna}`;
};

const obtenerCentroZona = (latitud, longitud) => {
  const fila = Math.floor(latitud / TAMANO_CELDA);
  const columna = Math.floor(longitud / TAMANO_CELDA);

  return {
    latitud: (fila + 0.5) * TAMANO_CELDA,
    longitud: (columna + 0.5) * TAMANO_CELDA,
  };
};

const obtenerZonasRiesgo = async ({
  comuna,
  rangoHorario,
}) => {
  const delitos = await obtenerDelitosGeograficos(comuna);

  const zonasMap = new Map();

  for (const delito of delitos) {
    const clave = obtenerClaveZona(
      Number(delito.latitud),
      Number(delito.longitud)
    );

    if (!zonasMap.has(clave)) {
      zonasMap.set(clave, []);
    }

    zonasMap.get(clave).push(delito);
  }

  const zonas = Array.from(zonasMap.entries()).map(
    ([clave, delitosZona]) => ({
      clave,
      delitos: delitosZona,
    })
  );

  const cantidadMaxima = Math.max(
    ...zonas.map((zona) => zona.delitos.length),
    0
  );

  return zonas.map((zona) => {
    const delitosZona = zona.delitos;

    const cantidadDelitos = delitosZona.length;

    const delitosEnHorario = rangoHorario
      ? delitosZona.filter(
          (delito) => delito.rango_horario === rangoHorario
        ).length
      : cantidadDelitos;

    const puntajesTipo = delitosZona
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

    const primerDelito = delitosZona[0];

    const centro = obtenerCentroZona(
      Number(primerDelito.latitud),
      Number(primerDelito.longitud)
    );

    return {
      id_zona: zona.clave,
      cantidad_delitos: cantidadDelitos,
      delitos_en_horario: delitosEnHorario,
      puntajeTipo: Number(puntajeTipo.toFixed(2)),
      ...centro,
      ...resultado,
    };
  });
};

module.exports = {
  obtenerZonasRiesgo,
};