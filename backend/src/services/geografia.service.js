const {
  obtenerZonasRiesgo,
} = require("./zonas-riesgo.service");

const obtenerDatosGeograficos = async ({
  comuna,
  rangoHorario,
}) => {
  return obtenerZonasRiesgo({
    comuna,
    rangoHorario,
  });
};

module.exports = {
  obtenerDatosGeograficos,
};