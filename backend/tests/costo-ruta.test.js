require("dotenv").config();

const {
  calcularCostoRiesgo,
  normalizarDistancia,
} = require("../src/services/costo-ruta.service");

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

const {
  PESO_RIESGO,
  PESO_DISTANCIA,
} = require("../src/services/costo-ruta.service");

describe("Pesos del costo de navegación", () => {
  test("el peso de riesgo debe ser 0.7", () => {
    expect(PESO_RIESGO).toBe(0.7);
  });

  test("el peso de distancia debe ser 0.3", () => {
    expect(PESO_DISTANCIA).toBe(0.3);
  });

  test("los pesos deben sumar 1", () => {
    expect(
      PESO_RIESGO + PESO_DISTANCIA
    ).toBe(1);
  });
});

const {
  calcularCostoNavegacion,
} = require("../src/services/costo-ruta.service");

describe("Cálculo del costo de navegación", () => {
  test("debe calcular el costo considerando 70% riesgo y 30% distancia", () => {
    const resultado =
      calcularCostoNavegacion({
        puntajeRiesgo: 50,
        longitudMetros: 50,
        longitudMaxima: 100,
      });

    expect(
      resultado.costo_riesgo
    ).toBe(0.5);

    expect(
      resultado.costo_distancia
    ).toBe(0.5);

    expect(
      resultado.costo_navegacion
    ).toBe(0.5);
  });

  test("debe calcular correctamente cuando riesgo y distancia son diferentes", () => {
    const resultado =
      calcularCostoNavegacion({
        puntajeRiesgo: 100,
        longitudMetros: 20,
        longitudMaxima: 100,
      });

    expect(
      resultado.costo_riesgo
    ).toBe(1);

    expect(
      resultado.costo_distancia
    ).toBe(0.2);

    expect(
      resultado.costo_navegacion
    ).toBe(0.76);
  });
});

describe("Validación modelo 70% riesgo / 30% distancia", () => {
  test("debe ponderar 70% riesgo y 30% distancia", () => {
    const resultado = calcularCostoNavegacion({
      puntajeRiesgo: 50,
      longitudMetros: 50,
      longitudMaxima: 100,
    });

    expect(resultado.costo_riesgo).toBe(0.5);
    expect(resultado.costo_distancia).toBe(0.5);
    expect(resultado.costo_navegacion).toBe(0.5);
  });

  test("debe dar mayor peso al riesgo que a la distancia", () => {
    const resultado = calcularCostoNavegacion({
      puntajeRiesgo: 100,
      longitudMetros: 20,
      longitudMaxima: 100,
    });

    expect(resultado.costo_riesgo).toBe(1);
    expect(resultado.costo_distancia).toBe(0.2);
    expect(resultado.costo_navegacion).toBe(0.76);
  });
});

describe("Pruebas según nivel de riesgo", () => {
  test("riesgo bajo", () => {
    const resultado = calcularCostoNavegacion({
      puntajeRiesgo: 20,
      longitudMetros: 50,
      longitudMaxima: 100,
    });

    expect(resultado.costo_riesgo).toBe(0.2);
    expect(resultado.costo_navegacion).toBe(0.29);
  });

  test("riesgo medio", () => {
    const resultado = calcularCostoNavegacion({
      puntajeRiesgo: 50,
      longitudMetros: 50,
      longitudMaxima: 100,
    });

    expect(resultado.costo_riesgo).toBe(0.5);
    expect(resultado.costo_navegacion).toBe(0.5);
  });

  test("riesgo alto", () => {
    const resultado = calcularCostoNavegacion({
      puntajeRiesgo: 90,
      longitudMetros: 50,
      longitudMaxima: 100,
    });

    expect(resultado.costo_riesgo).toBe(0.9);
    expect(resultado.costo_navegacion).toBe(0.78);
  });
});

describe("Uso del costo como peso del grafo", () => {
  test("el costo de navegación debe ser un valor numérico válido para una arista", () => {
    const resultado = calcularCostoNavegacion({
      puntajeRiesgo: 60,
      longitudMetros: 100,
      longitudMaxima: 200,
    });

    expect(typeof resultado.costo_navegacion).toBe("number");
    expect(resultado.costo_navegacion).toBeGreaterThanOrEqual(0);
    expect(resultado.costo_navegacion).toBeLessThanOrEqual(1);
  });

  test("el costo de una arista de mayor riesgo debe ser mayor", () => {
    const bajo = calcularCostoNavegacion({
      puntajeRiesgo: 20,
      longitudMetros: 100,
      longitudMaxima: 200,
    });

    const alto = calcularCostoNavegacion({
      puntajeRiesgo: 80,
      longitudMetros: 100,
      longitudMaxima: 200,
    });

    expect(alto.costo_navegacion).toBeGreaterThan(
      bajo.costo_navegacion
    );
  });
});