const PESO_RIESGO = 0.7;
const PESO_DISTANCIA = 0.3;

const normalizarDistancia = (
  longitudMetros,
  longitudMaxima
) => {
  const distancia = Number(
    longitudMetros
  );

  const maximo = Number(
    longitudMaxima
  );

  if (
    !Number.isFinite(distancia) ||
    distancia < 0
  ) {
    throw new Error(
      "La longitud del segmento debe ser un número no negativo."
    );
  }

  if (
    !Number.isFinite(maximo) ||
    maximo <= 0
  ) {
    return 0;
  }

  return Math.min(
    distancia / maximo,
    1
  );
};

const calcularCostoRiesgo = (
  puntajeRiesgo
) => {
  const riesgo = Number(
    puntajeRiesgo
  );

  if (
    !Number.isFinite(riesgo)
  ) {
    return 0;
  }

  return Math.min(
    Math.max(riesgo / 100, 0),
    1
  );
};

const calcularCostoNavegacion = ({
  puntajeRiesgo,
  longitudMetros,
  longitudMaxima,
}) => {
  const costoRiesgo =
    calcularCostoRiesgo(
      puntajeRiesgo
    );

  const costoDistancia =
    normalizarDistancia(
      longitudMetros,
      longitudMaxima
    );

  const costoNavegacion =
    PESO_RIESGO *
      costoRiesgo +
    PESO_DISTANCIA *
      costoDistancia;

  return {
    costo_riesgo: Number(
      costoRiesgo.toFixed(4)
    ),

    costo_distancia: Number(
      costoDistancia.toFixed(4)
    ),

    costo_navegacion: Number(
      costoNavegacion.toFixed(4)
    ),
  };
};

const obtenerLongitudMaxima =
  (segmentos) => {
    const longitudes =
      segmentos
        .map((segmento) =>
          Number(
            segmento.longitud_metros
          )
        )
        .filter(
          (valor) =>
            Number.isFinite(valor) &&
            valor >= 0
        );

    if (
      longitudes.length === 0
    ) {
      return 0;
    }

    return Math.max(
      ...longitudes
    );
  };

module.exports = {
  PESO_RIESGO,
  PESO_DISTANCIA,
  normalizarDistancia,
  calcularCostoRiesgo,
  calcularCostoNavegacion,
  obtenerLongitudMaxima,
};