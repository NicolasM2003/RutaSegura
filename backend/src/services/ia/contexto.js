
/**
 * Contrato de entrada/salida entre RutaSegura y el servicio de IA.
 *
 * La IA solo interpreta los datos recibidos.
 * El backend calcula las rutas, métricas y diferencias.
 */

// Convierte un valor a número sin transformar valores ausentes en cero.
const convertirNumero = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
};

// Redondea diferencias a dos decimales.
const redondear = (valor) => {
  if (valor === null || valor === undefined) {
    return null;
  }

  return Math.round(
    (valor + Number.EPSILON) * 100
  ) / 100;
};

/**
 * Calcula la diferencia entre dos métricas.
 *
 * Convención:
 * valor de la ruta actual - valor de la ruta de referencia.
 *
 * Resultado positivo: la ruta actual tiene un valor mayor.
 * Resultado negativo: la ruta actual tiene un valor menor.
 */
const calcularDiferencia = (
  valorRuta,
  valorReferencia
) => {
  if (
    valorRuta === null ||
    valorReferencia === null
  ) {
    return null;
  }

  return redondear(
    valorRuta - valorReferencia
  );
};

/**
 * Construye las diferencias entre dos rutas.
 *
 * No interpreta cuál es mejor.
 * Solamente entrega las diferencias numéricas.
 */
const construirComparacionRutas = (
  ruta,
  rutaReferencia
) => {
  const distanciaRuta = convertirNumero(
    ruta.distancia_metros
  );

  const tiempoRuta = convertirNumero(
    ruta.tiempo_estimado_minutos
  );

  const riesgoRuta = convertirNumero(
    ruta.puntaje_riesgo
  );

  const distanciaReferencia = convertirNumero(
    rutaReferencia.distancia_metros
  );

  const tiempoReferencia = convertirNumero(
    rutaReferencia.tiempo_estimado_minutos
  );

  const riesgoReferencia = convertirNumero(
    rutaReferencia.puntaje_riesgo
  );

  return {
    perfil_referencia:
      rutaReferencia.perfil_ruta ?? null,

    nombre_perfil_referencia:
      rutaReferencia.nombre_perfil_ruta ?? null,

    diferencia_distancia_metros:
      calcularDiferencia(
        distanciaRuta,
        distanciaReferencia
      ),

    diferencia_tiempo_minutos:
      calcularDiferencia(
        tiempoRuta,
        tiempoReferencia
      ),

    diferencia_puntaje_riesgo:
      calcularDiferencia(
        riesgoRuta,
        riesgoReferencia
      ),
  };
};

// Contrato para una única ruta.
// Se conserva para mantener compatibilidad.
const construirContextoRutaIA = ({
  origen,
  destino,
  ruta,
  rango_horario,
}) => ({
  origen: {
    latitud: convertirNumero(origen.latitud),
    longitud: convertirNumero(origen.longitud),
  },

  destino: {
    latitud: convertirNumero(destino.latitud),
    longitud: convertirNumero(destino.longitud),
  },

  distancia_metros: convertirNumero(
    ruta.distancia_metros
  ),

  nivel_riesgo: ruta.nivel_riesgo ?? null,

  puntaje_riesgo: convertirNumero(
    ruta.puntaje_riesgo
  ),

  cantidad_segmentos: convertirNumero(
    ruta.cantidad_segmentos
  ),

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
  perfilSeleccionado,
  perfilMasSeguro,
}) => {
  const rutasDisponibles = Array.isArray(rutas)
    ? rutas
    : [];

  /*
   * La ruta de menor riesgo es determinada exclusivamente
   * por el backend mediante perfilMasSeguro.
   *
   * No volvemos a calcular cuál es la ruta más segura.
   */
  const rutaMasSegura = rutasDisponibles.find(
    (ruta) => ruta.perfil_ruta === perfilMasSeguro
  );

  return {
    origen: {
      latitud: convertirNumero(origen.latitud),
      longitud: convertirNumero(origen.longitud),
    },

    destino: {
      latitud: convertirNumero(destino.latitud),
      longitud: convertirNumero(destino.longitud),
    },

    cantidad_rutas: rutasDisponibles.length,

    perfil_seleccionado:
      perfilSeleccionado ?? null,

    perfil_mas_seguro:
      perfilMasSeguro ?? null,

    rutas: rutasDisponibles.map((ruta, indice) => {
      const distanciaMetros = convertirNumero(
        ruta.distancia_metros
      );

      const tiempoMinutos = convertirNumero(
        ruta.tiempo_estimado_minutos
      );

      const puntajeRiesgo = convertirNumero(
        ruta.puntaje_riesgo
      );

      const zonasRiesgo = Array.isArray(
        ruta.zonas_riesgo_afectadas
      )
        ? ruta.zonas_riesgo_afectadas
        : [];

      /*
       * Compara esta ruta con TODAS las demás alternativas.
       *
       * Se utiliza el índice para excluir solamente la
       * ruta actual, sin depender de los valores numéricos.
       */
      const comparacionesConOtrasRutas =
        rutasDisponibles
          .filter((_, otroIndice) => otroIndice !== indice)
          .map((otraRuta) =>
            construirComparacionRutas(
              ruta,
              otraRuta
            )
          );

      /*
       * Se conserva la comparación específica con la ruta
       * de menor riesgo para mantener compatibilidad.
       *
       * Si la ruta actual es la misma ruta de menor riesgo,
       * sus diferencias respecto de sí misma son cero.
       */
      const comparacionConMenorRiesgo =
        rutaMasSegura
          ? construirComparacionRutas(
              ruta,
              rutaMasSegura
            )
          : null;

      return {
        perfil_ruta: ruta.perfil_ruta ?? null,

        nombre_perfil_ruta:
          ruta.nombre_perfil_ruta ?? null,

        distancia_metros: distanciaMetros,

        tiempo_estimado_minutos: tiempoMinutos,

        nivel_riesgo: ruta.nivel_riesgo ?? null,

        puntaje_riesgo: puntajeRiesgo,

        cantidad_segmentos: convertirNumero(
          ruta.cantidad_segmentos
        ),

        cantidad_zonas_riesgo_afectadas:
          zonasRiesgo.length,

        zonas_riesgo_afectadas: zonasRiesgo,

        // Comparación con la ruta recomendada por seguridad.
        comparacion_con_menor_riesgo:
          comparacionConMenorRiesgo,

        // Comparación con todas las otras alternativas.
        comparaciones_con_otras_rutas:
          comparacionesConOtrasRutas,
      };
    }),

    rango_horario:
      rango_horario ?? rangoHorario ?? null,
  };
};

module.exports = {
  construirContextoRutaIA,
  construirContextoRutasIA,
};
