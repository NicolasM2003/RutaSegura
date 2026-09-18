const {
  obtenerZonasRiesgo,
} = require("./zonas-riesgo.service");

const {
  obtenerRedPeatonal,
} = require("./red-peatonal.service");

const {
  calcularCostoNavegacion,
  obtenerLongitudMaxima,
} = require("./costo-ruta.service");

const TAMANO_CELDA = 0.004;

/*
 * ==========================================================
 * GEOMETRÍA DE ZONAS
 * ==========================================================
 */

/*
 * Convierte una clave de zona:
 *
 * "-8241:-17878"
 *
 * en sus límites geográficos.
 */
const obtenerLimitesZona = (
  idZona
) => {
  const partes =
    String(idZona).split(":");

  if (
    partes.length !== 2
  ) {
    return null;
  }

  const fila =
    Number(partes[0]);

  const columna =
    Number(partes[1]);

  if (
    !Number.isFinite(fila) ||
    !Number.isFinite(columna)
  ) {
    return null;
  }

  const minLat =
    fila * TAMANO_CELDA;

  const maxLat =
    (fila + 1) *
    TAMANO_CELDA;

  const minLon =
    columna * TAMANO_CELDA;

  const maxLon =
    (columna + 1) *
    TAMANO_CELDA;

  return {
    minLat,
    minLon,
    maxLat,
    maxLon,
  };
};

/*
 * ==========================================================
 * GEOMETRÍA DE SEGMENTOS
 * ==========================================================
 */

/*
 * Calcula la longitud euclidiana aproximada
 * de un tramo en coordenadas geográficas.
 *
 * Para comparar proporciones dentro de una misma zona
 * es suficiente para esta versión.
 */
const distanciaPlano = (
  puntoA,
  puntoB
) => {
  const deltaLat =
    Number(puntoB.latitud) -
    Number(puntoA.latitud);

  const deltaLon =
    Number(puntoB.longitud) -
    Number(puntoA.longitud);

  return Math.sqrt(
    deltaLat ** 2 +
      deltaLon ** 2
  );
};

/*
 * Calcula qué proporción de un segmento lineal
 * queda dentro de un rectángulo.
 *
 * Utiliza Liang-Barsky.
 */
const proporcionDentroRectangulo = (
  puntoA,
  puntoB,
  zona
) => {
  const x1 = Number(
    puntoA.longitud
  );

  const y1 = Number(
    puntoA.latitud
  );

  const x2 = Number(
    puntoB.longitud
  );

  const y2 = Number(
    puntoB.latitud
  );

  const dx = x2 - x1;
  const dy = y2 - y1;

  const p = [
    -dx,
    dx,
    -dy,
    dy,
  ];

  const q = [
    x1 - zona.minLon,
    zona.maxLon - x1,
    y1 - zona.minLat,
    zona.maxLat - y1,
  ];

  let tEntrada = 0;
  let tSalida = 1;

  for (
    let i = 0;
    i < 4;
    i++
  ) {
    if (p[i] === 0) {
      if (q[i] < 0) {
        return 0;
      }

      continue;
    }

    const t =
      q[i] / p[i];

    if (p[i] < 0) {
      if (t > tSalida) {
        return 0;
      }

      if (t > tEntrada) {
        tEntrada = t;
      }
    } else {
      if (t < tEntrada) {
        return 0;
      }

      if (t < tSalida) {
        tSalida = t;
      }
    }
  }

  if (
    tEntrada > tSalida
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      tSalida - tEntrada
    )
  );
};

/*
 * Calcula cuánto del segmento completo
 * cae dentro de una zona.
 */
const calcularLongitudDentroZona = (
  geometria,
  zona
) => {
  if (
    !Array.isArray(geometria) ||
    geometria.length < 2
  ) {
    return 0;
  }

  let longitudTotal = 0;
  let longitudDentro = 0;

  for (
    let i = 0;
    i < geometria.length - 1;
    i++
  ) {
    const puntoA =
      geometria[i];

    const puntoB =
      geometria[i + 1];

    const longitudTramo =
      distanciaPlano(
        puntoA,
        puntoB
      );

    if (
      longitudTramo <= 0
    ) {
      continue;
    }

    longitudTotal +=
      longitudTramo;

    const proporcion =
      proporcionDentroRectangulo(
        puntoA,
        puntoB,
        zona
      );

    longitudDentro +=
      longitudTramo *
      proporcion;
  }

  if (
    longitudTotal <= 0
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      longitudDentro /
        longitudTotal
    )
  );
};

/*
 * ==========================================================
 * RIESGO DE SEGMENTOS
 * ==========================================================
 */

const clasificarNivel = (
  puntaje
) => {
  if (puntaje <= 33) {
    return "Bajo";
  }

  if (puntaje <= 66) {
    return "Medio";
  }

  return "Alto";
};

const calcularRiesgoSegmento = (
  segmento,
  zonas
) => {
  const zonasIntersectadas = [];

  let sumaPonderada = 0;
  let pesoTotal = 0;

  for (
    const zona of zonas
  ) {
    const limites =
      obtenerLimitesZona(
        zona.id_zona
      );

    if (!limites) {
      continue;
    }

    const proporcion =
      calcularLongitudDentroZona(
        segmento.geometria,
        limites
      );

    if (
      proporcion <= 0
    ) {
      continue;
    }

    const puntaje =
      Number(
        zona.puntajeFinal
      );

    if (
      !Number.isFinite(
        puntaje
      )
    ) {
      continue;
    }

    zonasIntersectadas.push({
      id_zona:
        zona.id_zona,

      nivel:
        zona.nivel,

      puntajeFinal:
        puntaje,

      proporcion:
        Number(
          proporcion.toFixed(4)
        ),
    });

    sumaPonderada +=
      puntaje *
      proporcion;

    pesoTotal +=
      proporcion;
  }

  if (
    pesoTotal === 0
  ) {
    return {
      puntajeRiesgo: 0,
      nivelRiesgo: "Bajo",
      zonasIntersectadas: [],
      cantidadZonasIntersectadas: 0,
    };
  }

  const puntajeRiesgo =
    sumaPonderada /
    pesoTotal;

  return {
    puntajeRiesgo:
      Number(
        puntajeRiesgo.toFixed(2)
      ),

    nivelRiesgo:
      clasificarNivel(
        puntajeRiesgo
      ),

    zonasIntersectadas,

    cantidadZonasIntersectadas:
      zonasIntersectadas.length,
  };
};

/*
 * ==========================================================
 * OBTENER RED CON RIESGO
 * ==========================================================
 */

const obtenerRedPeatonalConRiesgo =
  async ({
    comuna,
    rangoHorario,
    bbox,
  }) => {
    if (!comuna) {
      throw new Error(
        "La comuna es obligatoria."
      );
    }

    const [zonas, red] =
      await Promise.all([
        obtenerZonasRiesgo({
          comuna,
          rangoHorario,
        }),

        obtenerRedPeatonal({
          comuna,
          bbox,
        }),
      ]);

    const longitudMaxima =
      obtenerLongitudMaxima(
        red
      );

    return red.map(
      (segmento) => {
        const resultado =
          calcularRiesgoSegmento(
            segmento,
            zonas
          );

        const costos =
          calcularCostoNavegacion({
            puntajeRiesgo:
              resultado.puntajeRiesgo,

            longitudMetros:
              segmento.longitud_metros,

            longitudMaxima,
          });

        return {
          ...segmento,

          puntaje_riesgo:
            resultado.puntajeRiesgo,

          nivel_riesgo:
            resultado.nivelRiesgo,

          zonas_intersectadas:
            resultado.zonasIntersectadas,

          cantidad_zonas_intersectadas:
            resultado.cantidadZonasIntersectadas,

          costo_riesgo:
            costos.costo_riesgo,

          costo_distancia:
            costos.costo_distancia,

          costo_navegacion:
            costos.costo_navegacion,
        };
      }
    );
  };

module.exports = {
  obtenerRedPeatonalConRiesgo,
  calcularRiesgoSegmento,
  obtenerLimitesZona,
  calcularLongitudDentroZona,
  proporcionDentroRectangulo,
};