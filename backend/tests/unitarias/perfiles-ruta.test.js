const {
  PERFILES_RUTA,
} = require("../../src/config/perfiles-ruta.config");

describe("Perfiles de cálculo de rutas", () => {
  test("debe definir los tres perfiles esperados", () => {
    expect(Object.keys(PERFILES_RUTA)).toEqual([
      "menor_riesgo",
      "equilibrada",
      "mas_rapida",
    ]);
  });

  test("los pesos de cada perfil deben sumar 1", () => {
    Object.values(PERFILES_RUTA).forEach((perfil) => {
      expect(
        perfil.peso_riesgo + perfil.peso_distancia
      ).toBeCloseTo(1);

      expect(perfil.peso_riesgo).toBeGreaterThanOrEqual(0);
      expect(perfil.peso_distancia).toBeGreaterThanOrEqual(0);
    });
  });

  test("el perfil de menor riesgo debe priorizar la seguridad", () => {
    expect(
      PERFILES_RUTA.menor_riesgo.peso_riesgo
    ).toBeGreaterThan(
      PERFILES_RUTA.menor_riesgo.peso_distancia
    );
  });

  test("el perfil equilibrado debe dar el mismo peso a ambos factores", () => {
    expect(
      PERFILES_RUTA.equilibrada.peso_riesgo
    ).toBe(0.5);

    expect(
      PERFILES_RUTA.equilibrada.peso_distancia
    ).toBe(0.5);
  });

  test("el perfil más rápido debe priorizar la distancia", () => {
    expect(
      PERFILES_RUTA.mas_rapida.peso_distancia
    ).toBeGreaterThan(
      PERFILES_RUTA.mas_rapida.peso_riesgo
    );
  });
});