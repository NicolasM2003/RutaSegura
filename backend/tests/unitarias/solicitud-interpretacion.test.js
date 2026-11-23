
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

    perfilSeleccionado: "equilibrada",

    perfilMasSeguro: "menor_riesgo",

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

    // Debe incluir las instrucciones generales.
    expect(solicitud.instrucciones).toContain(
      INSTRUCCIONES_INTERPRETACION_RUTAS
    );

    // Debe incluir todos los perfiles esperados.
    expect(solicitud.instrucciones).toContain(
      "- menor_riesgo"
    );

    expect(solicitud.instrucciones).toContain(
      "- equilibrada"
    );

    expect(solicitud.instrucciones).toContain(
      "exactamente 2"
    );

    // Debe identificar correctamente la ruta seleccionada.
    expect(solicitud.instrucciones).toMatch(
      /Perfil seleccionado por el usuario:\s*equilibrada\./
    );

    expect(solicitud.instrucciones).toMatch(
      /Nombre de la ruta seleccionada:\s*Equilibrada\./
    );

    // Debe identificar correctamente la ruta recomendada.
    expect(solicitud.instrucciones).toMatch(
      /Perfil de menor riesgo determinado por el backend:\s*menor_riesgo\./
    );

    expect(solicitud.instrucciones).toMatch(
      /Nombre de la ruta de menor riesgo:\s*Menor riesgo\./
    );

    // Debe identificar que ambas rutas son diferentes.
    expect(solicitud.instrucciones).toContain(
      "¿La ruta seleccionada coincide con la de menor riesgo?\nNO."
    );

    expect(solicitud.instrucciones).toContain(
      "CASO ACTUAL: EL USUARIO SELECCIONÓ UNA RUTA DISTINTA"
    );

    expect(solicitud.maxOutputTokens).toBe(1600);

    // Verificar el contexto general.
    expect(entrada.comuna).toBe("Viña del Mar");
    expect(entrada.cantidad_rutas).toBe(2);

    expect(entrada.perfil_seleccionado).toBe(
      "equilibrada"
    );

    expect(entrada.perfil_mas_seguro).toBe(
      "menor_riesgo"
    );

    expect(entrada.rutas).toHaveLength(2);

    // Primera ruta: menor riesgo.
    expect(entrada.rutas[0]).toMatchObject({
      perfil_ruta: "menor_riesgo",
      distancia_metros: 1200,
      tiempo_estimado_minutos: 15,
      puntaje_riesgo: 22.5,

      comparacion_con_menor_riesgo: {
        perfil_referencia: "menor_riesgo",
        diferencia_distancia_metros: 0,
        diferencia_tiempo_minutos: 0,
        diferencia_puntaje_riesgo: 0,
      },

      comparaciones_con_otras_rutas: [
        {
          perfil_referencia: "equilibrada",
          nombre_perfil_referencia: "Equilibrada",
          diferencia_distancia_metros: 336,
          diferencia_tiempo_minutos: 3,
          diferencia_puntaje_riesgo: -19.56,
        },
      ],
    });

    // Segunda ruta: equilibrada.
    expect(entrada.rutas[1]).toMatchObject({
      perfil_ruta: "equilibrada",
      distancia_metros: 864,
      tiempo_estimado_minutos: 12,
      puntaje_riesgo: 42.06,

      comparacion_con_menor_riesgo: {
        perfil_referencia: "menor_riesgo",
        diferencia_distancia_metros: -336,
        diferencia_tiempo_minutos: -3,
        diferencia_puntaje_riesgo: 19.56,
      },

      comparaciones_con_otras_rutas: [
        {
          perfil_referencia: "menor_riesgo",
          nombre_perfil_referencia: "Menor riesgo",
          diferencia_distancia_metros: -336,
          diferencia_tiempo_minutos: -3,
          diferencia_puntaje_riesgo: 19.56,
        },
      ],
    });

    // La IA no necesita recibir geometrías ni segmentos.
    expect(entrada.rutas[0]).not.toHaveProperty(
      "geometria"
    );

    expect(entrada.rutas[0]).not.toHaveProperty(
      "segmentos"
    );
  });

  test("debe identificar correctamente cuando el usuario selecciona la ruta de menor riesgo", () => {
    const solicitud =
      construirSolicitudInterpretacionRutas({
        ...datos,
        perfilSeleccionado: "menor_riesgo",
      });

    expect(solicitud.instrucciones).toContain(
      "¿La ruta seleccionada coincide con la de menor riesgo?\nSÍ."
    );

    expect(solicitud.instrucciones).toContain(
      "CASO ACTUAL: EL USUARIO YA SELECCIONÓ LA RUTA DE MENOR RIESGO."
    );

    expect(solicitud.instrucciones).not.toContain(
      "CASO ACTUAL: EL USUARIO SELECCIONÓ UNA RUTA DISTINTA"
    );

    expect(solicitud.instrucciones).toContain(
      "No digas que existe otra ruta de menor riesgo."
    );
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

    expect(INSTRUCCIONES_INTERPRETACION_RUTAS).toContain(
      "NO representa un porcentaje"
    );

    expect(INSTRUCCIONES_INTERPRETACION_RUTAS).toContain(
      "El resumen general debe ser una síntesis neutral"
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
