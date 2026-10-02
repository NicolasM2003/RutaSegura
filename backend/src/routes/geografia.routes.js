const express = require("express");
const { buscarDireccionController } = require("../controllers/geocoding.controller");

const {
  obtenerGeografia,
  obtenerRedPeatonalController,
  obtenerGrafoPeatonalController,
  obtenerNodoCercanoController,
} = require("../controllers/geografia.controller");

const router = express.Router();

router.get("/buscar-direccion", buscarDireccionController);

router.get(
  "/",
  obtenerGeografia
);

router.get(
  "/red-peatonal",
  obtenerRedPeatonalController
);

router.get(
  "/grafo-peatonal",
  obtenerGrafoPeatonalController
);

router.get(
  "/nodo-cercano",
  obtenerNodoCercanoController
);

module.exports = router;
