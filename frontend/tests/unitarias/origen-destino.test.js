describe("Validación de origen y destino", () => {
  const puntosCompletos = (origen, destino) =>
    origen !== null && destino !== null;

  test("debe aceptar origen y destino definidos", () => {
    const origen = {
      latitud: -33.024,
      longitud: -71.551,
    };

    const destino = {
      latitud: -33.015,
      longitud: -71.535,
    };

    expect(
      puntosCompletos(origen, destino)
    ).toBe(true);
  });

  test("debe rechazar cuando falta el origen", () => {
    const destino = {
      latitud: -33.015,
      longitud: -71.535,
    };

    expect(
      puntosCompletos(null, destino)
    ).toBe(false);
  });

  test("debe rechazar cuando falta el destino", () => {
    const origen = {
      latitud: -33.024,
      longitud: -71.551,
    };

    expect(
      puntosCompletos(origen, null)
    ).toBe(false);
  });

  test("debe rechazar cuando faltan ambos", () => {
    expect(
      puntosCompletos(null, null)
    ).toBe(false);
  });
});