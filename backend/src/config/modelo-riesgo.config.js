/* Parámetros iniciales del modelo híbrido. Ajustables para experimentación. */
module.exports = Object.freeze({
  VERSION: "hibrido-1",
  DBSCAN: Object.freeze({
    RADIO_METROS: 75,
    MINIMO_PUNTOS: 3,
  }),
  MUESTREO_SEGMENTO_METROS: 20,
  PESOS_ZONA: Object.freeze({ cantidad: 0.5, gravedad: 0.5 }),
  UMBRALES_CLASIFICACION_RIESGO: Object.freeze({ bajoMaximo: 50, medioMaximo: 75 }),
  PESOS_EXPOSICION_TEMPORAL: Object.freeze({ zonas: 0.7, aislados: 0.3 }),
  PESOS_MODELO: Object.freeze({ temporal: 0.7, historico: 0.3 }),
  RADIO_DELITO_AISLADO_METROS: 75,
  REFERENCIA_CANTIDAD_ZONA: 6,
  REFERENCIA_DENSIDAD_TEMPORAL: 6,
  RADIO_HISTORICO_METROS: 75,
  REFERENCIA_DENSIDAD_HISTORICA: 13,
  // Prior conservador derivado del p50 observado de 3 vecinos por registro.
  DENSIDAD_PRIOR_HISTORICA: 3,
  GRAVEDAD_PRIOR_HISTORICA: 100,
  POTENCIA_DECAIMIENTO: 2,
  PUNTAJE_GRAVEDAD_SIN_DATO: 50,
  SNAPSHOT_CALIBRACION: Object.freeze({
    fecha: "2026-11-15",
    registros_georreferenciados: 1948,
    registros_con_gravedad: 1948,
    p50_vecinos_historicos_75m: 3,
    p90_vecinos_historicos_75m: 13,
    p95_vecinos_temporales_maximo_por_franja: 6,
    p50_puntaje_gravedad: 100,
  }),
});
