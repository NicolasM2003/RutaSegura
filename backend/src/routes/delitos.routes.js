const express = require("express");
const { obtenerDelitos } = require("../controllers/delitos.controller");

const router = express.Router();

/**
 * @openapi
 * /api/delitos:
 *   get:
 *     tags: [Delitos]
 *     summary: Consultar delitos registrados
 *     description: Devuelve delitos ordenados por fecha descendente. Los filtros son opcionales; una comuna inexistente produce una lista vacía.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema: { type: string }
 *         example: Viña del Mar
 *       - in: query
 *         name: fecha_desde
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Fecha mínima inclusiva con formato YYYY-MM-DD.
 *         example: '2025-01-01'
 *       - in: query
 *         name: fecha_hasta
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Fecha máxima inclusiva con formato YYYY-MM-DD.
 *         example: '2025-12-31'
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['00:00 - 03:59', '04:00 - 07:59', '08:00 - 11:59', '12:00 - 15:59', '16:00 - 19:59', '20:00 - 23:59']
 *         example: '20:00 - 23:59'
 *     responses:
 *       '200':
 *         description: Lista de resultados y cantidad devuelta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [data, total]
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [id, fecha, rango_horario, clasificacion, familia_delito, grupo_delito, lugar, comuna, region, latitud, longitud, fuente]
 *                     properties:
 *                       id: { oneOf: [{ type: string }, { type: integer }] }
 *                       fecha: { type: string, format: date }
 *                       rango_horario: { type: string, example: '20:00 - 23:59' }
 *                       clasificacion: { type: string, nullable: true }
 *                       familia_delito: { type: string, nullable: true }
 *                       grupo_delito: { type: string, nullable: true }
 *                       lugar: { type: string, nullable: true }
 *                       comuna: { type: string, nullable: true }
 *                       region: { type: string, nullable: true }
 *                       latitud: { type: number, nullable: true, example: -33.024 }
 *                       longitud: { type: number, nullable: true, example: -71.551 }
 *                       fuente: { type: string, nullable: true }
 *                 total: { type: integer, minimum: 0, example: 1 }
 *       '400':
 *         description: Fecha con formato inválido, fechas invertidas o rango horario fuera de los valores admitidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *                 rangos_validos: { type: array, items: { type: string } }
 *       '500':
 *         description: Falló la consulta de delitos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: No fue posible obtener los delitos. }
 */
router.get("/", obtenerDelitos);

module.exports = router;
