require("dotenv").config();

const {
  obtenerZonasRiesgo,
} = require("../../src/services/zonas-riesgo.service");

const ejecutar = async () => {
  try {
    const zonas = await obtenerZonasRiesgo({
      comuna: "Viña del Mar",
      rangoHorario: "20:00 - 23:59",
    });

    for (const zona of zonas) {
      console.log("----------------------------------------");
      console.log(`Zona: ${zona.id_zona}`);
      console.log(`Cantidad delitos: ${zona.cantidad_delitos}`);
      console.log(`Delitos horario: ${zona.delitos_en_horario}`);
      console.log(`Latitud: ${zona.latitud}`);
      console.log(`Longitud: ${zona.longitud}`);
      console.log(`Puntaje: ${zona.puntajeFinal}`);
      console.log(`Nivel: ${zona.nivel}`);
    }

    console.log("\n========================================");
    console.log(`Zonas encontradas: ${zonas.length}`);
    console.log("========================================");
  } catch (error) {
    console.error("Error:", error);
  }
};

ejecutar();