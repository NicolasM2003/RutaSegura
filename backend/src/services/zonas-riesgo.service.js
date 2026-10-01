const supabase = require("../config/supabase");
const { calcularRiesgo } = require("./riesgo.service");

const TAMANO_CELDA = 0.004;
const RADIO_CONCENTRACION_METROS = 75;
const METROS_POR_GRADO = 111_320;

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

const distanciaMetros = (a, b) => {
  const latitudMedia = ((a.latitud + b.latitud) / 2) * Math.PI / 180;
  const diferenciaLatitud = (a.latitud - b.latitud) * METROS_POR_GRADO;
  const diferenciaLongitud =
    (a.longitud - b.longitud) * METROS_POR_GRADO * Math.cos(latitudMedia);

  return Math.hypot(diferenciaLatitud, diferenciaLongitud);
};

const obtenerCentroZona = (delitosZona) => {
  const puntos = delitosZona
    .map((delito) => ({
      latitud: Number(delito.latitud),
      longitud: Number(delito.longitud),
    }))
    .filter((punto) =>
      Number.isFinite(punto.latitud) && Number.isFinite(punto.longitud)
    );

  if (puntos.length === 0) {
    return { latitud: null, longitud: null };
  }

  // Coloca el círculo en un delito real perteneciente al núcleo más denso,
  // evitando que el centro geométrico de la celda caiga fuera del área urbana.
  let mejorPunto = puntos[0];
  let mayorConcentracion = -1;
  let menorDistanciaTotal = Number.POSITIVE_INFINITY;

  for (const candidato of puntos) {
    const cercanos = puntos.filter(
      (punto) => distanciaMetros(candidato, punto) <= RADIO_CONCENTRACION_METROS
    );
    const distanciaTotal = cercanos.reduce(
      (total, punto) => total + distanciaMetros(candidato, punto),
      0
    );

    if (
      cercanos.length > mayorConcentracion ||
      (cercanos.length === mayorConcentracion && distanciaTotal < menorDistanciaTotal)
    ) {
      mejorPunto = candidato;
      mayorConcentracion = cercanos.length;
      menorDistanciaTotal = distanciaTotal;
    }
  }

  return mejorPunto;
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

    const centro = obtenerCentroZona(delitosZona);

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
