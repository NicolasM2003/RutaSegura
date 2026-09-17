require("dotenv").config();

const {
  proporcionDentroRectangulo,
  calcularLongitudDentroZona,
  calcularRiesgoSegmento,
  obtenerLimitesZona,
} = require("../src/services/riesgo-red.service");

describe("Intersección segmento - zona de riesgo", () => {
  /*
   * Zona correspondiente a:
   * fila -8250
   * columna -17885
   *
   * Límites:
   * lat: -33.000 a -32.996
   * lon: -71.540 a -71.536
   */
  const zona = {
    minLat: -33.0,
    maxLat: -32.996,
    minLon: -71.54,
    maxLon: -71.536,
  };

  test("segmento completamente dentro de la zona debe devolver proporción 1", () => {
    const puntoA = {
      latitud: -32.9995,
      longitud: -71.5385,
    };

    const puntoB = {
      latitud: -32.998,
      longitud: -71.5385,
    };

    const proporcion =
      proporcionDentroRectangulo(
        puntoA,
        puntoB,
        zona
      );

    expect(proporcion).toBeCloseTo(1, 4);
  });

  test("segmento parcialmente dentro de la zona debe devolver una proporción entre 0 y 1", () => {
    const puntoA = {
      latitud: -33.003,
      longitud: -71.5385,
    };

    const puntoB = {
      latitud: -32.999,
      longitud: -71.5385,
    };

    const proporcion =
      proporcionDentroRectangulo(
        puntoA,
        puntoB,
        zona
      );

    expect(proporcion).toBeGreaterThan(0);
    expect(proporcion).toBeLessThan(1);
    expect(proporcion).toBeCloseTo(
      0.25,
      2
    );
  });

  test("segmento completamente fuera de la zona debe devolver proporción 0", () => {
    const puntoA = {
      latitud: -33.005,
      longitud: -71.5385,
    };

    const puntoB = {
      latitud: -33.004,
      longitud: -71.5385,
    };

    const proporcion =
      proporcionDentroRectangulo(
        puntoA,
        puntoB,
        zona
      );

    expect(proporcion).toBe(0);
  });

  test("el cálculo de longitud dentro de una zona debe devolver un valor entre 0 y 1", () => {
    const geometria = [
      {
        latitud: -33.003,
        longitud: -71.5385,
      },
      {
        latitud: -32.999,
        longitud: -71.5385,
      },
    ];

    const proporcion =
      calcularLongitudDentroZona(
        geometria,
        zona
      );

    expect(proporcion).toBeGreaterThanOrEqual(
      0
    );

    expect(proporcion).toBeLessThanOrEqual(
      1
    );

    expect(proporcion).toBeCloseTo(
      0.25,
      2
    );
  });

  test("segmento que intersecta una zona debe registrar la zona intersectada", () => {
    const segmento = {
      geometria: [
        {
          latitud: -33.003,
          longitud: -71.5385,
        },
        {
          latitud: -32.999,
          longitud: -71.5385,
        },
      ],
    };

    const zonas = [
      {
        id_zona: "-8250:-17885",
        nivel: "Alto",
        puntajeFinal: 80,
      },
    ];

    const resultado =
      calcularRiesgoSegmento(
        segmento,
        zonas
      );

    expect(
      resultado.zonasIntersectadas.length
    ).toBe(1);

    expect(
      resultado.cantidadZonasIntersectadas
    ).toBe(1);

    expect(
      resultado.zonasIntersectadas[0].id_zona
    ).toBe("-8250:-17885");

    expect(
      resultado.zonasIntersectadas[0].proporcion
    ).toBeGreaterThan(0);

    expect(
      resultado.zonasIntersectadas[0].proporcion
    ).toBeLessThan(1);

    expect(
      resultado.puntajeRiesgo
    ).toBe(80);

    expect(
      resultado.nivelRiesgo
    ).toBe("Alto");
  });

  test("segmento sin intersección debe devolver riesgo 0", () => {
    const segmento = {
      geometria: [
        {
          latitud: -33.005,
          longitud: -71.5385,
        },
        {
          latitud: -33.004,
          longitud: -71.5385,
        },
      ],
    };

    const zonas = [
      {
        id_zona: "-8250:-17885",
        nivel: "Alto",
        puntajeFinal: 80,
      },
    ];

    const resultado =
      calcularRiesgoSegmento(
        segmento,
        zonas
      );

    expect(
      resultado.zonasIntersectadas
    ).toEqual([]);

    expect(
      resultado.cantidadZonasIntersectadas
    ).toBe(0);

    expect(
      resultado.puntajeRiesgo
    ).toBe(0);

    expect(
      resultado.nivelRiesgo
    ).toBe("Bajo");
  });
});