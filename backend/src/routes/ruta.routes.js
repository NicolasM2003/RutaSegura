const express = require("express");

const {
  obtenerRuta,
  obtenerRutasAlternativas,
} = require("../controllers/ruta.controller");

const router = express.Router();

router.get(
  "/alternativas",
  obtenerRutasAlternativas
);

router.get(
  "/",
  obtenerRuta
);

module.exports = router;