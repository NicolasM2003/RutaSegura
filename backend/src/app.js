require("dotenv").config();

const express = require("express");
const delitosRoutes = require("./routes/delitos.routes");

const app = express();


app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/delitos", delitosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});