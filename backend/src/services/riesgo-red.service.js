const { obtenerModeloRiesgo } = require("./zonas-riesgo.service");
const { obtenerRedPeatonal } = require("./red-peatonal.service");
const {
  PESOS_EXPOSICION_TEMPORAL,
  PESOS_MODELO,
  RADIO_DELITO_AISLADO_METROS,
  RADIO_HISTORICO_METROS,
  REFERENCIA_DENSIDAD_TEMPORAL,
  REFERENCIA_DENSIDAD_HISTORICA,
  DENSIDAD_PRIOR_HISTORICA,
  GRAVEDAD_PRIOR_HISTORICA,
  MUESTREO_SEGMENTO_METROS,
  POTENCIA_DECAIMIENTO,
  VERSION,
} = require("../config/modelo-riesgo.config");
const {
  crearIndiceEspacial,
  haversine,
  intervaloSegmentoCirculo,
  muestrearGeometria,
  puntoEnSegmentoMetros,
} = require("./riesgo-espacial.service");
const {
  calcularCostoNavegacion,
  obtenerLongitudMaxima,
} = require("./costo-ruta.service");
const { clasificarRiesgo } = require("./riesgo.service");

const limitarPuntaje = (valor) => Math.max(0, Math.min(100, valor));
const redondear = (valor, decimales = 2) => Number(valor.toFixed(decimales));
const combinarRiesgoHibrido = (temporal, historico) => limitarPuntaje(
  temporal * PESOS_MODELO.temporal + historico * PESOS_MODELO.historico
);

const crearContextoRiesgo = async ({ comuna, rangoHorario, bbox, soloSupabase = false } = {}) => {
  const [modelo, red] = await Promise.all([
    obtenerModeloRiesgo({ comuna, rangoHorario }),
    obtenerRedPeatonal({ comuna, bbox, soloSupabase }),
  ]);
  const centrosZona = modelo.zonas.flatMap((zona) =>
    zona.geometria_zona.centros.map((centro) => ({
      ...centro,
      id_zona: zona.id_zona,
      puntaje: zona.puntajeFinal,
      nivel: zona.nivel,
      radio_metros: zona.geometria_zona.radio_metros,
    }))
  );
  return {
    red,
    modelo,
    indiceHistorico: crearIndiceEspacial(modelo.delitosHistoricos, RADIO_HISTORICO_METROS),
    indiceAislados: crearIndiceEspacial(modelo.delitosAislados, RADIO_DELITO_AISLADO_METROS),
    indiceCentrosZona: crearIndiceEspacial(centrosZona, modelo.zonas[0]?.geometria_zona.radio_metros || 75),
    centrosZona,
  };
};

const fusionarIntervalos = (intervalos) => {
  const ordenados = [...intervalos].sort((a, b) => a[0] - b[0]);
  const fusionados = [];
  for (const intervalo of ordenados) {
    const ultimo = fusionados[fusionados.length - 1];
    if (!ultimo || intervalo[0] > ultimo[1]) fusionados.push([...intervalo]);
    else ultimo[1] = Math.max(ultimo[1], intervalo[1]);
  }
  return fusionados;
};

const calcularExposicionZonas = (geometria, contexto) => {
  const largoTotal = geometria.slice(0, -1).reduce((suma, inicio, i) => suma + haversine(inicio, geometria[i + 1]), 0);
  if (!Number.isFinite(largoTotal) || largoTotal <= 0 || !contexto.centrosZona.length) {
    return { puntaje: 0, zonas: [], largoTotal: Number.isFinite(largoTotal) ? largoTotal : 0 };
  }

  let integralPuntaje = 0;
  const largoPorZona = new Map();
  for (let i = 0; i < geometria.length - 1; i += 1) {
    const inicio = geometria[i];
    const fin = geometria[i + 1];
    const largo = haversine(inicio, fin);
    if (!Number.isFinite(largo) || largo <= 0) continue;
    const candidatos = contexto.indiceCentrosZona.buscarEnGeometria([inicio, fin], 75);
    const intervalos = [];
    const porZona = new Map();
    for (const centro of candidatos) {
      const intervalo = intervaloSegmentoCirculo(inicio, fin, centro, centro.radio_metros, contexto.indiceCentrosZona);
      if (!intervalo) continue;
      intervalos.push({ intervalo, id: centro.id_zona, puntaje: centro.puntaje, nivel: centro.nivel });
      if (!porZona.has(centro.id_zona)) porZona.set(centro.id_zona, []);
      porZona.get(centro.id_zona).push(intervalo);
    }

    const limites = [...new Set([0, 1, ...intervalos.flatMap(({ intervalo }) => intervalo)])].sort((a, b) => a - b);
    for (let j = 0; j < limites.length - 1; j += 1) {
      const a = limites[j];
      const b = limites[j + 1];
      const medio = (a + b) / 2;
      const puntajeActivo = intervalos
        .filter(({ intervalo }) => medio >= intervalo[0] && medio <= intervalo[1])
        .reduce((maximo, zona) => Math.max(maximo, zona.puntaje), 0);
      integralPuntaje += largo * (b - a) * puntajeActivo;
    }

    for (const [id, tramos] of porZona) {
      const largoZona = fusionarIntervalos(tramos).reduce((suma, [a, b]) => suma + largo * (b - a), 0);
      largoPorZona.set(id, (largoPorZona.get(id) || 0) + largoZona);
    }
  }

  const zonaPorId = new Map(contexto.modelo.zonas.map((zona) => [zona.id_zona, zona]));
  const zonas = [...largoPorZona.entries()].filter(([, largo]) => largo > 0).map(([id, largo]) => {
    const zona = zonaPorId.get(id);
    return {
      id_zona: id,
      nivel: zona.nivel,
      puntajeFinal: zona.puntajeFinal,
      longitud_afectada_metros: redondear(largo),
      proporcion_segmento: redondear(Math.min(1, largo / largoTotal), 4),
    };
  });
  return {
    puntaje: limitarPuntaje(integralPuntaje / largoTotal),
    zonas,
    largoTotal,
  };
};

const calcularExposicionIncidentes = ({ geometria, indice, radioMetros, referencia }) => {
  const muestras = muestrearGeometria(geometria, MUESTREO_SEGMENTO_METROS, indice);
  if (!muestras.length) return { puntaje: 0, densidad: 0, gravedadMedia: 0, incidentes: [] };
  const candidatos = indice.buscarEnGeometria(geometria, radioMetros);
  let intensidadTotal = 0;
  let gravedadPonderadaTotal = 0;
  let pesoGravedadTotal = 0;
  for (const muestra of muestras) {
    for (const incidente of indice.buscarCercanos(muestra, radioMetros)) {
      const distancia = haversine(muestra, incidente);
      const peso = Math.max(0, 1 - distancia / radioMetros) ** POTENCIA_DECAIMIENTO;
      if (peso <= 0) continue;
      intensidadTotal += peso;
      const gravedad = Number(incidente.puntaje_gravedad ?? incidente.puntaje_gravedad_estimado ?? 50);
      gravedadPonderadaTotal += peso * gravedad;
      pesoGravedadTotal += peso;
    }
  }
  const densidad = intensidadTotal / muestras.length;
  const gravedadMedia = pesoGravedadTotal > 0 ? gravedadPonderadaTotal / pesoGravedadTotal : 0;
  const puntajeDensidad = Math.min(densidad / referencia, 1) * 100;
  const puntaje = limitarPuntaje(puntajeDensidad * gravedadMedia / 100);

  const incidentes = candidatos
    .map((incidente) => {
      const distancia = Math.min(...geometria.slice(0, -1).map((inicio, i) =>
        puntoEnSegmentoMetros(incidente, inicio, geometria[i + 1], indice)
      ));
      const peso = Math.max(0, 1 - distancia / radioMetros) ** POTENCIA_DECAIMIENTO;
      return { incidente, distancia, peso };
    })
    .filter(({ distancia }) => distancia <= radioMetros)
    .sort((a, b) => a.distancia - b.distancia)
    .map(({ incidente, distancia, peso }) => ({
      id: incidente.id,
      distancia_metros: redondear(distancia),
      puntaje_gravedad: incidente.puntaje_gravedad,
      influencia: redondear(peso, 4),
    }));
  return { puntaje, densidad, gravedadMedia, incidentes };
};

const calcularRiesgoSegmento = (segmento, contexto) => {
  const geometria = Array.isArray(segmento.geometria) ? segmento.geometria : [];
  if (geometria.length < 2) {
    return {
      puntaje_riesgo_temporal: 0,
      puntaje_riesgo_historico: 0,
      puntaje_riesgo: 0,
      nivel_riesgo: "Bajo",
      zonas_intersectadas: [],
      delitos_individuales_cercanos: [],
      cobertura_riesgo: contexto?.modelo?.cobertura || { estado: "sin_datos" },
      estado_riesgo_local: "geometria_insuficiente",
    };
  }

  const zonas = calcularExposicionZonas(geometria, contexto);
  const aislados = calcularExposicionIncidentes({
    geometria,
    indice: contexto.indiceAislados,
    radioMetros: RADIO_DELITO_AISLADO_METROS,
    referencia: REFERENCIA_DENSIDAD_TEMPORAL,
  });
  const historico = calcularExposicionIncidentes({
    geometria,
    indice: contexto.indiceHistorico,
    radioMetros: RADIO_HISTORICO_METROS,
    referencia: REFERENCIA_DENSIDAD_HISTORICA,
  });
  const sinIncidentesHistoricosLocales = historico.incidentes.length === 0;
  const riesgoHistorico = sinIncidentesHistoricosLocales
    ? Math.min(DENSIDAD_PRIOR_HISTORICA / REFERENCIA_DENSIDAD_HISTORICA, 1) * GRAVEDAD_PRIOR_HISTORICA
    : historico.puntaje;
  const densidadHistorica = sinIncidentesHistoricosLocales
    ? DENSIDAD_PRIOR_HISTORICA
    : historico.densidad;
  const gravedadHistorica = sinIncidentesHistoricosLocales
    ? GRAVEDAD_PRIOR_HISTORICA
    : historico.gravedadMedia;
  const rangoEspecificado = contexto.modelo.modoTemporal === "rango_seleccionado";
  const riesgoTemporal = rangoEspecificado
    ? limitarPuntaje(zonas.puntaje * PESOS_EXPOSICION_TEMPORAL.zonas + aislados.puntaje * PESOS_EXPOSICION_TEMPORAL.aislados)
    : 0;
  const riesgoFinal = combinarRiesgoHibrido(riesgoTemporal, riesgoHistorico);
  const cercanos = new Map();
  for (const incidente of [...aislados.incidentes, ...historico.incidentes]) {
    cercanos.set(incidente.id, incidente);
  }
  const hayIncidentesLocales = aislados.incidentes.length > 0 || historico.incidentes.length > 0 || zonas.zonas.length > 0;
  const cobertura = contexto.modelo.cobertura;

  return {
    puntaje_riesgo_temporal: redondear(riesgoTemporal),
    puntaje_riesgo_historico: redondear(riesgoHistorico),
    puntaje_riesgo: redondear(riesgoFinal),
    nivel_riesgo: clasificarRiesgo(riesgoFinal),
    zonas_intersectadas: zonas.zonas,
    delitos_individuales_cercanos: aislados.incidentes,
    cantidad_delitos_historicos_cercanos: historico.incidentes.length,
    densidad_historica_normalizada: redondear(Math.min(densidadHistorica / REFERENCIA_DENSIDAD_HISTORICA, 1), 4),
    gravedad_historica_ponderada: redondear(gravedadHistorica),
    riesgo_historico_es_prior: sinIncidentesHistoricosLocales,
    cobertura_riesgo: cobertura,
    version_modelo_riesgo: VERSION,
    rango_horario_evaluado: contexto.modelo.rangoHorario,
    modo_temporal: contexto.modelo.modoTemporal,
    estado_riesgo_local: !hayIncidentesLocales
      ? (cobertura.estado === "sin_registros" ? "sin_datos_disponibles" : "sin_incidentes_cercanos_registrados_no_equivale_a_seguridad")
      : (cobertura.estado === "cobertura_parcial" ? "datos_parciales" : "incidentes_registrados_evaluados"),
    cantidad_incidentes_unicos_cercanos: cercanos.size,
  };
};

const obtenerDatosRedConRiesgo = crearContextoRiesgo;

const obtenerRedPeatonalConRiesgo = async (parametros) => {
  const contexto = await crearContextoRiesgo(parametros);
  const longitudMaxima = obtenerLongitudMaxima(contexto.red);
  return contexto.red.map((segmento) => {
    const riesgo = calcularRiesgoSegmento(segmento, contexto);
    const costos = calcularCostoNavegacion({
      puntajeRiesgo: riesgo.puntaje_riesgo,
      longitudMetros: segmento.longitud_metros,
      longitudMaxima,
    });
    return {
      ...segmento,
      ...riesgo,
      nivel_riesgo: riesgo.nivel_riesgo,
      cantidad_zonas_intersectadas: riesgo.zonas_intersectadas.length,
      costo_riesgo: costos.costo_riesgo,
      costo_riesgo_normalizado: costos.costo_riesgo,
      costo_distancia: costos.costo_distancia,
      costo_distancia_normalizado: costos.costo_distancia,
      costo_navegacion: costos.costo_navegacion,
      costo_navegacion_normalizado: costos.costo_navegacion,
    };
  });
};

module.exports = {
  obtenerRedPeatonalConRiesgo,
  obtenerDatosRedConRiesgo,
  calcularRiesgoSegmento,
  calcularExposicionZonas,
  calcularExposicionIncidentes,
  combinarRiesgoHibrido,
};
