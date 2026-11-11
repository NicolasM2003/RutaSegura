const express = require("express");

const {
  obtenerRiesgo,
  obtenerRiesgoZonas,
  obtenerRiesgoRedPeatonal,
} = require("../controllers/riesgo.controller");

const router =
  express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         error: { type: string }
 *     PuntoGeografico:
 *       type: object
 *       required: [latitud, longitud]
 *       properties:
 *         latitud: { type: number, example: -33.024 }
 *         longitud: { type: number, example: -71.551 }
 *     ZonaIntersectada:
 *       type: object
 *       properties:
 *         id_zona: { type: string }
 *         nivel: { type: string, enum: [Bajo, Medio, Alto] }
 *         puntajeFinal: { type: number }
 *         proporcion: { type: number, minimum: 0, maximum: 1 }
 *     SegmentoPeatonalConRiesgo:
 *       type: object
 *       description: Segmento de la red persistido en Supabase enriquecido con métricas calculadas.
 *       properties:
 *         id_osm: { oneOf: [{ type: string }, { type: integer }] }
 *         nombre: { type: string, nullable: true }
 *         comuna: { type: string, nullable: true }
 *         tipo: { type: string, nullable: true }
 *         categoria_peatonal: { type: string, nullable: true }
 *         superficie: { type: string, nullable: true }
 *         acceso_peatonal: { type: string, nullable: true }
 *         sidewalk: { type: string, nullable: true }
 *         footway: { type: string, nullable: true }
 *         crossing: { type: string, nullable: true }
 *         smoothness: { type: string, nullable: true }
 *         incline: { type: string, nullable: true }
 *         wheelchair: { type: string, nullable: true }
 *         width: { type: string, nullable: true }
 *         step_count: { type: integer, nullable: true }
 *         maxspeed: { type: string, nullable: true }
 *         motorroad: { type: string, nullable: true }
 *         nodo_inicio: { type: string, nullable: true }
 *         nodo_fin: { type: string, nullable: true }
 *         longitud_metros: { type: number }
 *         geometria:
 *           type: array
 *           items: { $ref: '#/components/schemas/PuntoGeografico' }
 *         puntaje_riesgo: { type: number, minimum: 0, maximum: 100 }
 *         nivel_riesgo: { type: string, enum: [Bajo, Medio, Alto] }
 *         zonas_intersectadas:
 *           type: array
 *           items: { $ref: '#/components/schemas/ZonaIntersectada' }
 *         cantidad_zonas_intersectadas: { type: integer, minimum: 0 }
 *         costo_riesgo: { type: number, description: Alias de costo_riesgo_normalizado (0 a 1), para compatibilidad. }
 *         costo_riesgo_normalizado: { type: number, minimum: 0, maximum: 1, description: Puntaje de riesgo dividido por 100. }
 *         costo_distancia: { type: number, description: Alias de costo_distancia_normalizado (0 a 1), para compatibilidad. }
 *         costo_distancia_normalizado: { type: number, minimum: 0, maximum: 1, description: Distancia del segmento dividida por la longitud máxima de la red. }
 *         costo_navegacion: { type: number, description: Alias de costo_navegacion_normalizado (0 a 1), para compatibilidad; no es costo Dijkstra. }
 *         costo_navegacion_normalizado: { type: number, minimum: 0, maximum: 1, description: Métrica normalizada de análisis de riesgo y distancia; no es costo Dijkstra. }
 */

/**
 * @openapi
 * /api/riesgo:
 *   get:
 *     tags: [Zonas de riesgo]
 *     summary: Calcular riesgo agregado de una comuna
 *     description: Calcula el puntaje agregado de delitos de la comuna; rango_horario afecta el conteo horario utilizado.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: true
 *         schema: { type: string, minLength: 1 }
 *         example: Viña del Mar
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema: { type: string, enum: ['00:00 - 03:59', '04:00 - 07:59', '08:00 - 11:59', '12:00 - 15:59', '16:00 - 19:59', '20:00 - 23:59'] }
 *         example: '20:00 - 23:59'
 *     responses:
 *       '200':
 *         description: Métricas agregadas de riesgo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comuna: { type: string }
 *                 rango_horario: { type: string, nullable: true }
 *                 total_delitos: { type: integer }
 *                 delitos_en_horario: { type: integer }
 *                 puntajeTipo: { type: number }
 *                 puntajeCantidad: { type: number }
 *                 puntajeHorario: { type: number }
 *                 puntajeFinal: { type: number, minimum: 0, maximum: 100 }
 *                 nivel: { type: string, enum: [Bajo, Medio, Alto] }
 *       '400':
 *         description: Falta el parámetro comuna.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 *       '500':
 *         description: No se pudo calcular el riesgo.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 */
router.get(
  "/",
  obtenerRiesgo
);

/**
 * @openapi
 * /api/riesgo/zonas:
 *   get:
 *     tags: [Zonas de riesgo]
 *     summary: Consultar puntajes de riesgo por zona
 *     description: Devuelve zonas espaciales agrupadas desde los delitos georreferenciados de la comuna.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: true
 *         schema: { type: string, minLength: 1 }
 *         example: Viña del Mar
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema: { type: string, enum: ['00:00 - 03:59', '04:00 - 07:59', '08:00 - 11:59', '12:00 - 15:59', '16:00 - 19:59', '20:00 - 23:59'] }
 *         example: '20:00 - 23:59'
 *     responses:
 *       '200':
 *         description: Colección de zonas y cantidad devuelta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [data, total, comuna, rango_horario]
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_zona: { type: string, example: '-8256:-17883' }
 *                       cantidad_delitos: { type: integer }
 *                       delitos_en_horario: { type: integer }
 *                       puntajeTipo: { type: number }
 *                       latitud: { type: number, nullable: true }
 *                       longitud: { type: number, nullable: true }
 *                       puntajeCantidad: { type: number }
 *                       puntajeHorario: { type: number }
 *                       puntajeFinal: { type: number, minimum: 0, maximum: 100 }
 *                       nivel: { type: string, enum: [Bajo, Medio, Alto] }
 *                 total: { type: integer }
 *                 comuna: { type: string }
 *                 rango_horario: { type: string, nullable: true }
 *       '400':
 *         description: Falta el parámetro comuna.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 *       '500':
 *         description: No se pudieron consultar las zonas.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 */
router.get(
  "/zonas",
  obtenerRiesgoZonas
);

/**
 * @openapi
 * /api/riesgo/red-peatonal:
 *   get:
 *     tags: [Zonas de riesgo]
 *     summary: Consultar la red peatonal con riesgo calculado
 *     description: Devuelve segmentos de la red peatonal con puntajes y zonas intersectadas. bbox, si se proporciona, se interpreta como minLat,minLon,maxLat,maxLon.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: true
 *         schema: { type: string, minLength: 1 }
 *         example: Viña del Mar
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema: { type: string, enum: ['00:00 - 03:59', '04:00 - 07:59', '08:00 - 11:59', '12:00 - 15:59', '16:00 - 19:59', '20:00 - 23:59'] }
 *       - in: query
 *         name: bbox
 *         required: false
 *         schema: { type: string, pattern: '^-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?$' }
 *         description: Límites en orden minLat,minLon,maxLat,maxLon.
 *         example: '-33.08,-71.65,-33.0,-71.5'
 *     responses:
 *       '200':
 *         description: Segmentos con métricas de riesgo y filtros aplicados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/SegmentoPeatonalConRiesgo' } }
 *                 total: { type: integer }
 *                 comuna: { type: string }
 *                 rango_horario: { type: string, nullable: true }
 *                 bbox: { type: string, nullable: true }
 *       '400':
 *         description: Falta comuna o el BBOX no es válido.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 *       '500':
 *         description: No se pudo calcular el riesgo de la red.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 */
router.get(
  "/red-peatonal",
  obtenerRiesgoRedPeatonal
);

module.exports = router;
