const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

// Normalizar las rutas para evitar problemas con los
// separadores de Windows al buscar los comentarios OpenAPI.
const rutaAbsoluta = (ruta) =>
  path.resolve(__dirname, ruta).replace(/\\/g, "/");

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "RutaSegura API",
      version: "1.0.0",
      description:
        "Documentación de la API REST de RutaSegura. " +
        "Permite consultar información geográfica, zonas de riesgo " +
        "y calcular rutas peatonales seguras.",
    },

    servers: [
      {
        url:
          process.env.SWAGGER_SERVER_URL ||
          "http://localhost:3000",
        description: "Servidor local de desarrollo",
      },
    ],

    tags: [
      {
        name: "Sistema",
        description: "Estado del servidor y acceso a la especificación API",
      },
      {
        name: "Rutas",
        description: "Cálculo de rutas peatonales seguras",
      },
      {
        name: "Zonas de riesgo",
        description: "Consulta de zonas clasificadas por riesgo",
      },
      {
        name: "Delitos",
        description: "Consulta de datos delictuales",
      },
      {
        name: "Geografía",
        description: "Consultas de información geográfica",
      },
    ],
  },

  apis: [
    rutaAbsoluta("../routes/*.js"),
    rutaAbsoluta("../controllers/*.js"),
    rutaAbsoluta("../app.js"),
  ],

  failOnErrors: true,
};

module.exports = swaggerJsdoc(options);
