const supabase = require("../config/supabase");
const {
  DBSCAN,
  PESOS_ZONA,
  REFERENCIA_CANTIDAD_ZONA,
  PUNTAJE_GRAVEDAD_SIN_DATO,
  VERSION,
} = require("../config/modelo-riesgo.config");
const { crearIndiceEspacial, haversine } = require("./riesgo-espacial.service");
const { clasificarRiesgo } = require("./riesgo.service");

const TAMANO_PAGINA = 1000;
const TAMANO_LOTE_GRAVEDAD = 200;

const obtenerDelitosGeograficos = async (comuna) => {
  let comunaId = null;
  if (comuna) {
    const { data: comunaData, error: comunaError } = await supabase
      .from("comunas")
      .select("id, nombre")
      .eq("nombre", comuna)
      .maybeSingle();
    if (comunaError) throw comunaError;
    if (!comunaData) return [];
    comunaId = comunaData.id;
  }

  const delitos = [];
  let inicio = 0;
  while (true) {
    let query = supabase
      .from("delitos")
      .select("id, fecha, rango_horario, latitud, longitud, grupo_delito_id, comuna_id")
      .order("id", { ascending: true });
    if (comunaId) query = query.eq("comuna_id", comunaId);
    const { data, error } = await query.range(inicio, inicio + TAMANO_PAGINA - 1);
    if (error) throw error;
    if (!data?.length) break;
    delitos.push(...data);
    if (data.length < TAMANO_PAGINA) break;
    inicio += TAMANO_PAGINA;
  }

  const grupoIds = [...new Set(delitos.map((delito) => delito.grupo_delito_id).filter(Boolean))];
  const gravedades = [];
  for (let i = 0; i < grupoIds.length; i += TAMANO_LOTE_GRAVEDAD) {
    const { data, error } = await supabase
      .from("niveles_gravedad")
      .select("grupo_delito_id, nivel, puntaje")
      .in("grupo_delito_id", grupoIds.slice(i, i + TAMANO_LOTE_GRAVEDAD));
    if (error) throw error;
    gravedades.push(...(data || []));
  }

  const gravedadPorGrupo = new Map(gravedades.map((gravedad) => [
    gravedad.grupo_delito_id,
    { nivel: gravedad.nivel, puntaje: Number(gravedad.puntaje) },
  ]));
  return delitos.map((delito) => ({
    ...delito,
    gravedad: gravedadPorGrupo.get(delito.grupo_delito_id) ?? null,
  }));
};

const tieneCoordenadas = (delito) =>
  delito.latitud !== null && delito.latitud !== undefined && delito.latitud !== "" &&
  delito.longitud !== null && delito.longitud !== undefined && delito.longitud !== "" &&
  Number.isFinite(Number(delito.latitud)) && Number.isFinite(Number(delito.longitud));

const tieneGravedad = (delito) =>
  delito.gravedad?.puntaje !== null && delito.gravedad?.puntaje !== undefined &&
  delito.gravedad?.puntaje !== "" && Number.isFinite(Number(delito.gravedad.puntaje));

const puntajeGravedad = (delito) => {
  const puntaje = Number(delito.gravedad?.puntaje);
  return tieneGravedad(delito)
    ? Math.max(0, Math.min(100, puntaje))
    : PUNTAJE_GRAVEDAD_SIN_DATO;
};

const clusterizarDBSCAN = (puntos, { radioMetros = DBSCAN.RADIO_METROS, minimoPuntos = DBSCAN.MINIMO_PUNTOS } = {}) => {
  const indice = crearIndiceEspacial(puntos, radioMetros);
  const visitados = new Set();
  const asignacion = new Map();
  const clusters = [];
  const vecinosDe = (punto) => indice.buscarCercanos(punto, radioMetros);

  for (let i = 0; i < puntos.length; i += 1) {
    if (visitados.has(i)) continue;
    visitados.add(i);
    const punto = indice.entradas[i];
    const vecinos = vecinosDe(punto);
    if (vecinos.length < minimoPuntos) {
      asignacion.set(i, -1);
      continue;
    }

    const clusterId = clusters.length;
    const cola = vecinos.map((vecino) => vecino.indiceOriginal);
    const enCola = new Set(cola);
    asignacion.set(i, clusterId);

    for (let cursor = 0; cursor < cola.length; cursor += 1) {
      const indicePunto = cola[cursor];
      if (!visitados.has(indicePunto)) {
        visitados.add(indicePunto);
        const vecinosPunto = vecinosDe(indice.entradas[indicePunto]);
        if (vecinosPunto.length >= minimoPuntos) {
          for (const vecino of vecinosPunto) {
            if (!enCola.has(vecino.indiceOriginal)) {
              cola.push(vecino.indiceOriginal);
              enCola.add(vecino.indiceOriginal);
            }
          }
        }
      }
      if (!asignacion.has(indicePunto) || asignacion.get(indicePunto) === -1) {
        asignacion.set(indicePunto, clusterId);
      }
    }
    clusters.push([]);
  }

  for (const [indicePunto, clusterId] of asignacion) {
    if (clusterId >= 0) clusters[clusterId].push(puntos[indicePunto]);
  }
  return {
    clusters: clusters.filter((cluster) => cluster.length > 0),
    aislados: puntos.filter((_, i) => asignacion.get(i) === -1 || !asignacion.has(i)),
  };
};

const obtenerCentroZona = (delitosZona) => {
  const puntos = delitosZona.filter(tieneCoordenadas).map((delito) => ({
    latitud: Number(delito.latitud),
    longitud: Number(delito.longitud),
  }));
  if (!puntos.length) return { latitud: null, longitud: null };
  const medio = {
    latitud: puntos.reduce((suma, punto) => suma + punto.latitud, 0) / puntos.length,
    longitud: puntos.reduce((suma, punto) => suma + punto.longitud, 0) / puntos.length,
  };
  return puntos.reduce((mejor, punto) =>
    haversine(punto, medio) < haversine(mejor, medio) ? punto : mejor,
  puntos[0]);
};

const calcularPuntajeZona = (delitosZona) => {
  const puntajeCantidad = Math.min(delitosZona.length / REFERENCIA_CANTIDAD_ZONA, 1) * 100;
  const gravedades = delitosZona.map(puntajeGravedad);
  const puntajeTipo = gravedades.reduce((suma, valor) => suma + valor, 0) / Math.max(1, gravedades.length);
  const puntajeFinal = Number((puntajeCantidad * PESOS_ZONA.cantidad + puntajeTipo * PESOS_ZONA.gravedad).toFixed(2));
  return {
    puntajeCantidad: Number(puntajeCantidad.toFixed(2)),
    puntajeTipo: Number(puntajeTipo.toFixed(2)),
    puntajeFinal,
    nivel: clasificarRiesgo(puntajeFinal),
  };
};

const agruparAisladosPorCoordenadas = (aislados) => {
  const grupos = new Map();
  for (const delito of aislados) {
    // La clave usa los valores geográficos numéricos recibidos, sin redondeo.
    const clave = JSON.stringify([Number(delito.latitud), Number(delito.longitud)]);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(delito);
  }

  const parejas = [];
  const incidentesIndividuales = [];
  const coordenadasResidualesMultiples = [];
  for (const [clave, registros] of grupos) {
    if (registros.length === 2) {
      parejas.push(registros);
    } else {
      incidentesIndividuales.push(...registros);
      if (registros.length > 2) {
        coordenadasResidualesMultiples.push({
          coordenadas: JSON.parse(clave),
          cantidad_delitos: registros.length,
          ids_delitos: registros.map(({ id }) => id),
          motivo: "Grupo residual de más de dos coordenadas idénticas no asignado por DBSCAN; se conserva como incidentes individuales para evitar una asignación ambigua.",
        });
      }
    }
  }
  return { parejas, incidentesIndividuales, coordenadasResidualesMultiples };
};

const crearZonaTemporal = ({ incidentes, rangoHorario, idZona, metodoAgrupacion }) => {
  const puntajes = calcularPuntajeZona(incidentes);
  const centro = obtenerCentroZona(incidentes);
  return {
    id_zona: idZona,
    rango_horario: rangoHorario,
    cantidad_delitos: incidentes.length,
    delitos_en_horario: incidentes.length,
    ...puntajes,
    ...centro,
    metodo_agrupacion: metodoAgrupacion,
    geometria_zona: {
      tipo: "union_buffers_haversine",
      radio_metros: DBSCAN.RADIO_METROS,
      centros: incidentes.map(({ id, latitud, longitud }) => ({ id_delito: id, latitud, longitud })),
    },
    parametro_dbscan: { radio_metros: DBSCAN.RADIO_METROS, minimo_puntos: DBSCAN.MINIMO_PUNTOS },
    version_modelo_riesgo: VERSION,
  };
};

const coberturaRegistros = (delitos) => {
  const conCoordenadas = delitos.filter(tieneCoordenadas).length;
  const conGravedad = delitos.filter(tieneGravedad).length;
  const total = delitos.length;
  return {
    fuente: "delitos_supabase",
    registros_disponibles: total,
    registros_con_coordenadas: conCoordenadas,
    registros_sin_coordenadas: total - conCoordenadas,
    registros_con_gravedad: conGravedad,
    registros_sin_gravedad: total - conGravedad,
    proporcion_con_coordenadas: total ? Number((conCoordenadas / total).toFixed(4)) : 0,
    proporcion_con_gravedad: total ? Number((conGravedad / total).toFixed(4)) : 0,
    estado: total === 0 ? "sin_registros" : (conCoordenadas === total && conGravedad === total ? "registros_disponibles" : "cobertura_parcial"),
    alcance: "registros disponibles en la fuente; no mide la completitud de denuncias",
  };
};

const obtenerModeloRiesgo = async ({ comuna, rangoHorario } = {}) => {
  const delitos = await obtenerDelitosGeograficos(comuna);
  const georreferenciados = delitos.filter(tieneCoordenadas).map((delito) => ({
    ...delito,
    latitud: Number(delito.latitud),
    longitud: Number(delito.longitud),
    puntaje_gravedad: puntajeGravedad(delito),
    gravedad_disponible: tieneGravedad(delito),
  }));
  const cobertura = coberturaRegistros(delitos);
  const rangoEspecificado = typeof rangoHorario === "string" && rangoHorario.trim() !== "";
  const incidentesTemporales = rangoEspecificado
    ? georreferenciados.filter((delito) => delito.rango_horario === rangoHorario)
    : [];
  const { clusters, aislados: aisladosDBSCAN } = rangoEspecificado
    ? clusterizarDBSCAN(incidentesTemporales)
    : { clusters: [], aislados: [] };
  const complemento = rangoEspecificado
    ? agruparAisladosPorCoordenadas(aisladosDBSCAN)
    : { parejas: [], incidentesIndividuales: [], coordenadasResidualesMultiples: [] };
  if (complemento.coordenadasResidualesMultiples.length > 0) {
    console.warn(
      "RIESGO - DBSCAN dejó grupos residuales de más de dos delitos con coordenadas idénticas; se conservan como incidentes individuales. Revisar diagnosticoAgrupacionTemporal.",
      complemento.coordenadasResidualesMultiples.map(({ cantidad_delitos }) => ({ cantidad_delitos }))
    );
  }
  const zonasDBSCAN = clusters.map((incidentes, index) => crearZonaTemporal({
    incidentes,
    rangoHorario,
    idZona: `temporal:${encodeURIComponent(rangoHorario)}:${index + 1}`,
    metodoAgrupacion: "dbscan",
  }));
  const zonasParejas = complemento.parejas.map((incidentes, index) => crearZonaTemporal({
    incidentes,
    rangoHorario,
    idZona: `temporal:${encodeURIComponent(rangoHorario)}:coordenadas-identicas:${index + 1}`,
    metodoAgrupacion: "coordenadas_reportadas_identicas",
  }));
  const zonas = [...zonasDBSCAN, ...zonasParejas];

  return {
    zonas,
    delitosAislados: complemento.incidentesIndividuales,
    delitosTemporales: incidentesTemporales,
    delitosHistoricos: georreferenciados,
    diagnosticoAgrupacionTemporal: {
      clusters_dbscan: clusters.length,
      zonas_pareja_coordenadas_identicas: zonasParejas.length,
      incidentes_individuales: complemento.incidentesIndividuales.length,
      coordenadas_residuales_multiples: complemento.coordenadasResidualesMultiples,
    },
    cobertura,
    rangoHorario: rangoEspecificado ? rangoHorario : null,
    modoTemporal: rangoEspecificado ? "rango_seleccionado" : "sin_rango_temporal_especificado",
    version: VERSION,
  };
};

const obtenerZonasRiesgo = async (parametros) => (await obtenerModeloRiesgo(parametros)).zonas;

module.exports = {
  obtenerZonasRiesgo,
  obtenerModeloRiesgo,
  obtenerDelitosGeograficos,
  clusterizarDBSCAN,
  calcularPuntajeZona,
  agruparAisladosPorCoordenadas,
};
