const express = require("express");
const { buscarDireccionController } = require("../controllers/geocoding.controller");

const {
  obtenerGeografia,
  obtenerRedPeatonalController,
  obtenerGrafoPeatonalController,
  obtenerNodoCercanoController,
} = require("../controllers/geografia.controller");

const router = express.Router();

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
 *       properties:
 *         latitud: { type: number }
 *         longitud: { type: number }
 *     SegmentoPeatonal:
 *       type: object
 *       description: Atributos OSM y persistidos del segmento; varias etiquetas pueden ser nulas.
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
 *         cantidad_nodos: { type: integer }
 *         longitud_metros: { type: number }
 *         geometria: { type: array, items: { $ref: '#/components/schemas/PuntoGeografico' } }
 *     NodoPeatonal:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         latitud: { type: number }
 *         longitud: { type: number }
 *         conexiones: { type: array, items: { type: string } }
 *         distancia_metros: { type: number, description: Presente cuando se devuelve el nodo más cercano. }
 *         cantidad_conexiones: { type: integer, description: Presente para nodo_mas_conectado del resumen de conectividad. }
 *     AristaPeatonal:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         id_osm: { oneOf: [{ type: string }, { type: integer }] }
 *         nodo_origen: { type: string }
 *         nodo_destino: { type: string }
 *         distancia_metros: { type: number }
 *         puntaje_riesgo: { type: number, minimum: 0, maximum: 100 }
 *         nivel_riesgo: { type: string, enum: [Bajo, Medio, Alto] }
 *         costo_riesgo: { type: number, description: Componente de riesgo por segmento en metros, compatibilidad. }
 *         costo_distancia: { type: number, description: Componente de distancia ponderada por segmento en metros, compatibilidad. }
 *         costo_arista: { type: number, description: Costo operativo base 30/70 por segmento en metros ponderados. }
 *         zonas_intersectadas: { type: array, items: { $ref: '#/components/schemas/ZonaIntersectada' } }
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
 *     ZonaIntersectada:
 *       type: object
 *       properties:
 *         id_zona: { type: string }
 *         nivel: { type: string, enum: [Bajo, Medio, Alto] }
 *         puntajeFinal: { type: number }
 *         proporcion: { type: number, minimum: 0, maximum: 1 }
 */

/**
 * @openapi
 * /api/geografia/buscar-direccion:
 *   get:
 *     tags: [Geografía]
 *     summary: Buscar una dirección
 *     description: Busca hasta diez resultados en Chile mediante el geocodificador configurado. lat y lon deben enviarse juntos; radio solo aplica junto a ambos.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 3, maxLength: 200 }
 *         description: Texto de búsqueda, recortado de espacios en los extremos.
 *         example: Plaza Sucre, Viña del Mar
 *       - in: query
 *         name: lat
 *         required: false
 *         schema: { type: number, minimum: -90, maximum: 90 }
 *         example: -33.0245
 *       - in: query
 *         name: lon
 *         required: false
 *         schema: { type: number, minimum: -180, maximum: 180 }
 *         example: -71.5518
 *       - in: query
 *         name: radio
 *         required: false
 *         schema: { type: number, minimum: 100, maximum: 4000, default: 4000 }
 *         description: Radio en metros; el controlador solo valida este valor cuando lat y lon están presentes.
 *         example: 1500
 *     responses:
 *       '200':
 *         description: Direcciones encontradas y atribución de datos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [data, attribution]
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [latitud, longitud, etiqueta]
 *                     properties:
 *                       latitud: { type: number }
 *                       longitud: { type: number }
 *                       etiqueta: { type: string }
 *                       distanciaMetros: { type: integer, description: Presente únicamente al enviar referencia geográfica. }
 *                 attribution: { type: string, example: 'Geocodificación © OpenStreetMap contributors' }
 *       '400':
 *         description: Texto o punto de referencia inválido, parámetros lat/lon incompletos o radio fuera de límites.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 *       '502':
 *         description: El geocodificador no respondió correctamente.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 */
router.get("/buscar-direccion", buscarDireccionController);

/**
 * @openapi
 * /api/geografia:
 *   get:
 *     tags: [Geografía]
 *     summary: Consultar zonas geográficas de riesgo
 *     description: Devuelve zonas calculadas a partir de delitos con coordenadas. comuna y rango_horario son filtros opcionales.
 *     parameters:
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema: { type: string }
 *         example: Viña del Mar
 *       - in: query
 *         name: rango_horario
 *         required: false
 *         schema: { type: string, enum: ['00:00 - 03:59', '04:00 - 07:59', '08:00 - 11:59', '12:00 - 15:59', '16:00 - 19:59', '20:00 - 23:59'] }
 *     responses:
 *       '200':
 *         description: Zonas y cantidad devuelta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { type: object, properties: { id_zona: { type: string }, cantidad_delitos: { type: integer }, delitos_en_horario: { type: integer }, puntajeTipo: { type: number }, latitud: { type: number, nullable: true }, longitud: { type: number, nullable: true }, puntajeCantidad: { type: number }, puntajeHorario: { type: number }, puntajeFinal: { type: number }, nivel: { type: string, enum: [Bajo, Medio, Alto] } } } }
 *                 total: { type: integer }
 *       '500':
 *         description: No se pudieron consultar los datos geográficos.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } } }
 */
router.get(
  "/",
  obtenerGeografia
);

/**
 * @openapi
 * /api/geografia/red-peatonal:
 *   get:
 *     tags: [Geografía]
 *     summary: Consultar segmentos de la red peatonal
 *     description: Filtra segmentos por tipo highway, comuna y/o BBOX. El tipo highway debe ser uno de los admitidos por la configuración de red peatonal.
 *     parameters:
 *       - in: query
 *         name: highway
 *         required: false
 *         schema: { type: string, enum: [footway, pedestrian, path, steps, cycleway, track, living_street, residential, unclassified, service, tertiary, secondary, primary] }
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema: { type: string }
 *         example: Viña del Mar
 *       - in: query
 *         name: bbox
 *         required: false
 *         schema: { type: string }
 *         description: Límites como minLat,minLon,maxLat,maxLon.
 *         example: '-33.08,-71.65,-33.0,-71.5'
 *     responses:
 *       '200':
 *         description: Segmentos coincidentes y cantidad devuelta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/SegmentoPeatonal' } }
 *                 total: { type: integer }
 *       '500':
 *         description: No se pudo obtener la red peatonal (por ejemplo, por una consulta remota fallida).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/red-peatonal",
  obtenerRedPeatonalController
);

/**
 * @openapi
 * /api/geografia/grafo-peatonal:
 *   get:
 *     tags: [Geografía]
 *     summary: Consultar el grafo peatonal
 *     description: Construye un grafo con nodos, aristas, conectividad y resumen para los filtros indicados.
 *     parameters:
 *       - in: query
 *         name: highway
 *         required: false
 *         schema: { type: string, enum: [footway, pedestrian, path, steps, cycleway, track, living_street, residential, unclassified, service, tertiary, secondary, primary] }
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema: { type: string }
 *         example: Viña del Mar
 *     responses:
 *       '200':
 *         description: Grafo peatonal y estadísticas de conectividad.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [nodos, aristas, conectividad, resumen]
 *               properties:
 *                 nodos:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/NodoPeatonal' }
 *                 aristas:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AristaPeatonal' }
 *                 conectividad:
 *                   type: object
 *                   properties:
 *                     cantidad_componentes: { type: integer }
 *                     componentes: { type: array, items: { type: object, properties: { id: { type: integer }, cantidad_nodos: { type: integer } } } }
 *                     nodo_mas_conectado: { allOf: [{ $ref: '#/components/schemas/NodoPeatonal' }], nullable: true }
 *                 resumen:
 *                   type: object
 *                   properties:
 *                     cantidad_nodos: { type: integer }
 *                     cantidad_aristas: { type: integer }
 *                     cantidad_vias: { type: integer }
 *                     componentes_conectados: { type: integer }
 *                     nodo_mas_conectado: { type: object, nullable: true }
 *       '500':
 *         description: No se pudo obtener el grafo peatonal.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/grafo-peatonal",
  obtenerGrafoPeatonalController
);

/**
 * @openapi
 * /api/geografia/nodo-cercano:
 *   get:
 *     tags: [Geografía]
 *     summary: Encontrar el nodo peatonal más cercano
 *     description: Busca el nodo más cercano a un punto en el grafo resultante. No se valida rango de coordenadas en el controlador; el servicio exige valores numéricos finitos.
 *     parameters:
 *       - in: query
 *         name: latitud
 *         required: true
 *         schema: { type: number, minimum: -90, maximum: 90 }
 *         example: -33.0245
 *       - in: query
 *         name: longitud
 *         required: true
 *         schema: { type: number, minimum: -180, maximum: 180 }
 *         example: -71.5518
 *       - in: query
 *         name: highway
 *         required: false
 *         schema: { type: string, enum: [footway, pedestrian, path, steps, cycleway, track, living_street, residential, unclassified, service, tertiary, secondary, primary] }
 *       - in: query
 *         name: comuna
 *         required: false
 *         schema: { type: string }
 *         example: Viña del Mar
 *     responses:
 *       '200':
 *         description: Nodo encontrado y coordenadas consultadas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [nodo, consulta]
 *               properties:
 *                 nodo: { $ref: '#/components/schemas/NodoPeatonal' }
 *                 consulta: { $ref: '#/components/schemas/PuntoGeografico' }
 *       '400':
 *         description: Faltan coordenadas o no son valores numéricos finitos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       '404':
 *         description: El grafo no contiene un nodo cercano.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       '500':
 *         description: No se pudo realizar la búsqueda.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/nodo-cercano",
  obtenerNodoCercanoController
);

module.exports = router;
