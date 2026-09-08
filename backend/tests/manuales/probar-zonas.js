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

    // Mostrar todas las zonas
    for (const zona of zonas) {
      console.log("----------------------------------------");
      console.log(`Zona: ${zona.id_zona}`);
      console.log(`Cantidad delitos: ${zona.cantidad_delitos}`);
      console.log(`Delitos horario: ${zona.delitos_en_horario}`);
      console.log(`Latitud: ${zona.latitud}`);
      console.log(`Longitud: ${zona.longitud}`);
      console.log(`Puntaje tipo: ${zona.puntajeTipo}`);
      console.log(`Puntaje cantidad: ${zona.puntajeCantidad}`);
      console.log(`Puntaje horario: ${zona.puntajeHorario}`);
      console.log(`Puntaje final: ${zona.puntajeFinal}`);
      console.log(`Nivel: ${zona.nivel}`);
    }

    // Buscar zona con mayor concentración
    const mayorZona = zonas.reduce(
      (max, zona) =>
        zona.cantidad_delitos > max.cantidad_delitos
          ? zona
          : max,
      zonas[0]
    );

    // Información importante al FINAL
    console.log("\n\n");
    console.log("========================================");
    console.log("           RESUMEN DE RESULTADOS");
    console.log("========================================");
    console.log(`Zonas encontradas: ${zonas.length}`);
    console.log("");
    console.log("Zona con mayor concentración:");
    console.log(`Zona: ${mayorZona.id_zona}`);
    console.log(`Cantidad de delitos: ${mayorZona.cantidad_delitos}`);
    console.log(`Delitos en horario: ${mayorZona.delitos_en_horario}`);
    console.log(`Latitud: ${mayorZona.latitud}`);
    console.log(`Longitud: ${mayorZona.longitud}`);
    console.log(`Puntaje tipo: ${mayorZona.puntajeTipo}`);
    console.log(`Puntaje cantidad: ${mayorZona.puntajeCantidad}`);
    console.log(`Puntaje horario: ${mayorZona.puntajeHorario}`);
    console.log(`Puntaje final: ${mayorZona.puntajeFinal}`);
    console.log(`Nivel: ${mayorZona.nivel}`);
    console.log("========================================");
    console.log("========================================");

  } catch (error) {
    console.error("Error:", error);
  }
};

ejecutar();