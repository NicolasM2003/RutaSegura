const {
  obtenerGrafoPeatonal,
  obtenerNodoMasCercano,
} = require("./grafo-peatonal.service");

const buscarNodoCercano = async ({
  latitud,
  longitud,
  comuna,
  highway,
} = {}) => {
  const lat = Number(latitud);
  const lon = Number(longitud);

  if (!Number.isFinite(lat)) {
    throw new Error(
      "La latitud no es válida."
    );
  }

  if (!Number.isFinite(lon)) {
    throw new Error(
      "La longitud no es válida."
    );
  }

  const grafo =
    await obtenerGrafoPeatonal({
      comuna,
      highway,
    });

  const nodo =
    obtenerNodoMasCercano(
      grafo.nodos,
      lat,
      lon
    );

  if (!nodo) {
    return null;
  }

  return {
    nodo,
    consulta: {
      latitud: lat,
      longitud: lon,
    },
  };
};

module.exports = {
  buscarNodoCercano,
};