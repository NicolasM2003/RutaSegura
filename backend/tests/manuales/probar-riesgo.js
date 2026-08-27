require("dotenv").config();

const {
  calcularRiesgoZona,
} = require("./src/services/riesgo-datos.service");

const ejecutar = async () => {
  try {
    const resultado = await calcularRiesgoZona({
      comuna: "Viña del Mar",
      rangoHorario: "00:00 - 03:59",
      cantidadMaxima: 853,
    });

    console.log(resultado);
  } catch (error) {
    console.error("Error:", error);
  }
};

ejecutar();