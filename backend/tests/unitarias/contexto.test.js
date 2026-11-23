
const {
  construirContextoRutaIA,
  construirContextoRutasIA,
} = require("../../src/services/ia/contexto");

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

describe("construirContextoRutasIA", () => {
  const origen = {
    latitud: -33.0472,
    longitud: -71.6127,
  };

  const destino = {
    latitud: -33.036,
    longitud: -71.6296,
  };

  const rutas = [
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
  ];

  test("debe construir correctamente el contexto de varias rutas y sus diferencias", () => {
    const resultado = construirContextoRutasIA({
      origen,
      destino,
      rutas,
      rango_horario: "20:00 - 23:59",
      perfilSeleccionado: "equilibrada",
      perfilMasSeguro: "menor_riesgo",
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

      cantidad_rutas: 2,

      perfil_seleccionado: "equilibrada",
      perfil_mas_seguro: "menor_riesgo",

      rutas: [
        {
          perfil_ruta: "menor_riesgo",
          nombre_perfil_ruta: "Menor riesgo",
          distancia_metros: 1200,
          tiempo_estimado_minutos: 15,
          nivel_riesgo: "Bajo",
          puntaje_riesgo: 22.5,
          cantidad_segmentos: 8,
          cantidad_zonas_riesgo_afectadas: 1,
          zonas_riesgo_afectadas: ["zona_1"],

          comparacion_con_menor_riesgo: {
            perfil_referencia: "menor_riesgo",
            nombre_perfil_referencia: "Menor riesgo",
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
        },

        {
          perfil_ruta: "equilibrada",
          nombre_perfil_ruta: "Equilibrada",
          distancia_metros: 864,
          tiempo_estimado_minutos: 12,
          nivel_riesgo: "Medio",
          puntaje_riesgo: 42.06,
          cantidad_segmentos: 30,
          cantidad_zonas_riesgo_afectadas: 0,
          zonas_riesgo_afectadas: [],

          comparacion_con_menor_riesgo: {
            perfil_referencia: "menor_riesgo",
            nombre_perfil_referencia: "Menor riesgo",
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
        },
      ],

      rango_horario: "20:00 - 23:59",
    });
  });

  test("debe comparar las alternativas aunque no se identifique la ruta de menor riesgo", () => {
    const resultado = construirContextoRutasIA({
      origen,
      destino,
      rutas,
      perfilSeleccionado: "equilibrada",
      perfilMasSeguro: "perfil_inexistente",
    });

    expect(resultado.perfil_mas_seguro).toBe(
      "perfil_inexistente"
    );

    resultado.rutas.forEach((ruta) => {
      expect(
        ruta.comparacion_con_menor_riesgo
      ).toBeNull();

      expect(
        ruta.comparaciones_con_otras_rutas
      ).toHaveLength(1);
    });

    expect(
      resultado.rutas[1].comparaciones_con_otras_rutas[0]
    ).toEqual({
      perfil_referencia: "menor_riesgo",
      nombre_perfil_referencia: "Menor riesgo",
      diferencia_distancia_metros: -336,
      diferencia_tiempo_minutos: -3,
      diferencia_puntaje_riesgo: 19.56,
    });
  });

  test("debe conservar null cuando falta alguna métrica", () => {
    const rutasConDatosIncompletos = [
      {
        perfil_ruta: "menor_riesgo",
        distancia_metros: 1200,
        tiempo_estimado_minutos: null,
        puntaje_riesgo: 22.5,
        zonas_riesgo_afectadas: [],
      },
      {
        perfil_ruta: "equilibrada",
        distancia_metros: 864,
        tiempo_estimado_minutos: 12,
        puntaje_riesgo: 42.06,
        zonas_riesgo_afectadas: [],
      },
    ];

    const resultado = construirContextoRutasIA({
      origen,
      destino,
      rutas: rutasConDatosIncompletos,
      perfilMasSeguro: "menor_riesgo",
    });

    expect(
      resultado.rutas[1].comparacion_con_menor_riesgo
    ).toEqual({
      perfil_referencia: "menor_riesgo",
      nombre_perfil_referencia: null,
      diferencia_distancia_metros: -336,
      diferencia_tiempo_minutos: null,
      diferencia_puntaje_riesgo: 19.56,
    });

    expect(
      resultado.rutas[1].comparaciones_con_otras_rutas[0]
    ).toEqual({
      perfil_referencia: "menor_riesgo",
      nombre_perfil_referencia: null,
      diferencia_distancia_metros: -336,
      diferencia_tiempo_minutos: null,
      diferencia_puntaje_riesgo: 19.56,
    });
  });

  test("debe devolver una lista vacía de comparaciones cuando solo existe una ruta", () => {
    const resultado = construirContextoRutasIA({
      origen,
      destino,
      rutas: [rutas[0]],
      perfilSeleccionado: "menor_riesgo",
      perfilMasSeguro: "menor_riesgo",
    });

    expect(
      resultado.rutas[0].comparaciones_con_otras_rutas
    ).toEqual([]);

    expect(
      resultado.rutas[0].comparacion_con_menor_riesgo
    ).toEqual({
      perfil_referencia: "menor_riesgo",
      nombre_perfil_referencia: "Menor riesgo",
      diferencia_distancia_metros: 0,
      diferencia_tiempo_minutos: 0,
      diferencia_puntaje_riesgo: 0,
    });
  });
});
