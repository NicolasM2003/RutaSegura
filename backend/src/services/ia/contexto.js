/**
 * Contrato de entrada/salida entre RutaSegura y el servicio de IA.
 *
 * La IA solo interpreta los datos recibidos.
 * No calcula riesgo ni modifica las rutas.
 */

// Contrato para una única ruta.
// Se conserva para mantener compatibilidad.
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

  zonas_riesgo_afectadas:
    Array.isArray(ruta.zonas_riesgo_afectadas)
      ? ruta.zonas_riesgo_afectadas
      : [],

  rango_horario: rango_horario ?? null,
});

// Contrato para múltiples rutas alternativas.
const construirContextoRutasIA = ({
  origen,
  destino,
  rutas,
  rango_horario,
  rangoHorario,
}) => {
  const rutasDisponibles = Array.isArray(rutas)
    ? rutas
    : [];

  return {
    origen: {
      latitud: Number(origen.latitud),
      longitud: Number(origen.longitud),
    },

    destino: {
      latitud: Number(destino.latitud),
      longitud: Number(destino.longitud),
    },

    cantidad_rutas: rutasDisponibles.length,

    rutas: rutasDisponibles.map((ruta) => ({
      perfil_ruta: ruta.perfil_ruta ?? null,
      nombre_perfil_ruta:
        ruta.nombre_perfil_ruta ?? null,

      distancia_metros: Number(ruta.distancia_metros),

      tiempo_estimado_minutos:
        ruta.tiempo_estimado_minutos == null
          ? null
          : Number(ruta.tiempo_estimado_minutos),

      nivel_riesgo: ruta.nivel_riesgo ?? null,
      puntaje_riesgo: Number(ruta.puntaje_riesgo),
      cantidad_segmentos: Number(ruta.cantidad_segmentos),

      zonas_riesgo_afectadas:
        Array.isArray(ruta.zonas_riesgo_afectadas)
          ? ruta.zonas_riesgo_afectadas
          : [],
    })),

    rango_horario:
      rango_horario ?? rangoHorario ?? null,
  };
};

module.exports = {
  construirContextoRutaIA,
  construirContextoRutasIA,
};