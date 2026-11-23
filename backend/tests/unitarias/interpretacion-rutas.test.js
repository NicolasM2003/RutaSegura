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

    // Preferencia seleccionada por el usuario.
    perfilSeleccionado: "equilibrada",

    resultado: {
      encontrada: true,
      cantidad_rutas: 2,

      // Perfil principal utilizado para generar las rutas.
      perfil_principal: "equilibrada",

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
        "Las rutas presentan diferentes distancias y niveles de riesgo. El usuario seleccionó la alternativa equilibrada.",

      recomendacion: {
        perfil_ruta: "menor_riesgo",
        motivo:
          "Presenta el menor puntaje de riesgo entre las alternativas recibidas.",
      },

      comparaciones: [
        {
          perfil_ruta: "menor_riesgo",
          explicacion:
            "Tiene un puntaje de riesgo de 22.5 y prioriza la seguridad peatonal.",
        },
        {
          perfil_ruta: "equilibrada",
          explicacion:
            "Tiene una distancia menor, pero un puntaje de riesgo de 42.06, superior al de la alternativa más segura.",
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

    // Comprobar información de las rutas.
    expect(contextoEnviado.cantidad_rutas).toBe(2);
    expect(contextoEnviado.rutas).toHaveLength(2);

    // Comprobar que se envíe la preferencia del usuario.
    expect(contextoEnviado.perfil_seleccionado)
      .toBe("equilibrada");

    // Comprobar que el backend determine la ruta más segura.
    expect(contextoEnviado.perfil_mas_seguro)
      .toBe("menor_riesgo");

    // Comprobar la respuesta validada.
    expect(resultado.comparaciones).toHaveLength(2);

    expect(
      resultado.comparaciones.map(
        (comparacion) => comparacion.perfil_ruta
      )
    ).toEqual([
      "menor_riesgo",
      "equilibrada",
    ]);

    expect(resultado.recomendacion.perfil_ruta)
      .toBe("menor_riesgo");
  });

  test("debe rechazar una recomendación que no corresponda a la ruta de menor riesgo", async () => {
    const datosRespuesta = JSON.parse(
      respuestaValida.output_text
    );

    datosRespuesta.recomendacion.perfil_ruta =
      "equilibrada";

    const respuestaIncorrecta = {
      output_text: JSON.stringify(datosRespuesta),
    };

    const solicitarRespuesta = jest.fn()
      .mockResolvedValue(respuestaIncorrecta);

    await expect(
      interpretarRutasAlternativas(
        datos,
        solicitarRespuesta
      )
    ).rejects.toMatchObject({
      code: "IA_RECOMENDACION_NO_ES_MAS_SEGURA",
    });

    expect(solicitarRespuesta).toHaveBeenCalledTimes(1);
  });

  test("debe evitar llamar a OpenAI si falta un puntaje de riesgo válido", async () => {
    const solicitarRespuesta = jest.fn();

    const datosInvalidos = {
      ...datos,

      resultado: {
        ...datos.resultado,

        rutas: [
          {
            ...datos.resultado.rutas[0],
            puntaje_riesgo: null,
          },
          datos.resultado.rutas[1],
        ],
      },
    };

    await expect(
      interpretarRutasAlternativas(
        datosInvalidos,
        solicitarRespuesta
      )
    ).rejects.toMatchObject({
      code: "IA_PUNTAJES_RIESGO_INVALIDOS",
    });

    expect(solicitarRespuesta).not.toHaveBeenCalled();
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