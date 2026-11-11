const express = require("express");

const {
  obtenerRuta,
  obtenerRutasAlternativas,
} = require("../controllers/ruta.controller");

const router = express.Router();

/**
 * @openapi
 * /api/rutas/alternativas:
 *   get:
 *     tags:
 *       - Rutas
 *     summary: Obtener rutas alternativas
 *     description: >-
 *       Calcula alternativas con costo por arista = distancia_metros * (peso_distancia +
 *       peso_riesgo * riesgo_normalizado). costo_navegacion es la suma usada por Dijkstra,
 *       expresada en metros ponderados; distancia_metros es distancia física.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema:
 *           type: string
 *         description: Comuna donde se calcula la ruta.
 *         example: Viña del Mar
 *       - in: query
 *         name: origen_lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitud del origen.
 *         example: -33.0245
 *       - in: query
 *         name: origen_lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitud del origen.
 *         example: -71.5518
 *       - in: query
 *         name: destino_lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitud del destino.
 *         example: -33.0472
 *       - in: query
 *         name: destino_lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitud del destino.
 *         example: -71.6127
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema:
 *           type: string
 *         description: Rango horario utilizado para considerar el riesgo.
 *         example: "20:00 - 23:59"
 *     responses:
 *       "200":
 *         description: Resultado del cálculo de rutas alternativas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - encontrada
 *                 - cantidad_rutas
 *                 - rutas
 *               properties:
 *                 encontrada:
 *                   type: boolean
 *                   example: true
 *                 cantidad_rutas:
 *                   type: integer
 *                   example: 3
 *                 mensaje:
 *                   type: string
 *                   description: Mensaje opcional sobre las rutas disponibles.
 *                 rutas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       perfil_ruta:
 *                         type: string
 *                         description: Perfil usado para calcular la alternativa.
 *                         enum: [menor_riesgo, equilibrada, mas_rapida]
 *                         example: menor_riesgo
 *                       nombre_perfil_ruta:
 *                         type: string
 *                         example: Menor riesgo
 *                       encontrada:
 *                         type: boolean
 *                       origen:
 *                         type: object
 *                         properties:
 *                           latitud:
 *                             type: number
 *                           longitud:
 *                             type: number
 *                           nodo_mas_cercano:
 *                             oneOf:
 *                               - type: string
 *                               - type: integer
 *                           distancia_al_nodo_metros:
 *                             type: number
 *                       destino:
 *                         type: object
 *                         properties:
 *                           latitud:
 *                             type: number
 *                           longitud:
 *                             type: number
 *                           nodo_mas_cercano:
 *                             oneOf:
 *                               - type: string
 *                               - type: integer
 *                           distancia_al_nodo_metros:
 *                             type: number
 *                       distancia_metros:
 *                         type: number
 *                         example: 4864.86
 *                       tiempo_estimado_minutos:
 *                         type: number
 *                         example: 67.6
 *                       costo_navegacion:
 *                         type: number
 *                         description: Costo acumulado de Dijkstra, en metros ponderados. Se conserva la precisión numérica de Dijkstra; para sumas externas se admite tolerancia IEEE-754 de 1e-9 * max(1, abs(costo_navegacion)).
 *                       puntaje_riesgo:
 *                         type: number
 *                         example: 24.95
 *                       nivel_riesgo:
 *                         type: string
 *                         enum:
 *                           - Bajo
 *                           - Medio
 *                           - Alto
 *                       cantidad_segmentos:
 *                         type: integer
 *                         example: 184
 *                       zonas_riesgo_afectadas:
 *                         type: array
 *                         items:
 *                           type: string
 *                       geometria:
 *                         type: array
 *                         description: Coordenadas de la ruta como pares de latitud y longitud.
 *                         items:
 *                           type: array
 *                           minItems: 2
 *                           maxItems: 2
 *                           items:
 *                             type: number
 *                       nodos_ruta:
 *                         type: array
 *                         items:
 *                           oneOf:
 *                             - type: string
 *                             - type: integer
 *                       segmentos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             distancia_metros: { type: number, description: Distancia física del segmento en metros. }
 *                             costo_riesgo: { type: number, description: Campo legado de diagnóstico, distancia física por riesgo normalizado, en metros; no es el costo ponderado de Dijkstra. }
 *                             costo_distancia: { type: number, description: Campo legado de diagnóstico, componente distancia con peso base 0.3, en metros; no es necesariamente el peso usado por un perfil. }
 *                             costo_arista: { type: number, description: Alias de compatibilidad de costo_arista_operativo, con precisión completa de Dijkstra y en metros ponderados. }
 *                             costo_arista_operativo: { type: number, description: Costo utilizado por Dijkstra para este segmento, con precisión completa y en metros ponderados. }
 *                             costo_acumulado_ruta: { type: number, description: Suma de los pesos de Dijkstra hasta este segmento, con precisión completa y en metros ponderados. }
 *                 interpretacion_ia:
 *                   type: object
 *                   description: Se incluye cuando hay rutas; una falla de IA se indica sin retirar las rutas calculadas.
 *                   properties:
 *                     disponible: { type: boolean }
 *                     mensaje: { type: string }
 *                     resumen_general: { type: string }
 *                     recomendacion:
 *                       type: object
 *                       properties:
 *                         perfil_ruta: { type: string, enum: [menor_riesgo, equilibrada, mas_rapida] }
 *                         motivo: { type: string }
 *                     comparaciones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           perfil_ruta: { type: string }
 *                           explicacion: { type: string }
 *                     consideraciones: { type: array, items: { type: string } }
 *       "400":
 *         description: Error durante el cálculo de las rutas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get(
  "/alternativas",
  obtenerRutasAlternativas
);

/**
 * @openapi
 * /api/rutas:
 *   get:
 *     tags:
 *       - Rutas
 *     summary: Calcular ruta peatonal segura
 *     description: >-
 *       Calcula una ruta con costo por arista = distancia_metros * (peso_distancia +
 *       peso_riesgo * riesgo_normalizado). costo_navegacion es la suma usada por Dijkstra,
 *       expresada en metros ponderados; distancia_metros es distancia física.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema:
 *           type: string
 *         example: Viña del Mar
 *       - in: query
 *         name: origen_lat
 *         required: true
 *         schema:
 *           type: number
 *         example: -33.0245
 *       - in: query
 *         name: origen_lon
 *         required: true
 *         schema:
 *           type: number
 *         example: -71.5518
 *       - in: query
 *         name: destino_lat
 *         required: true
 *         schema:
 *           type: number
 *         example: -33.0472
 *       - in: query
 *         name: destino_lon
 *         required: true
 *         schema:
 *           type: number
 *         example: -71.6127
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema:
 *           type: string
 *         example: "20:00 - 23:59"
 *     responses:
 *       "200":
 *         description: Resultado del cálculo de la ruta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 encontrada:
 *                   type: boolean
 *                   example: true
 *                 mensaje:
 *                   type: string
 *                   description: Se incluye cuando no se encontró conexión entre origen y destino.
 *                 origen:
 *                   type: object
 *                   properties:
 *                     latitud:
 *                       type: number
 *                     longitud:
 *                       type: number
 *                     nodo_mas_cercano:
 *                       oneOf:
 *                         - type: string
 *                         - type: integer
 *                     distancia_al_nodo_metros:
 *                       type: number
 *                 destino:
 *                   type: object
 *                   properties:
 *                     latitud:
 *                       type: number
 *                     longitud:
 *                       type: number
 *                     nodo_mas_cercano:
 *                       oneOf:
 *                         - type: string
 *                         - type: integer
 *                     distancia_al_nodo_metros:
 *                       type: number
 *                 distancia_metros:
 *                   type: number
 *                 tiempo_estimado_minutos:
 *                   type: number
 *                 costo_navegacion:
 *                   type: number
 *                   description: Costo acumulado de Dijkstra, en metros ponderados. Se conserva la precisión numérica de Dijkstra; para sumas externas se admite tolerancia IEEE-754 de 1e-9 * max(1, abs(costo_navegacion)).
 *                 puntaje_riesgo:
 *                   type: number
 *                 nivel_riesgo:
 *                   type: string
 *                   enum:
 *                     - Bajo
 *                     - Medio
 *                     - Alto
 *                 cantidad_segmentos:
 *                   type: integer
 *                 zonas_riesgo_afectadas:
 *                   type: array
 *                   items:
 *                     type: string
 *                 geometria:
 *                   type: array
 *                   items:
 *                     type: array
 *                     minItems: 2
 *                     maxItems: 2
 *                     items:
 *                       type: number
 *                 nodos_ruta:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - type: string
 *                       - type: integer
 *                 segmentos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       distancia_metros: { type: number, description: Distancia física del segmento en metros. }
 *                       costo_riesgo: { type: number, description: Campo legado de diagnóstico, distancia física por riesgo normalizado, en metros; no es el costo ponderado de Dijkstra. }
 *                       costo_distancia: { type: number, description: Campo legado de diagnóstico, componente distancia con peso base 0.3, en metros; no es necesariamente el peso usado por un perfil. }
 *                       costo_arista: { type: number, description: Alias de compatibilidad de costo_arista_operativo, con precisión completa de Dijkstra y en metros ponderados. }
 *                       costo_arista_operativo: { type: number, description: Costo utilizado por Dijkstra para este segmento, con precisión completa y en metros ponderados. }
 *                       costo_acumulado_ruta: { type: number, description: Suma de los pesos de Dijkstra hasta este segmento, con precisión completa y en metros ponderados. }
 *       "400":
 *         description: Error durante el cálculo de la ruta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get(
  "/",
  obtenerRuta
);

module.exports = router;
