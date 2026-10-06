/**
 * Contrato de entrada/salida entre RutaSegura y el servicio de IA.
 *
 * La IA solo interpreta los datos recibidos.
 * No calcula riesgo ni modifica la ruta.
 */

const construirContextoRutaIA = ({
  origen,
  destino,
  ruta,
  rango_horario,
}) => ({
  origen: {
    latitud: Number(origen.latitud),
    longitud: Number(origen.longitud),
  },

  destino: {
    latitud: Number(destino.latitud),
    longitud: Number(destino.longitud),
  },

  distancia_metros: Number(ruta.distancia_metros),
  nivel_riesgo: ruta.nivel_riesgo ?? null,
  puntaje_riesgo: Number(ruta.puntaje_riesgo),
  cantidad_segmentos: Number(ruta.cantidad_segmentos),
  zonas_riesgo_afectadas: Array.isArray(ruta.zonas_riesgo_afectadas)
    ? ruta.zonas_riesgo_afectadas
    : [],
  rango_horario: rango_horario ?? null,
});

module.exports = {
  construirContextoRutaIA,
};