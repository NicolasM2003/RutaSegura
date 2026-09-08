const calcularPuntajeCantidad = (cantidadDelitos, cantidadMaxima) => {
  if (cantidadDelitos < 0 || cantidadMaxima < 0) {
    throw new Error("La cantidad de delitos no puede ser negativa.");
  }

  if (cantidadMaxima === 0) {
    return 0;
  }

  return Math.min((cantidadDelitos / cantidadMaxima) * 100, 100);
};

const calcularPuntajeHorario = (delitosEnHorario, delitosTotalesZona) => {
  if (delitosEnHorario < 0 || delitosTotalesZona < 0) {
    throw new Error("La cantidad de delitos no puede ser negativa.");
  }

  if (delitosTotalesZona === 0) {
    return 0;
  }

  return Math.min((delitosEnHorario / delitosTotalesZona) * 100, 100);
};

const clasificarRiesgo = (puntajeFinal) => {
  if (puntajeFinal <= 33) {
    return "Bajo";
  }

  if (puntajeFinal <= 66) {
    return "Medio";
  }

  return "Alto";
};

const calcularRiesgo = ({
  cantidadDelitos,
  cantidadMaxima,
  puntajeTipo,
  delitosEnHorario,
  delitosTotalesZona,
}) => {
  if (puntajeTipo < 0 || puntajeTipo > 100) {
    throw new Error("El puntaje de tipo debe estar entre 0 y 100.");
  }

  const puntajeCantidad = calcularPuntajeCantidad(
    cantidadDelitos,
    cantidadMaxima
  );

  const puntajeHorario = calcularPuntajeHorario(
    delitosEnHorario,
    delitosTotalesZona
  );

  const puntajeFinal =
    puntajeCantidad * 0.5 +
    puntajeTipo * 0.3 +
    puntajeHorario * 0.2;

  const puntajeFinalRedondeado = Number(puntajeFinal.toFixed(2));

  return {
    puntajeCantidad: Number(puntajeCantidad.toFixed(2)),
    puntajeTipo,
    puntajeHorario: Number(puntajeHorario.toFixed(2)),
    puntajeFinal: puntajeFinalRedondeado,
    nivel: clasificarRiesgo(puntajeFinalRedondeado),
  };
};

module.exports = {
  calcularPuntajeCantidad,
  calcularPuntajeHorario,
  clasificarRiesgo,
  calcularRiesgo,
};