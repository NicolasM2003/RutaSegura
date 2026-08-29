const express = require("express");
const {
  obtenerGeografia,
} = require("../controllers/geografia.controller");

const router = express.Router();

router.get("/", obtenerGeografia);

module.exports = router;