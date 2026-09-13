const {
  obtenerZonasRiesgo,
} = require("./zonas-riesgo.service");

const {
  obtenerRedPeatonal,
} = require("./red-peatonal.service");

const {
  obtenerGrafoPeatonal,
} = require("./grafo-peatonal.service");

const {
  buscarNodoCercano,
} = require("./nodo-cercano.service");

const obtenerDatosGeograficos = async ({
  comuna,
  rangoHorario,
}) => {
  return obtenerZonasRiesgo({
    comuna,
    rangoHorario,
  });
};

const obtenerDatosRedPeatonal = async ({
  highway,
  comuna,
  bbox,
}) => {
  return obtenerRedPeatonal({
    highway,
    comuna,
    bbox,
  });
};

const obtenerDatosGrafoPeatonal = async ({
  highway,
  comuna,
}) => {
  return obtenerGrafoPeatonal({
    highway,
    comuna,
  });
};

const obtenerDatosNodoCercano = async ({
  latitud,
  longitud,
  highway,
  comuna,
}) => {
  return buscarNodoCercano({
    latitud,
    longitud,
    highway,
    comuna,
  });
};

module.exports = {
  obtenerDatosGeograficos,
  obtenerDatosRedPeatonal,
  obtenerDatosGrafoPeatonal,
  obtenerDatosNodoCercano,
};