const PESO_RIESGO = 0.7;
const PESO_DISTANCIA = 0.3;

/** Costo operativo de una arista en unidades de metros ponderados. */
const calcularCostoOperativoArista = (
  distanciaMetros,
  riesgoNormalizado,
  pesoDistancia,
  pesoRiesgo
) => {
  const entradas = [distanciaMetros, riesgoNormalizado, pesoDistancia, pesoRiesgo];
  if (entradas.some((valor) =>
    valor === null || valor === undefined || typeof valor === "boolean" ||
    (typeof valor === "string" && valor.trim() === "")
  )) {
    throw new Error("La distancia, el riesgo y los pesos deben ser valores numéricos.");
  }

  const distancia = Number(distanciaMetros);
  const riesgo = Number(riesgoNormalizado);
  const pesoD = Number(pesoDistancia);
  const pesoR = Number(pesoRiesgo);

  if (!Number.isFinite(distancia) || distancia < 0) {
    throw new Error("La distancia debe ser un número finito no negativo.");
  }
  if (!Number.isFinite(riesgo) || riesgo < 0 || riesgo > 1) {
    throw new Error("El riesgo normalizado debe estar entre 0 y 1.");
  }
  if (!Number.isFinite(pesoD) || pesoD < 0 || !Number.isFinite(pesoR) || pesoR < 0) {
    throw new Error("Los pesos deben ser números finitos no negativos.");
  }

  return distancia * (pesoD + pesoR * riesgo);
};

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
  calcularCostoOperativoArista,
  normalizarDistancia,
  calcularCostoRiesgo,
  calcularCostoNavegacion,
  obtenerLongitudMaxima,
};
