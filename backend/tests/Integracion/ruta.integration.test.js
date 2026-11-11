require("dotenv").config();

const { calcularRutaSegura } = require("../../src/services/ruta.service");

describe("Integración de ruta origen a destino", () => {
  test("debe calcular una ruta válida entre origen y destino", async () => {
    const resultado = await calcularRutaSegura({
      comuna: "Viña del Mar",
      origen: {
        latitud: -33.024,
        longitud: -71.551,
      },
      destino: {
        latitud: -33.015,
        longitud: -71.535,
      },
    });

    expect(resultado.encontrada).toBe(true);

    expect(resultado.origen.nodo_mas_cercano).toBeDefined();
    expect(resultado.destino.nodo_mas_cercano).toBeDefined();

    expect(resultado.distancia_metros).toBeGreaterThan(0);
    expect(resultado.costo_navegacion).toBeGreaterThan(0);

    expect(resultado.puntaje_riesgo).toBeGreaterThanOrEqual(0);
    expect(resultado.puntaje_riesgo).toBeLessThanOrEqual(100);

    expect(["Bajo", "Medio", "Alto"]).toContain(
      resultado.nivel_riesgo
    );

    expect(resultado.cantidad_segmentos).toBeGreaterThan(0);
    expect(Array.isArray(resultado.segmentos)).toBe(true);
  });
});
