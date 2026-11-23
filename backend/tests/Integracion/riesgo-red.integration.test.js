require("dotenv").config();

const {
  obtenerRedPeatonalConRiesgo,
} = require("../../src/services/riesgo-red.service");

describe("Integración - Riesgo de segmentos peatonales", () => {
  const COMUNA = "Viña del Mar";
  const RANGO_HORARIO = "20:00 - 23:59";

  const obtenerResultado = async () =>
    obtenerRedPeatonalConRiesgo({
      comuna: COMUNA,
      rangoHorario: RANGO_HORARIO,
    });

  test(
    "debe obtener segmentos peatonales con información de riesgo",
    async () => {
      const resultado = await obtenerResultado();

      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);

      const segmento = resultado[0];

      expect(segmento).toHaveProperty("puntaje_riesgo");
      expect(segmento).toHaveProperty("nivel_riesgo");
      expect(segmento).toHaveProperty("zonas_intersectadas");
      expect(segmento).toHaveProperty("cantidad_zonas_intersectadas");

      expect(
        Number.isFinite(Number(segmento.puntaje_riesgo))
      ).toBe(true);

      expect(
        Array.isArray(segmento.zonas_intersectadas)
      ).toBe(true);

      expect(Number(segmento.puntaje_riesgo)).toBeGreaterThanOrEqual(0);
      expect(Number(segmento.puntaje_riesgo)).toBeLessThanOrEqual(100);
    },
    60000
  );

  test(
    "debe mantener coherencia entre zonas intersectadas y cantidad de zonas",
    async () => {
      const resultado = await obtenerResultado();

      expect(resultado.length).toBeGreaterThan(0);

      for (const segmento of resultado) {
        expect(
          segmento.cantidad_zonas_intersectadas
        ).toBe(
          segmento.zonas_intersectadas.length
        );
      }
    },
    60000
  );

  test(
    "debe conservar información de riesgo para segmentos con y sin intersecciones",
    async () => {
      const resultado = await obtenerResultado();

      const conInterseccion = resultado.find(
        (segmento) =>
          segmento.cantidad_zonas_intersectadas > 0
      );

      const sinInterseccion = resultado.find(
        (segmento) =>
          segmento.cantidad_zonas_intersectadas === 0
      );

      expect(conInterseccion).toBeDefined();
      expect(sinInterseccion).toBeDefined();

      // Segmento que intersecta una o más zonas.
      expect(
        conInterseccion.zonas_intersectadas.length
      ).toBeGreaterThan(0);

      expect(
        conInterseccion.cantidad_zonas_intersectadas
      ).toBe(
        conInterseccion.zonas_intersectadas.length
      );

      // Segmento que no intersecta zonas temporales.
      expect(
        sinInterseccion.zonas_intersectadas
      ).toEqual([]);

      expect(
        sinInterseccion.cantidad_zonas_intersectadas
      ).toBe(0);

      // Aunque no tenga zonas intersectadas, puede tener riesgo histórico.
      const puntajeSinInterseccion = Number(
        sinInterseccion.puntaje_riesgo
      );

      expect(
        Number.isFinite(puntajeSinInterseccion)
      ).toBe(true);

      expect(puntajeSinInterseccion).toBeGreaterThanOrEqual(0);
      expect(puntajeSinInterseccion).toBeLessThanOrEqual(100);
    },
    60000
  );
});
