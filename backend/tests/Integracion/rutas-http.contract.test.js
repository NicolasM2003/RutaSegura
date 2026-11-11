const request = require("supertest");

const mockRutaFixture = {
  encontrada: true,
  distancia_metros: 7.5,
  costo_navegacion: 1.123456789 + 2.234567891,
  segmentos: [
    {
      distancia_metros: 2.5,
      costo_riesgo: 1.25,
      costo_distancia: 0.75,
      costo_arista: 1.123456789,
      costo_arista_operativo: 1.123456789,
      costo_acumulado_ruta: 1.123456789,
    },
    {
      distancia_metros: 5,
      costo_riesgo: 2.5,
      costo_distancia: 1.5,
      costo_arista: 2.234567891,
      costo_arista_operativo: 2.234567891,
      costo_acumulado_ruta: 1.123456789 + 2.234567891,
    },
  ],
};

jest.mock("../../src/services/ruta.service", () => ({
  calcularRutaSegura: jest.fn(async () => mockRutaFixture),
  calcularRutasAlternativas: jest.fn(async () => ({
    encontrada: true,
    cantidad_rutas: 1,
    rutas: [mockRutaFixture],
  })),
}));

jest.mock("../../src/services/ia/interpretacion-rutas.service", () => ({
  interpretarRutasAlternativas: jest.fn(async () => ({
    resumen_general: "Prueba de contrato",
  })),
}));

const app = require("../../src/app");

const parametros =
  "?origen_lat=-33.024&origen_lon=-71.551&destino_lat=-33.015&destino_lon=-71.535";

const verificarCostosDeRuta = (ruta) => {
  expect(typeof ruta.costo_navegacion).toBe("number");
  expect(typeof ruta.segmentos[0].costo_arista_operativo).toBe("number");
  expect(typeof ruta.segmentos[0].costo_acumulado_ruta).toBe("number");

  // Campos de compatibilidad deben seguir presentes con la misma semántica.
  ruta.segmentos.forEach((segmento) => {
    expect(typeof segmento.costo_arista).toBe("number");
    expect(segmento.costo_arista).toBe(segmento.costo_arista_operativo);
    expect(typeof segmento.costo_riesgo).toBe("number");
    expect(typeof segmento.costo_distancia).toBe("number");
    expect(typeof segmento.distancia_metros).toBe("number");
  });

  const sumaSegmentos = ruta.segmentos.reduce(
    (suma, segmento) => suma + segmento.costo_arista_operativo,
    0
  );
  const tolerancia = 1e-9 * Math.max(1, Math.abs(ruta.costo_navegacion));
  expect(Math.abs(sumaSegmentos - ruta.costo_navegacion)).toBeLessThanOrEqual(tolerancia);
  expect(ruta.segmentos.at(-1).costo_acumulado_ruta).toBe(ruta.costo_navegacion);
};

describe("Contrato HTTP de costos de ruta", () => {
  test("GET /api/rutas publica costos operativos, acumulados y campos compatibles", async () => {
    const response = await request(app).get(`/api/rutas${parametros}`);

    expect(response.status).toBe(200);
    verificarCostosDeRuta(response.body);
  });

  test("GET /api/rutas/alternativas publica los mismos campos de costos", async () => {
    const response = await request(app).get(`/api/rutas/alternativas${parametros}`);

    expect(response.status).toBe(200);
    expect(response.body.rutas).toHaveLength(1);
    verificarCostosDeRuta(response.body.rutas[0]);
  });

  test("Swagger documenta tipos, compatibilidad, semántica y unidades", async () => {
    const response = await request(app).get("/api-docs.json");
    const soloRuta = response.body.paths["/api/rutas"].get.responses["200"]
      .content["application/json"].schema;
    const alternativa = response.body.paths["/api/rutas/alternativas"].get.responses["200"]
      .content["application/json"].schema.properties.rutas.items;
    const propiedadesRuta = soloRuta.properties;
    const propiedadesSegmento = propiedadesRuta.segmentos.items.properties;
    const propiedadesAlternativa = alternativa.properties;
    const propiedadesSegmentoAlternativa = propiedadesAlternativa.segmentos.items.properties;

    for (const [rutaProps, segmentoProps] of [
      [propiedadesRuta, propiedadesSegmento],
      [propiedadesAlternativa, propiedadesSegmentoAlternativa],
    ]) {
      expect(rutaProps.costo_navegacion.type).toBe("number");
      expect(rutaProps.costo_navegacion.description).toContain("metros ponderados");
      expect(segmentoProps.costo_arista_operativo.type).toBe("number");
      expect(segmentoProps.costo_acumulado_ruta.type).toBe("number");
      expect(segmentoProps.costo_arista.description).toContain("compatibilidad");
      expect(segmentoProps.costo_riesgo.description).toContain("Campo legado");
      expect(segmentoProps.costo_distancia.description).toContain("Campo legado");
      expect(segmentoProps.distancia_metros.description).toContain("metros");
    }
  });
});
