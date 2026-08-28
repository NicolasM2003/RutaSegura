require("dotenv").config();

const {
  calcularRiesgoZona,
} = require("../../src/services/riesgo-datos.service");

const pruebas = [
  "00:00 - 03:59",
  "08:00 - 11:59",
  "12:00 - 15:59",
  "16:00 - 19:59",
  "20:00 - 23:59",
];

const ejecutar = async () => {
  try {
    for (const rangoHorario of pruebas) {
      const resultado = await calcularRiesgoZona({
        comuna: "Viña del Mar",
        rangoHorario,
        cantidadMaxima: 853,
      });

      console.log("========================================");
      console.log(`Horario: ${rangoHorario}`);
      console.log(`Total delitos: ${resultado.total_delitos}`);
      console.log(`Delitos en horario: ${resultado.delitos_en_horario}`);
      console.log(`Puntaje tipo: ${resultado.puntajeTipo}`);
      console.log(`Puntaje cantidad: ${resultado.puntajeCantidad}`);
      console.log(`Puntaje horario: ${resultado.puntajeHorario}`);
      console.log(`Puntaje final: ${resultado.puntajeFinal}`);
      console.log(`Nivel: ${resultado.nivel}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

ejecutar();