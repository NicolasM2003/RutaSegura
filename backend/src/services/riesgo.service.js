const {
  PESOS_ZONA,
  REFERENCIA_CANTIDAD_ZONA,
  UMBRALES_CLASIFICACION_RIESGO,
} = require("../config/modelo-riesgo.config");

const calcularPuntajeCantidad = (cantidadDelitos, referenciaCantidad = REFERENCIA_CANTIDAD_ZONA) => {
  if (!Number.isFinite(cantidadDelitos) || cantidadDelitos < 0) {
    throw new Error("La cantidad de delitos debe ser un número no negativo.");
  }
  if (!Number.isFinite(referenciaCantidad) || referenciaCantidad <= 0) {
    throw new Error("La referencia de cantidad debe ser un número positivo.");
  }
  return Math.min(cantidadDelitos / referenciaCantidad, 1) * 100;
};

/* Se conserva como utilidad independiente, pero no forma parte del puntaje de zona. */
const calcularPuntajeHorario = (delitosEnHorario, delitosTotalesZona) => {
  if (delitosEnHorario < 0 || delitosTotalesZona < 0) {
    throw new Error("La cantidad de delitos no puede ser negativa.");
  }
  if (delitosTotalesZona === 0) return 0;
  return Math.min((delitosEnHorario / delitosTotalesZona) * 100, 100);
};

const clasificarRiesgo = (puntajeFinal) => {
  if (puntajeFinal <= UMBRALES_CLASIFICACION_RIESGO.bajoMaximo) return "Bajo";
  if (puntajeFinal <= UMBRALES_CLASIFICACION_RIESGO.medioMaximo) return "Medio";
  return "Alto";
};

const calcularRiesgo = ({
  cantidadDelitos,
  cantidadReferencia = REFERENCIA_CANTIDAD_ZONA,
  cantidadMaxima,
  puntajeTipo,
}) => {
  if (!Number.isFinite(puntajeTipo) || puntajeTipo < 0 || puntajeTipo > 100) {
    throw new Error("El puntaje de tipo debe estar entre 0 y 100.");
  }
  const referencia = cantidadMaxima ?? cantidadReferencia;
  const puntajeCantidad = calcularPuntajeCantidad(cantidadDelitos, referencia);
  const puntajeFinal = Number((
    puntajeCantidad * PESOS_ZONA.cantidad +
    puntajeTipo * PESOS_ZONA.gravedad
  ).toFixed(2));
  return {
    puntajeCantidad: Number(puntajeCantidad.toFixed(2)),
    puntajeTipo: Number(puntajeTipo.toFixed(2)),
    puntajeHorario: null,
    puntajeFinal,
    nivel: clasificarRiesgo(puntajeFinal),
    formula: "0.5 * puntajeCantidad + 0.5 * puntajeTipo; puntajeHorario no aplica a una zona ya filtrada por rango",
  };
};

module.exports = {
  calcularPuntajeCantidad,
  calcularPuntajeHorario,
  clasificarRiesgo,
  calcularRiesgo,
};
