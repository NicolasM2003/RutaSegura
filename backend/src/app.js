require("dotenv").config();

const express = require("express");
const cors = require("cors");
const delitosRoutes = require("./routes/delitos.routes");
const riesgoRoutes = require("./routes/riesgo.routes");
const geografiaRoutes = require("./routes/geografia.routes");
const rutaRoutes = require("./routes/ruta.routes");

const app = express();
app.use(cors());

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/delitos", delitosRoutes);
app.use("/api/riesgo", riesgoRoutes);
app.use("/api/geografia", geografiaRoutes);
app.use("/api/rutas", rutaRoutes);

module.exports = app;