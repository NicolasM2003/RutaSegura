jest.mock("../../src/services/grafo-peatonal.service", () => ({ obtenerGrafoPeatonal: jest.fn() }));
const {
  calcularSimilitudCorredor,
  calcularDistanciaCompartidaCorredor,
  esRutaDominadaPor,
} = require("../../src/services/ruta.service");

const METADATOS = Symbol.for("metadatosSegmentosRuta");
const punto = (x, y = 0) => [-71.56 + x / 85000, -33.02 + y / 111320];
const segmento = (overrides = {}) => ({
  id_osm: 1,
  nodo_origen: "a",
  nodo_destino: "b",
  distancia_metros: 100,
  nombre: "Calle Test",
  tipo: "residential",
  inicio: punto(0),
  fin: punto(100),
  ...overrides,
});
const ruta = (segmentos, distancia = segmentos.reduce((s, x) => s + x.distancia_metros, 0)) => ({
  distancia_metros: distancia,
  segmentos: segmentos.map((s) => ({ ...s, nombre: s.nombre })),
  [METADATOS]: segmentos,
});
const compartida = (a, b) => calcularDistanciaCompartidaCorredor(ruta(a), ruta(b));

describe("similitud de corredor peatonal (implementación usada por rutas alternativas)", () => {
  test("reconoce identidad física por OSM y nodos aunque el sentido esté invertido", () => {
    const a = segmento();
    const b = segmento({ nodo_origen: "b", nodo_destino: "a", inicio: a.fin, fin: a.inicio });
    expect(compartida([a], [b])).toBe(100);
  });

  test("reconoce aceras opuestas de la misma calle como corredor común", () => {
    const a = segmento({ sidewalk: "right" });
    const b = segmento({ id_osm: 2, nodo_origen: "c", nodo_destino: "d", sidewalk: "left", inicio: punto(0, 8), fin: punto(100, 8) });
    expect(compartida([a], [b])).toBeCloseTo(100, 0);
  });

  test("reconoce el mismo trazado nombrado con OSM y nodos distintos a 7.67 m", () => {
    const menorRiesgo = segmento({ id_osm: 101, nodo_origen: "a1", nodo_destino: "a2" });
    const equilibrada = segmento({
      id_osm: 202,
      nodo_origen: "b1",
      nodo_destino: "b2",
      inicio: punto(0, 7.67),
      fin: punto(100, 7.67),
    });
    expect(compartida([menorRiesgo], [equilibrada])).toBeCloseTo(100, 0);
  });

  test("usa un cruce como evidencia de conexión sin sumar su longitud compartida", () => {
    const calle = segmento({ sidewalk: "right" });
    const aceraOpuesta = segmento({ id_osm: 2, nodo_origen: "c", nodo_destino: "d", sidewalk: "left", inicio: punto(0, 8), fin: punto(100, 8) });
    const cruce = segmento({ id_osm: 3, nombre: null, footway: "crossing", crossing: "traffic_signals", distancia_metros: 8, inicio: punto(50, 0), fin: punto(50, 8) });
    expect(compartida([calle, cruce], [aceraOpuesta])).toBeCloseTo(100, 0);
  });

  test("el cruce conecta aceras sin etiquetas sidewalk y su longitud no se suma", () => {
    const ladoA = segmento({ sidewalk: undefined });
    const ladoB = segmento({ id_osm: 2, nodo_origen: "c", nodo_destino: "d", sidewalk: undefined, inicio: punto(0, 8), fin: punto(100, 8) });
    const cruce = segmento({ id_osm: 3, nombre: null, footway: "crossing", distancia_metros: 8, inicio: punto(50, 0), fin: punto(50, 8) });
    expect(compartida([ladoA, cruce], [ladoB])).toBeCloseTo(100, 0);
  });

  test("no confunde calles paralelas diferentes aunque estén próximas", () => {
    const a = segmento({ nombre: "Calle A" });
    const b = segmento({ id_osm: 2, nodo_origen: "x", nodo_destino: "y", nombre: "Calle B", inicio: punto(0, 2), fin: punto(100, 2) });
    expect(compartida([a], [b])).toBe(0);
  });

  test("no fusiona vías de nombres distintos separadas 7.67 m", () => {
    const a = segmento({ nombre: "Calle Uno" });
    const b = segmento({
      id_osm: 2,
      nombre: "Calle Dos",
      nodo_origen: "x",
      nodo_destino: "y",
      inicio: punto(0, 7.67),
      fin: punto(100, 7.67),
    });
    expect(compartida([a], [b])).toBe(0);
  });

  test("no agrupa calles homónimas alejadas", () => {
    const a = segmento();
    const b = segmento({ id_osm: 2, nodo_origen: "x", nodo_destino: "y", inicio: punto(0, 300), fin: punto(100, 300) });
    expect(compartida([a], [b])).toBe(0);
  });

  test("acepta nombres distintos cuando geometría y continuidad de nodo coinciden", () => {
    const a = segmento({ nombre: "Avenida Uno" });
    const b = segmento({ id_osm: 2, nombre: "Pasaje Nuevo" });
    expect(compartida([a], [b])).toBe(100);
  });

  test("compara aristas sin nombre cuando coinciden geométricamente y en conectividad", () => {
    const a = segmento({ nombre: null });
    const b = segmento({ id_osm: 2, nombre: null });
    expect(compartida([a], [b])).toBe(100);
  });

  test("no toma una intersección puntual como tramo compartido", () => {
    const a = segmento({ inicio: punto(0), fin: punto(100) });
    const b = segmento({ id_osm: 2, nombre: "Otra", nodo_origen: "b", nodo_destino: "c", inicio: punto(100), fin: punto(100, 60) });
    expect(compartida([a], [b])).toBe(0);
  });

  test("cuenta solo la parte realmente solapada", () => {
    const a = segmento();
    const b = segmento({ id_osm: 2, nodo_origen: "b", nodo_destino: "c", inicio: punto(50), fin: punto(150) });
    expect(compartida([a], [b])).toBeCloseTo(50, 0);
  });

  test("une intervalos sin contar dos veces un tramo repetido", () => {
    const a = segmento();
    const duplicado = segmento({ id_osm: 4, nodo_origen: "c", nodo_destino: "d" });
    const b = segmento();
    expect(compartida([a, duplicado], [b])).toBeCloseTo(100, 0);
  });

  test("no depende de la subdivisión OSM y admite recorrido inverso", () => {
    const completa = segmento();
    const primera = segmento({ id_osm: 2, nodo_origen: "x", nodo_destino: "y", distancia_metros: 40, inicio: punto(0), fin: punto(40) });
    const segunda = segmento({ id_osm: 3, nodo_origen: "y", nodo_destino: "z", distancia_metros: 60, inicio: punto(100), fin: punto(40) });
    expect(compartida([completa], [primera, segunda])).toBeCloseTo(100, 0);
  });

  test("permite la evidencia local de San Martín cuando los extremos de vía coinciden", () => {
    const a = segmento({ nombre: "Avenida San Martín", tipo: "primary" });
    const b = segmento({ id_osm: 2, nombre: "San Martín", tipo: "primary", inicio: punto(0, 6.3), fin: punto(100, 6.3) });
    expect(compartida([a], [b])).toBeCloseTo(100, 0);
  });

  test("deja indeterminada la geometría ausente y no asume coincidencia", () => {
    const a = segmento({ inicio: undefined, fin: undefined });
    const b = segmento({ id_osm: 2, inicio: undefined, fin: undefined });
    expect(compartida([a], [b])).toBe(0);
  });

  test("calcula similitud con denominador de ruta más larga", () => {
    const a = segmento();
    const b = segmento({ distancia_metros: 120, inicio: punto(0), fin: punto(100) });
    expect(calcularSimilitudCorredor(ruta([a], 100), ruta([b], 120))).toBeCloseTo(100 / 120, 5);
  });


test("reconoce un corredor compartido entre un footway y una calle con distintas subdivisiones", () => {
  const calle = segmento({
    id_osm: 301,
    nodo_origen: "inicio",
    nodo_destino: "fin",
    distancia_metros: 100,
    nombre: "2 Poniente",
    tipo: "residential",
    categoria_peatonal: "compartida_con_acera",
    inicio: punto(0, 0),
    fin: punto(100, 0),
  });

  const footway = [
    segmento({
      id_osm: 401,
      nodo_origen: "inicio",
      nodo_destino: "f1",
      distancia_metros: 12,
      nombre: null,
      tipo: "footway",
      categoria_peatonal: "exclusiva",
      inicio: punto(0, 0),
      fin: punto(10, 6),
    }),
    segmento({
      id_osm: 402,
      nodo_origen: "f1",
      nodo_destino: "f2",
      distancia_metros: 80,
      nombre: null,
      tipo: "footway",
      categoria_peatonal: "exclusiva",
      inicio: punto(10, 6),
      fin: punto(90, 6),
    }),
    segmento({
      id_osm: 403,
      nodo_origen: "f2",
      nodo_destino: "fin",
      distancia_metros: 12,
      nombre: null,
      tipo: "footway",
      categoria_peatonal: "exclusiva",
      inicio: punto(90, 6),
      fin: punto(100, 0),
    }),
  ];

  expect(compartida([calle], footway)).toBeCloseTo(100, 0);
});

test("reconoce un corredor footway aunque termine en un conector residencial corto", () => {
  const calle = segmento({
    id_osm: 501,
    nodo_origen: "inicio",
    nodo_destino: "fin",
    distancia_metros: 100,
    nombre: "2 Poniente",
    tipo: "residential",
    inicio: punto(0, 0),
    fin: punto(100, 0),
  });

  const footway = [
    segmento({
      id_osm: 601,
      nodo_origen: "inicio",
      nodo_destino: "f1",
      distancia_metros: 50,
      nombre: null,
      tipo: "footway",
      inicio: punto(0, 6),
      fin: punto(50, 6),
    }),
    segmento({
      id_osm: 602,
      nodo_origen: "f1",
      nodo_destino: "f2",
      distancia_metros: 44,
      nombre: null,
      tipo: "footway",
      inicio: punto(50, 6),
      fin: punto(94, 6),
    }),
    segmento({
      id_osm: 603,
      nodo_origen: "f2",
      nodo_destino: "fin",
      distancia_metros: 8.5,
      nombre: "3 Norte",
      tipo: "residential",
      inicio: punto(94, 6),
      fin: punto(100, 0),
    }),
  ];

  expect(compartida([calle], footway)).toBeCloseTo(100, 0);
});

describe("dominancia de rutas por distancia y riesgo", () => {
  const crearRuta = (distancia, riesgo) => ({
    distancia_metros: distancia,
    puntaje_riesgo: riesgo,
  });

  test("considera dominada una ruta más larga y más riesgosa", () => {
    const menorRiesgo = crearRuta(1591.12, 46.86);
    const equilibrada = crearRuta(1645.59, 47.02);

    expect(
      esRutaDominadaPor(equilibrada, menorRiesgo)
    ).toBe(true);

    expect(
      esRutaDominadaPor(menorRiesgo, equilibrada)
    ).toBe(false);
  });

  test("conserva una ruta más corta aunque tenga mayor riesgo", () => {
    const menorRiesgo = crearRuta(1591.12, 46.86);
    const masRapida = crearRuta(1567.21, 53.12);

    expect(
      esRutaDominadaPor(masRapida, menorRiesgo)
    ).toBe(false);

    expect(
      esRutaDominadaPor(menorRiesgo, masRapida)
    ).toBe(false);
  });

  test("reconoce dos alternativas dominadas por una ruta mejor en ambos criterios", () => {
    const menorRiesgo = crearRuta(544.86, 54.70);
    const equilibrada = crearRuta(546.08, 55.44);
    const masRapida = crearRuta(702.04, 59.34);

    expect(
      esRutaDominadaPor(equilibrada, menorRiesgo)
    ).toBe(true);

    expect(
      esRutaDominadaPor(masRapida, menorRiesgo)
    ).toBe(true);
  });

  test("no considera dominadas rutas con indicadores exactamente iguales", () => {
    const rutaA = crearRuta(500, 40);
    const rutaB = crearRuta(500, 40);

    expect(esRutaDominadaPor(rutaA, rutaB)).toBe(false);
    expect(esRutaDominadaPor(rutaB, rutaA)).toBe(false);
  });

  test("no aplica dominancia cuando faltan métricas válidas", () => {
    const rutaValida = crearRuta(500, 40);

    const rutaSinDistancia = {
      distancia_metros: null,
      puntaje_riesgo: 35,
    };

    const rutaSinRiesgo = {
      distancia_metros: 450,
    };

    expect(
      esRutaDominadaPor(rutaSinDistancia, rutaValida)
    ).toBe(false);

    expect(
      esRutaDominadaPor(rutaSinRiesgo, rutaValida)
    ).toBe(false);
  });
});

});
