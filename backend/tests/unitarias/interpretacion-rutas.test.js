const {
  interpretarRutasAlternativas,
} = require("../../src/services/ia/interpretacion-rutas.service");

describe("interpretarRutasAlternativas", () => {
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

  const respuestaValida = {
    output_text: JSON.stringify({
      resumen_general:
        "Las rutas presentan diferentes distancias y niveles de riesgo.",

      recomendacion:{
        perfil_ruta: "menor_riesgo",
          motivo:
        "Presenta el menor puntaje de riesgo entre las alternativas recibidas.",
      },

      comparaciones: [
        {
          perfil_ruta: "menor_riesgo",
          explicacion:
            "Tiene un puntaje de riesgo menor según los datos recibidos.",
        },
        {
          perfil_ruta: "equilibrada",
          explicacion:
            "Tiene una distancia menor, pero un puntaje de riesgo mayor.",
        },
      ],

      consideraciones: [
        "El cálculo se basa en los datos disponibles.",
      ],
    }),
  };

  test("debe solicitar y validar correctamente la interpretación", async () => {
    const solicitarRespuesta = jest.fn()
      .mockResolvedValue(respuestaValida);

    const resultado = await interpretarRutasAlternativas(
      datos,
      solicitarRespuesta
    );

    expect(solicitarRespuesta).toHaveBeenCalledTimes(1);

    const [solicitud] = solicitarRespuesta.mock.calls[0];

    expect(solicitud.maxOutputTokens).toBe(600);

    const contextoEnviado = JSON.parse(solicitud.entrada);

    expect(contextoEnviado.cantidad_rutas).toBe(2);

    expect(resultado.comparaciones).toHaveLength(2);

    expect(resultado.comparaciones.map(
      (comparacion) => comparacion.perfil_ruta
    )).toEqual(["menor_riesgo", "equilibrada"]);
  });

  test("debe rechazar una respuesta inválida del modelo", async () => {
    const solicitarRespuesta = jest.fn()
      .mockResolvedValue({
        output_text: "Esto no es JSON válido",
      });

    await expect(
      interpretarRutasAlternativas(
        datos,
        solicitarRespuesta
      )
    ).rejects.toMatchObject({
      code: "IA_JSON_INVALIDO",
    });

    expect(solicitarRespuesta).toHaveBeenCalledTimes(1);
  });

  test("debe evitar llamar a OpenAI si hay perfiles duplicados", async () => {
    const solicitarRespuesta = jest.fn();

    const datosInvalidos = {
      ...datos,
      resultado: {
        ...datos.resultado,
        rutas: [
          datos.resultado.rutas[0],
          {
            ...datos.resultado.rutas[1],
            perfil_ruta: "menor_riesgo",
          },
        ],
      },
    };

    await expect(
      interpretarRutasAlternativas(
        datosInvalidos,
        solicitarRespuesta
      )
    ).rejects.toMatchObject({
      code: "IA_PERFILES_ESPERADOS_INVALIDOS",
    });

    expect(solicitarRespuesta).not.toHaveBeenCalled();
  });
});