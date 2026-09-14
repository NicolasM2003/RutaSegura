const express = require("express");

const {
  obtenerRiesgo,
  obtenerRiesgoZonas,
  obtenerRiesgoRedPeatonal,
} = require("../controllers/riesgo.controller");

const router =
  express.Router();

router.get(
  "/",
  obtenerRiesgo
);

router.get(
  "/zonas",
  obtenerRiesgoZonas
);

router.get(
  "/red-peatonal",
  obtenerRiesgoRedPeatonal
);

module.exports = router;