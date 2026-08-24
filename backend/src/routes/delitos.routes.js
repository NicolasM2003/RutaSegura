const express = require("express");
const { obtenerDelitos } = require("../controllers/delitos.controller");

const router = express.Router();

router.get("/", obtenerDelitos);

module.exports = router;