const {
  validarRespuestaModelo,
} = require("../../src/services/ia/validar-respuesta.service");

describe("validarRespuestaModelo", () => {
  const perfiles = ["menor_riesgo", "equilibrada"];

  const respuestaValida = {
    output_text: JSON.stringify({
      resumen_general:
        "Las alternativas presentan diferencias de distancia y riesgo.",

      recomendacion: {
        perfil_ruta: "menor_riesgo",
        motivo:
          "Presenta el menor puntaje de riesgo entre las alternativas.",
      },

      comparaciones: [
        {
          perfil_ruta: "menor_riesgo",
          explicacion:
            "Presenta el menor puntaje de riesgo entre las alternativas.",
        },
        {
          perfil_ruta: "equilibrada",
          explicacion:
            "Ofrece un recorrido más corto, con un puntaje de riesgo mayor.",
        },
      ],

      consideraciones: [
        "Los resultados se basan en las métricas calculadas por RutaSegura.",
      ],
    }),
  };

  test("debe aceptar una respuesta con la estructura esperada", () => {
    const resultado = validarRespuestaModelo(
      respuestaValida,
      perfiles
    );

    expect(resultado.resumen_general).toContain(
      "diferencias de distancia y riesgo"
    );

    expect(resultado.recomendacion).toEqual({
      perfil_ruta: "menor_riesgo",
      motivo:
        "Presenta el menor puntaje de riesgo entre las alternativas.",
    });

    expect(resultado.comparaciones).toHaveLength(2);

    expect(
      resultado.comparaciones.map(
        (comparacion) => comparacion.perfil_ruta
      )
    ).toEqual(perfiles);

    expect(resultado.consideraciones).toHaveLength(1);
  });

  test("debe rechazar una respuesta vacía", () => {
    expect(() =>
      validarRespuestaModelo(
        { output_text: "" },
        perfiles
      )
    ).toThrow(
      expect.objectContaining({
        code: "IA_RESPUESTA_VACIA",
      })
    );
  });

  test("debe rechazar un JSON inválido", () => {
    expect(() =>
      validarRespuestaModelo(
        { output_text: "Esto no es JSON" },
        perfiles
      )
    ).toThrow(
      expect.objectContaining({
        code: "IA_JSON_INVALIDO",
      })
    );
  });

  test("debe rechazar una respuesta sin todas las comparaciones", () => {
    const respuesta = {
      output_text: JSON.stringify({
        resumen_general: "Resumen válido.",

        recomendacion: {
          perfil_ruta: "menor_riesgo",
          motivo: "Tiene el menor puntaje de riesgo.",
        },

        comparaciones: [
          {
            perfil_ruta: "menor_riesgo",
            explicacion: "Explicación válida.",
          },
        ],

        consideraciones: [],
      }),
    };

    expect(() =>
      validarRespuestaModelo(respuesta, perfiles)
    ).toThrow(
      expect.objectContaining({
        code: "IA_COMPARACIONES_INVALIDAS",
      })
    );
  });

  test("debe rechazar un perfil inventado en las comparaciones", () => {
    const datos = JSON.parse(respuestaValida.output_text);

    datos.comparaciones[0].perfil_ruta =
      "ruta_inexistente";

    expect(() =>
      validarRespuestaModelo(
        { output_text: JSON.stringify(datos) },
        perfiles
      )
    ).toThrow(
      expect.objectContaining({
        code: "IA_PERFIL_INVALIDO",
      })
    );
  });

  test("debe rechazar un perfil duplicado en las comparaciones", () => {
    const datos = JSON.parse(respuestaValida.output_text);

    datos.comparaciones[1].perfil_ruta =
      "menor_riesgo";

    expect(() =>
      validarRespuestaModelo(
        { output_text: JSON.stringify(datos) },
        perfiles
      )
    ).toThrow(
      expect.objectContaining({
        code: "IA_PERFIL_INVALIDO",
      })
    );
  });

  test("debe rechazar una recomendación que no corresponda a una ruta existente", () => {
    const datos = JSON.parse(respuestaValida.output_text);

    datos.recomendacion.perfil_ruta =
      "ruta_inexistente";

    expect(() =>
      validarRespuestaModelo(
        { output_text: JSON.stringify(datos) },
        perfiles
      )
    ).toThrow(
      expect.objectContaining({
        code: "IA_PERFIL_RECOMENDADO_INVALIDO",
      })
    );
  });

  test("debe rechazar campos obligatorios con valores inválidos", () => {
    const datos = JSON.parse(respuestaValida.output_text);

    datos.resumen_general = "";

    expect(() =>
      validarRespuestaModelo(
        { output_text: JSON.stringify(datos) },
        perfiles
      )
    ).toThrow(
      expect.objectContaining({
        code: "IA_CAMPO_INVALIDO",
      })
    );
  });
});