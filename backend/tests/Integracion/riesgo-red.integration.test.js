require("dotenv").config();

const {
  obtenerRedPeatonalConRiesgo,
} = require("../../src/services/riesgo-red.service");

describe("Integración - Riesgo de segmentos peatonales", () => {
  const COMUNA = "Viña del Mar";

  test(
    "debe obtener segmentos peatonales con información de riesgo",
    async () => {
      const resultado =
        await obtenerRedPeatonalConRiesgo({
          comuna: COMUNA,
        });

      expect(
        Array.isArray(resultado)
      ).toBe(true);

      expect(
        resultado.length
      ).toBeGreaterThan(0);

      const segmento =
        resultado[0];

      expect(
        segmento
      ).toHaveProperty(
        "puntaje_riesgo"
      );

      expect(
        segmento
      ).toHaveProperty(
        "nivel_riesgo"
      );

      expect(
        segmento
      ).toHaveProperty(
        "zonas_intersectadas"
      );

      expect(
        segmento
      ).toHaveProperty(
        "cantidad_zonas_intersectadas"
      );

      expect(
        Number.isFinite(
          Number(
            segmento.puntaje_riesgo
          )
        )
      ).toBe(true);

      expect(
        Array.isArray(
          segmento.zonas_intersectadas
        )
      ).toBe(true);

      expect(
        Number(
          segmento.puntaje_riesgo
        )
      ).toBeGreaterThanOrEqual(0);

      expect(
        Number(
          segmento.puntaje_riesgo
        )
      ).toBeLessThanOrEqual(100);
    },
    60000
  );

  test(
    "debe mantener coherencia entre zonas intersectadas y cantidad de zonas",
    async () => {
      const resultado =
        await obtenerRedPeatonalConRiesgo({
          comuna: COMUNA,
        });

      expect(
        resultado.length
      ).toBeGreaterThan(0);

      for (
        const segmento of resultado
      ) {
        expect(
          segmento.cantidad_zonas_intersectadas
        ).toBe(
          segmento.zonas_intersectadas.length
        );
      }
    },
    60000
  );

  const {
  calcularCostoRiesgo,
  normalizarDistancia,
} = require("../../src/services/costo-ruta.service");

describe("Normalización del puntaje de riesgo", () => {
  test("riesgo 0 debe normalizarse a 0", () => {
    expect(
      calcularCostoRiesgo(0)
    ).toBe(0);
  });

  test("riesgo 50 debe normalizarse a 0.5", () => {
    expect(
      calcularCostoRiesgo(50)
    ).toBe(0.5);
  });

  test("riesgo 100 debe normalizarse a 1", () => {
    expect(
      calcularCostoRiesgo(100)
    ).toBe(1);
  });

  test("riesgo superior a 100 debe limitarse a 1", () => {
    expect(
      calcularCostoRiesgo(120)
    ).toBe(1);
  });

  test("riesgo negativo debe limitarse a 0", () => {
    expect(
      calcularCostoRiesgo(-20)
    ).toBe(0);
  });

  test("valor no numérico debe devolver 0", () => {
    expect(
      calcularCostoRiesgo("abc")
    ).toBe(0);
  });
});

describe("Normalización del componente de distancia", () => {
  test("distancia 0 debe normalizarse a 0", () => {
    expect(
      normalizarDistancia(0, 100)
    ).toBe(0);
  });

  test("distancia igual al máximo debe normalizarse a 1", () => {
    expect(
      normalizarDistancia(100, 100)
    ).toBe(1);
  });

  test("distancia intermedia debe normalizarse correctamente", () => {
    expect(
      normalizarDistancia(50, 100)
    ).toBe(0.5);
  });

  test("distancia superior al máximo debe limitarse a 1", () => {
    expect(
      normalizarDistancia(150, 100)
    ).toBe(1);
  });

  test("distancia negativa debe generar error", () => {
    expect(() =>
      normalizarDistancia(-10, 100)
    ).toThrow();
  });

  test("longitud máxima inválida debe devolver 0", () => {
    expect(
      normalizarDistancia(50, 0)
    ).toBe(0);
  });
});

  test(
    "debe conservar información de riesgo para segmentos con y sin intersecciones",
    async () => {
      const resultado =
        await obtenerRedPeatonalConRiesgo({
          comuna: COMUNA,
        });

      const conInterseccion =
        resultado.find(
          (segmento) =>
            segmento.cantidad_zonas_intersectadas > 0
        );

      const sinInterseccion =
        resultado.find(
          (segmento) =>
            segmento.cantidad_zonas_intersectadas === 0
        );

      expect(
        conInterseccion
      ).toBeDefined();

      expect(
        sinInterseccion
      ).toBeDefined();

      expect(
        conInterseccion
          .zonas_intersectadas.length
      ).toBeGreaterThan(0);

      expect(
        sinInterseccion
          .zonas_intersectadas
      ).toEqual([]);

      expect(
        Number(
          sinInterseccion.puntaje_riesgo
        )
      ).toBe(0);
    },
    60000
  );
});
