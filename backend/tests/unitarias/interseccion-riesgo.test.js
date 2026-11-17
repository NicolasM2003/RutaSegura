require("dotenv").config();

const { crearIndiceEspacial } = require("../../src/services/riesgo-espacial.service");
const {
  calcularRiesgoSegmento,
  calcularExposicionZonas,
} = require("../../src/services/riesgo-red.service");

const crearContexto = (zonas = []) => {
  const centrosZona = zonas.flatMap((zona) => zona.geometria_zona.centros.map((centro) => ({
    ...centro,
    id_zona: zona.id_zona,
    puntaje: zona.puntajeFinal,
    nivel: zona.nivel,
    radio_metros: zona.geometria_zona.radio_metros,
  })));
  const vacio = [];
  return {
    centrosZona,
    modelo: {
      zonas,
      delitosAislados: vacio,
      delitosHistoricos: vacio,
      modoTemporal: "rango_seleccionado",
      rangoHorario: "20:00 - 23:59",
      cobertura: { estado: "registros_disponibles" },
    },
    indiceCentrosZona: crearIndiceEspacial(centrosZona, 75),
    indiceAislados: crearIndiceEspacial(vacio, 75),
    indiceHistorico: crearIndiceEspacial(vacio, 75),
  };
};

const zona = {
  id_zona: "temporal:test:1",
  nivel: "Alto",
  puntajeFinal: 80,
  geometria_zona: {
    tipo: "union_buffers_haversine",
    radio_metros: 75,
    centros: [{ id_delito: "d1", latitud: 0, longitud: 0 }],
  },
};

describe("Exposición de una arista a zonas geográficas", () => {
  test("un tramo dentro del buffer temporal queda totalmente expuesto", () => {
    const contexto = crearContexto([zona]);
    const resultado = calcularExposicionZonas([
      { latitud: 0, longitud: -0.0002 },
      { latitud: 0, longitud: 0.0002 },
    ], contexto);
    expect(resultado.puntaje).toBeCloseTo(80, 1);
    expect(resultado.zonas[0].proporcion_segmento).toBe(1);
  });

  test("un cruce parcial pondera por la fracción de longitud expuesta", () => {
    const contexto = crearContexto([zona]);
    const geometria = [
      { latitud: 0, longitud: -0.001 },
      { latitud: 0, longitud: 0.001 },
    ];
    const exposicion = calcularExposicionZonas(geometria, contexto);
    const riesgoArista = calcularRiesgoSegmento({ geometria }, contexto);
    expect(exposicion.zonas[0].proporcion_segmento).toBeGreaterThan(0.65);
    expect(exposicion.zonas[0].proporcion_segmento).toBeLessThan(0.70);
    expect(exposicion.puntaje).toBeGreaterThan(52);
    expect(exposicion.puntaje).toBeLessThan(57);
    expect(riesgoArista.puntaje_riesgo_temporal).toBeLessThan(80);
    expect(riesgoArista.puntaje_riesgo_temporal).toBeGreaterThan(35);
  });

  test("una arista exterior a los buffers no recibe riesgo temporal de zona", () => {
    const contexto = crearContexto([zona]);
    const resultado = calcularExposicionZonas([
      { latitud: 0.002, longitud: -0.0002 },
      { latitud: 0.002, longitud: 0.0002 },
    ], contexto);
    expect(resultado.puntaje).toBe(0);
    expect(resultado.zonas).toEqual([]);
  });

  test("el puntaje por arista incluye riesgo temporal e histórico por separado", () => {
    const resultado = calcularRiesgoSegmento({
      geometria: [
        { latitud: 0, longitud: -0.0002 },
        { latitud: 0, longitud: 0.0002 },
      ],
    }, crearContexto([zona]));
    expect(resultado.puntaje_riesgo_temporal).toBeGreaterThan(0);
    expect(resultado.puntaje_riesgo_historico).toBeCloseTo(23.08, 1);
    expect(resultado.riesgo_historico_es_prior).toBe(true);
    expect(resultado.puntaje_riesgo).toBeGreaterThan(0);
    expect(resultado.zonas_intersectadas[0].id_zona).toBe(zona.id_zona);
  });
});
