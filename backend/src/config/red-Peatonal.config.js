/*
 * ==========================================
 * CONFIGURACIÓN DE RED PEATONAL
 * ==========================================
 *
 * Estas reglas definen qué tipos de vías
 * pueden formar parte de la red peatonal
 */

/*
 * Todos los tipos de highway que se
 * considera potencialmente utilizables.
 */
const HIGHWAY_VALIDOS = [
  "footway",
  "pedestrian",
  "path",
  "steps",
  "cycleway",
  "track",
  "living_street",
  "residential",
  "unclassified",
  "service",
  "tertiary",
  "secondary",
  "primary",
];

/*
 * Tipos de vías excluidos explícitamente.
 *
 * No deben formar parte de una ruta peatonal.
 */
const HIGHWAY_EXCLUIDOS = [
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
];

/*
 * Infraestructura principalmente peatonal.
 *
 * Se consideran vías de uso peatonal directo.
 */
const HIGHWAY_EXCLUSIVOS_PEATONALES = [
  "footway",
  "pedestrian",
  "path",
  "steps",
];

/*
 * Vías urbanas compartidas.
 *
 * Los peatones pueden circular por ellas,
 * pero no corresponden exclusivamente
 * a infraestructura peatonal.
 */
const HIGHWAY_COMPARTIDOS = [
  "living_street",
  "residential",
  "unclassified",
  "service",
  "tertiary",
  "secondary",
  "primary",
];

/*
 * Tipos que solo se incorporan a la red
 * cuando OSM declara explícitamente
 * acceso peatonal.
 */
const HIGHWAY_ACCESO_PEATONAL_EXPLICITO = [
  "cycleway",
  "track",
];

/*
 * Valores de OSM aceptados para indicar
 * acceso peatonal.
 */
const FOOT_PERMITIDOS = [
  "yes",
  "designated",
  "permissive",
];

module.exports = {
  HIGHWAY_VALIDOS,
  HIGHWAY_EXCLUIDOS,
  HIGHWAY_EXCLUSIVOS_PEATONALES,
  HIGHWAY_COMPARTIDOS,
  HIGHWAY_ACCESO_PEATONAL_EXPLICITO,
  FOOT_PERMITIDOS,
};