const {
  calcularPuntajeCantidad,
  clasificarRiesgo,
  calcularRiesgo,
} = require("../../src/services/riesgo.service");

describe("modelo de puntaje temporal de zonas", () => {
  test("normaliza cantidad contra una referencia fija, no contra el máximo de la consulta", () => {
    expect(calcularPuntajeCantidad(3, 6)).toBe(50);
    expect(calcularPuntajeCantidad(6, 6)).toBe(100);
    expect(calcularPuntajeCantidad(12, 6)).toBe(100);
  });

  test("clasifica con límites inclusivos de 50 y 75", () => {
    expect(clasificarRiesgo(50)).toBe("Bajo");
    expect(clasificarRiesgo(50.01)).toBe("Medio");
    expect(clasificarRiesgo(74.99)).toBe("Medio");
    expect(clasificarRiesgo(75)).toBe("Medio");
    expect(clasificarRiesgo(75.01)).toBe("Alto");
  });

  test("combina cantidad y gravedad al 50/50 y excluye puntaje horario", () => {
    const resultado = calcularRiesgo({
      cantidadDelitos: 3,
      cantidadReferencia: 6,
      puntajeTipo: 70,
      delitosEnHorario: 0,
      delitosTotalesZona: 20,
    });
    expect(resultado.puntajeCantidad).toBe(50);
    expect(resultado.puntajeTipo).toBe(70);
    expect(resultado.puntajeHorario).toBeNull();
    expect(resultado.puntajeFinal).toBe(60);
    expect(resultado.nivel).toBe("Medio");
  });

  test("clasifica puntajes de zona bajo, medio y alto", () => {
    expect(calcularRiesgo({ cantidadDelitos: 3, cantidadReferencia: 6, puntajeTipo: 50 }).nivel).toBe("Bajo");
    expect(calcularRiesgo({ cantidadDelitos: 3, cantidadReferencia: 6, puntajeTipo: 70 }).nivel).toBe("Medio");
    expect(calcularRiesgo({ cantidadDelitos: 6, cantidadReferencia: 6, puntajeTipo: 90 }).nivel).toBe("Alto");
  });

  test("cambiar la etiqueta no cambia el puntaje numérico ni el costo de una arista", () => {
    const { calcularCostoOperativoArista } = require("../../src/services/costo-ruta.service");
    const zona = calcularRiesgo({ cantidadDelitos: 3, cantidadReferencia: 6, puntajeTipo: 60 });
    const costo = calcularCostoOperativoArista(100, zona.puntajeFinal / 100, 0.3, 0.7);

    expect(zona).toMatchObject({ puntajeCantidad: 50, puntajeTipo: 60, puntajeFinal: 55, nivel: "Medio" });
    expect(costo).toBeCloseTo(68.5, 10);
  });
});
