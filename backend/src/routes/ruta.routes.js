const express = require("express");

const {
  obtenerRuta,
} = require("../controllers/ruta.controller");

const router = express.Router();

router.get("/", obtenerRuta);

module.exports = router;