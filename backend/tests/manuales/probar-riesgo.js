require("dotenv").config();

const {
  calcularRiesgoZona,
} = require("../../src/services/riesgo-datos.service");

const comunas = [
  "Viña del Mar",
  "Valparaíso",
  "Concón",
];

const horarios = [
  "00:00 - 03:59",
  "08:00 - 11:59",
  "12:00 - 15:59",
  "16:00 - 19:59",
  "20:00 - 23:59",
];

// Ajustar si la cantidad máxima cambia según la comuna.
// Por ahora usamos el valor que ya utilizabas.
const cantidadMaxima = 1000;

const ejecutar = async () => {
  try {
    for (const comuna of comunas) {
      console.log("\n");
      console.log("========================================");
      console.log(`COMUNA: ${comuna}`);
      console.log("========================================");

      for (const rangoHorario of horarios) {
        const resultado = await calcularRiesgoZona({
          comuna,
          rangoHorario,
          cantidadMaxima,
        });

        console.log("----------------------------------------");
        console.log(`Horario: ${rangoHorario}`);
        console.log(`Total delitos: ${resultado.total_delitos}`);
        console.log(
          `Delitos en horario: ${resultado.delitos_en_horario}`
        );
        console.log(
          `Puntaje tipo: ${resultado.puntajeTipo}`
        );
        console.log(
          `Puntaje cantidad: ${resultado.puntajeCantidad}`
        );
        console.log(
          `Puntaje horario: ${resultado.puntajeHorario}`
        );
        console.log(
          `Puntaje final: ${resultado.puntajeFinal}`
        );
        console.log(`Nivel: ${resultado.nivel}`);
      }
    }

    console.log("\n");
    console.log("========================================");
    console.log("       PRUEBA FINALIZADA");
    console.log("========================================");

  } catch (error) {
    console.error("Error:", error);
  }
};

ejecutar();