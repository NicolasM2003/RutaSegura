const mockResponsesCreate = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    responses: {
      create: mockResponsesCreate,
    },
  }))
);

const {
  interpretarRutasAlternativas,
} = require("../../src/services/ia/interpretacion-rutas.service");

describe("Integración del servicio de interpretación de rutas", () => {
  const datosRuta = {
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

  const respuestaControlada = {
    output_text: JSON.stringify({
      resumen_general:
        "Las rutas presentan diferentes distancias y niveles de riesgo.",

      recomendacion: {
        perfil_ruta: "menor_riesgo",
        motivo:
          "Presenta el menor puntaje de riesgo entre las alternativas recibidas.",
      },

      comparaciones: [
        {
          perfil_ruta: "menor_riesgo",
          explicacion:
            "Presenta un puntaje de riesgo menor según los datos recibidos.",
        },
        {
          perfil_ruta: "equilibrada",
          explicacion:
            "Tiene una distancia menor y un puntaje de riesgo mayor.",
        },
      ],

      consideraciones: [
        "Los resultados se basan en las métricas calculadas por RutaSegura.",
      ],
    }),
  };

  beforeEach(() => {
    mockResponsesCreate.mockReset();

    process.env.OPENAI_API_KEY = "test-api-key";
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    process.env.OPENAI_TIMEOUT_MS = "12000";
    process.env.OPENAI_MAX_RETRIES = "0";
  });

  test("debe completar el flujo desde el contexto hasta la respuesta validada", async () => {
    mockResponsesCreate.mockResolvedValue(
      respuestaControlada
    );

    const resultado =
      await interpretarRutasAlternativas(datosRuta);

    // Se realizó una solicitud al cliente simulado.
    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);

    const solicitud =
      mockResponsesCreate.mock.calls[0][0];

    // Se utiliza el modelo configurado.
    expect(solicitud.model).toBe("gpt-4o-mini");

    expect(solicitud.text.format.type).toBe("json_schema");
    expect(solicitud.text.format.name).toBe("interpretacion_rutas");

    // La solicitud contiene las instrucciones y el contexto.
    expect(solicitud.instructions).toContain("RutaSegura");
    expect(solicitud.max_output_tokens).toBe(600);

    const contextoEnviado = JSON.parse(solicitud.input);

    expect(contextoEnviado.comuna).toBe("Viña del Mar");
    expect(contextoEnviado.cantidad_rutas).toBe(2);
    expect(contextoEnviado.rutas).toHaveLength(2);

    // La respuesta se devuelve después de validarse.
    expect(resultado.comparaciones).toHaveLength(2);

    expect(
      resultado.comparaciones.map(
        (comparacion) => comparacion.perfil_ruta
      )
    ).toEqual([
      "menor_riesgo",
      "equilibrada",
    ]);

    expect(resultado.resumen_general).toContain(
      "diferentes distancias"
    );
  });

  test("debe rechazar una respuesta controlada con JSON inválido", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: "Respuesta que no es JSON",
    });

    await expect(
      interpretarRutasAlternativas(datosRuta)
    ).rejects.toMatchObject({
      code: "IA_JSON_INVALIDO",
    });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
  });

  test("debe normalizar un error de API sin entregar una interpretación", async () => {
    mockResponsesCreate.mockRejectedValue(
      Object.assign(new Error("Rate limit"), {
        status: 429,
      })
    );

    await expect(
      interpretarRutasAlternativas(datosRuta)
    ).rejects.toMatchObject({
      name: "OpenAIServiceError",
      code: "OPENAI_RATE_LIMIT",
      status: 429,
    });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
  });

  test("no debe llamar a OpenAI si hay perfiles duplicados", async () => {
    const datosInvalidos = {
      ...datosRuta,

      resultado: {
        ...datosRuta.resultado,

        rutas: [
          datosRuta.resultado.rutas[0],

          {
            ...datosRuta.resultado.rutas[1],
            perfil_ruta: "menor_riesgo",
          },
        ],
      },
    };

    await expect(
      interpretarRutasAlternativas(datosInvalidos)
    ).rejects.toMatchObject({
      code: "IA_PERFILES_ESPERADOS_INVALIDOS",
    });

    expect(mockResponsesCreate).not.toHaveBeenCalled();
  });
});