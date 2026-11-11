require("dotenv").config();

const express = require("express");
const cors = require("cors");
const delitosRoutes = require("./routes/delitos.routes");
const riesgoRoutes = require("./routes/riesgo.routes");
const geografiaRoutes = require("./routes/geografia.routes");
const rutaRoutes = require("./routes/ruta.routes");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();
app.use(cors());

app.use(express.json());

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Sistema]
 *     summary: Comprobar disponibilidad del backend
 *     description: Devuelve el estado del proceso Express.
 *     responses:
 *       "200":
 *         description: El backend está respondiendo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok]
 *                   example: ok
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

/**
 * @openapi
 * /api-docs.json:
 *   get:
 *     tags: [Sistema]
 *     summary: Obtener la especificación OpenAPI
 *     description: Devuelve el documento OpenAPI generado que también consume la interfaz Swagger UI.
 *     responses:
 *       '200':
 *         description: Especificación OpenAPI 3.0.3.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [openapi, info, paths]
 *               properties:
 *                 openapi: { type: string, example: '3.0.3' }
 *                 info: { type: object }
 *                 servers: { type: array, items: { type: object } }
 *                 tags: { type: array, items: { type: object } }
 *                 paths: { type: object, additionalProperties: true }
 *                 components: { type: object, additionalProperties: true }
 */
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

app.use("/api/delitos", delitosRoutes);
app.use("/api/riesgo", riesgoRoutes);
app.use("/api/geografia", geografiaRoutes);
app.use("/api/rutas", rutaRoutes);

module.exports = app;
