const {
  calcularPuntajeCantidad,
  calcularPuntajeHorario,
  clasificarRiesgo,
  calcularRiesgo,
} = require("../src/services/riesgo.service");

describe("calcularPuntajeCantidad", () => {
  test("devuelve 100 cuando la zona tiene la cantidad máxima", () => {
    expect(calcularPuntajeCantidad(40, 40)).toBe(100);
  });

  test("devuelve 50 cuando la zona tiene la mitad de delitos", () => {
    expect(calcularPuntajeCantidad(20, 40)).toBe(50);
  });
});

describe("calcularPuntajeHorario", () => {
  test("calcula correctamente la proporción de delitos del horario", () => {
    expect(calcularPuntajeHorario(10, 20)).toBe(50);
  });

  test("devuelve 0 cuando no existen delitos en la zona", () => {
    expect(calcularPuntajeHorario(0, 0)).toBe(0);
  });
});

describe("clasificarRiesgo", () => {
  test("clasifica 20 como Bajo", () => {
    expect(clasificarRiesgo(20)).toBe("Bajo");
  });

  test("clasifica 50 como Medio", () => {
    expect(clasificarRiesgo(50)).toBe("Medio");
  });

  test("clasifica 80 como Alto", () => {
    expect(clasificarRiesgo(80)).toBe("Alto");
  });
});

describe("calcularRiesgo", () => {
  test("calcula correctamente un riesgo medio", () => {
    const resultado = calcularRiesgo({
      cantidadDelitos: 20,
      cantidadMaxima: 40,
      puntajeTipo: 70,
      delitosEnHorario: 8,
      delitosTotalesZona: 20,
    });

    expect(resultado.puntajeCantidad).toBe(50);
    expect(resultado.puntajeTipo).toBe(70);
    expect(resultado.puntajeHorario).toBe(40);
    expect(resultado.puntajeFinal).toBe(54);
    expect(resultado.nivel).toBe("Medio");
  });

  test("calcula un riesgo alto con puntaje máximo", () => {
    const resultado = calcularRiesgo({
      cantidadDelitos: 40,
      cantidadMaxima: 40,
      puntajeTipo: 100,
      delitosEnHorario: 20,
      delitosTotalesZona: 20,
    });

    expect(resultado.puntajeFinal).toBe(100);
    expect(resultado.nivel).toBe("Alto");
  });
});