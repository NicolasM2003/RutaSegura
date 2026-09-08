require("dotenv").config();

const {
  obtenerZonasRiesgo,
} = require("../src/services/zonas-riesgo.service");

describe("Pruebas de zonas de riesgo", () => {
  const comunas = [
    "Viña del Mar",
    "Valparaíso",
    "Concón",
  ];

  test.each(comunas)(
    "genera zonas de riesgo para %s",
    async (comuna) => {
      const zonas = await obtenerZonasRiesgo({
        comuna,
        rangoHorario: "20:00 - 23:59",
      });

      expect(Array.isArray(zonas)).toBe(true);
      expect(zonas.length).toBeGreaterThan(0);
    }
  );

  test("cada zona contiene los datos necesarios para el mapa", async () => {
    const zonas = await obtenerZonasRiesgo({
      comuna: "Viña del Mar",
      rangoHorario: "20:00 - 23:59",
    });

    expect(zonas.length).toBeGreaterThan(0);

    const zona = zonas[0];

    expect(zona).toHaveProperty("id_zona");
    expect(zona).toHaveProperty("cantidad_delitos");
    expect(zona).toHaveProperty("delitos_en_horario");
    expect(zona).toHaveProperty("latitud");
    expect(zona).toHaveProperty("longitud");
    expect(zona).toHaveProperty("puntajeTipo");
    expect(zona).toHaveProperty("puntajeCantidad");
    expect(zona).toHaveProperty("puntajeHorario");
    expect(zona).toHaveProperty("puntajeFinal");
    expect(zona).toHaveProperty("nivel");
  });

  test("el puntaje de cantidad se calcula respecto de la zona con mayor concentración", async () => {
    const zonas = await obtenerZonasRiesgo({
      comuna: "Viña del Mar",
      rangoHorario: "20:00 - 23:59",
    });

    const cantidadMaxima = Math.max(
      ...zonas.map((zona) => zona.cantidad_delitos)
    );

    const zonaMaxima = zonas.find(
      (zona) => zona.cantidad_delitos === cantidadMaxima
    );

    expect(zonaMaxima.puntajeCantidad).toBe(100);
  });
});