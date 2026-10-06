const { construirContextoRutaIA } = require("../../src/services/ia/contexto");

describe("construirContextoRutaIA", () => {
  test("debe construir correctamente el contexto de una ruta para la IA", () => {
    const origen = {
      latitud: -33.0472,
      longitud: -71.6127,
    };

    const destino = {
      latitud: -33.036,
      longitud: -71.6296,
    };

    const ruta = {
      distancia_metros: 864,
      nivel_riesgo: "Medio",
      puntaje_riesgo: 42.06,
      cantidad_segmentos: 30,
      zonas_riesgo_afectadas: [],
    };

    const resultado = construirContextoRutaIA({
      origen,
      destino,
      ruta,
      rango_horario: "20:00 - 23:59",
    });

    expect(resultado).toEqual({
      origen: {
        latitud: -33.0472,
        longitud: -71.6127,
      },
      destino: {
        latitud: -33.036,
        longitud: -71.6296,
      },
      distancia_metros: 864,
      nivel_riesgo: "Medio",
      puntaje_riesgo: 42.06,
      cantidad_segmentos: 30,
      zonas_riesgo_afectadas: [],
      rango_horario: "20:00 - 23:59",
    });
  });
});