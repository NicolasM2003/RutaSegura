/**
 * El peso del riesgo determina cuánto se penalizan
 * los segmentos con mayor riesgo.
 *
 * El peso de la distancia determina cuánto se prioriza
 * un recorrido corto.
 */

const PERFILES_RUTA = Object.freeze({
  menor_riesgo: Object.freeze({
    nombre: "Menor riesgo",
    peso_riesgo: 0.9,
    peso_distancia: 0.1,
  }),

  equilibrada: Object.freeze({
    nombre: "Equilibrada",
    peso_riesgo: 0.5,
    peso_distancia: 0.5,
  }),

  mas_rapida: Object.freeze({
    nombre: "Más rápida",
    peso_riesgo: 0.1,
    peso_distancia: 0.9,
  }),
});

module.exports = {
  PERFILES_RUTA,
};