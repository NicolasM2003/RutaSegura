const express = require("express");

const {
  obtenerGeografia,
  obtenerRedPeatonalController,
  obtenerGrafoPeatonalController,
  obtenerNodoCercanoController,
} = require("../controllers/geografia.controller");

const router = express.Router();

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