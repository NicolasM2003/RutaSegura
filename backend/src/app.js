require("dotenv").config();

const express = require("express");
const delitosRoutes = require("./routes/delitos.routes");
const riesgoRoutes = require("./routes/riesgo.routes");
const geografiaRoutes = require("./routes/geografia.routes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/delitos", delitosRoutes);
app.use("/api/riesgo", riesgoRoutes);
app.use("/api/geografia", geografiaRoutes);

module.exports = app;