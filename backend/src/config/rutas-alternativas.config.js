const leerEnteroPositivo = (valor, predeterminado) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : predeterminado;
};

// Pool global acotado: un worker para el perfil principal y hasta dos
// secundarios por solicitud, sin crear threads por perfil o por solicitud.
const TRABAJADORES_BUSQUEDA = Math.min(3, leerEnteroPositivo(
  process.env.RUTA_ALTERNATIVAS_TRABAJADORES,
  3,
));
const MAX_TRABAJOS_EN_COLA = leerEnteroPositivo(
  process.env.RUTA_ALTERNATIVAS_MAX_COLA,
  30,
);

// Yen conserva como máximo cinco caminos de costo ordenado por perfil,
// contando la ruta óptima. Las desviaciones también tienen un tope para
// evitar explorar sin límite si no aparecen candidatos aceptables.
const YEN_MAX_CANDIDATOS = leerEnteroPositivo(
  process.env.RUTA_YEN_MAX_CANDIDATOS,
  5,
);
const YEN_MAX_BUSQUEDAS_DESVIACION = leerEnteroPositivo(
  process.env.RUTA_YEN_MAX_DESVIACIONES,
  75,
);

module.exports = {
  TRABAJADORES_BUSQUEDA,
  MAX_TRABAJOS_EN_COLA,
  YEN_MAX_CANDIDATOS,
  YEN_MAX_BUSQUEDAS_DESVIACION,
};
