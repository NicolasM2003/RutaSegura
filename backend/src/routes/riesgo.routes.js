const express = require("express");
const { obtenerRiesgo } = require("../controllers/riesgo.controller");

const router = express.Router();

router.get("/", obtenerRiesgo);

module.exports = router;