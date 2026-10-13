const {
  construirSolicitudInterpretacionRutas,
  INSTRUCCIONES_INTERPRETACION_RUTAS,
} = require("../../src/services/ia/solicitud-interpretacion.service");

describe("construirSolicitudInterpretacionRutas", () => {
  const datos = {
    comuna: "Viña del Mar",

    origen: {
      latitud: -33.0472,
      longitud: -71.6127,
    },

    destino: {
      latitud: -33.036,
      longitud: -71.6296,
    },

    rangoHorario: "20:00 - 23:59",

    resultado: {
      encontrada: true,
      cantidad_rutas: 2,

      rutas: [
        {
          perfil_ruta: "menor_riesgo",
          nombre_perfil_ruta: "Menor riesgo",
          distancia_metros: 1200,
          tiempo_estimado_minutos: 15,
          nivel_riesgo: "Bajo",
          puntaje_riesgo: 22.5,
          cantidad_segmentos: 8,
          zonas_riesgo_afectadas: ["zona_1"],
          geometria: [{ lat: -33.04, lon: -71.61 }],
          segmentos: [{ id_osm: 123 }],
        },
        {
          perfil_ruta: "equilibrada",
          nombre_perfil_ruta: "Equilibrada",
          distancia_metros: 864,
          tiempo_estimado_minutos: 12,
          nivel_riesgo: "Medio",
          puntaje_riesgo: 42.06,
          cantidad_segmentos: 30,
          zonas_riesgo_afectadas: [],
        },
      ],
    },
  };

  test("debe construir las instrucciones y el contexto de rutas múltiples", () => {
    const solicitud =
      construirSolicitudInterpretacionRutas(datos);

    const entrada = JSON.parse(solicitud.entrada);

    expect(solicitud.instrucciones).toBe(
      INSTRUCCIONES_INTERPRETACION_RUTAS
    );

    expect(solicitud.maxOutputTokens).toBe(350);

    expect(entrada.comuna).toBe("Viña del Mar");
    expect(entrada.cantidad_rutas).toBe(2);

    expect(entrada.rutas).toHaveLength(2);

    expect(entrada.rutas[0]).toMatchObject({
      perfil_ruta: "menor_riesgo",
      distancia_metros: 1200,
      puntaje_riesgo: 22.5,
    });

    expect(entrada.rutas[1]).toMatchObject({
      perfil_ruta: "equilibrada",
      distancia_metros: 864,
      puntaje_riesgo: 42.06,
    });

    expect(entrada.rutas[0]).not.toHaveProperty("geometria");
    expect(entrada.rutas[0]).not.toHaveProperty("segmentos");
  });

  test("debe incluir instrucciones para no inventar datos ni modificar el riesgo", () => {
    expect(INSTRUCCIONES_INTERPRETACION_RUTAS).toContain(
      "No inventes distancias"
    );

    expect(INSTRUCCIONES_INTERPRETACION_RUTAS).toContain(
      "No calcules rutas ni modifiques las métricas recibidas"
    );

    expect(INSTRUCCIONES_INTERPRETACION_RUTAS).toContain(
      '"comparaciones"'
    );
  });

  test("debe rechazar un resultado sin rutas disponibles", () => {
    expect(() =>
      construirSolicitudInterpretacionRutas({
        ...datos,
        resultado: {
          encontrada: false,
          cantidad_rutas: 0,
          rutas: [],
        },
      })
    ).toThrow(
      "Se requiere un resultado con al menos una ruta."
    );
  });
});