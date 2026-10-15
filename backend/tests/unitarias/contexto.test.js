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
  test("debe construir correctamente el contexto de varias rutas para la IA", () => {
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

    const resultado = construirContextoRutasIA({
      origen,
      destino,
      rutas,
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
      rango_horario: "20:00 - 23:59",
    });
  });
});