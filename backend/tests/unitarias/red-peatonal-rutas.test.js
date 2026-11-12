const mockSupabase = {
  from: jest.fn(),
};

jest.mock("../../src/config/supabase", () => mockSupabase);

const { obtenerRedPeatonal } = require("../../src/services/red-peatonal.service");

const BBOX = {
  minLat: -33.04,
  minLon: -71.58,
  maxLat: -33.02,
  maxLon: -71.55,
};
const BBOX_VACIO = { minLat: -33.14, minLon: -71.68, maxLat: -33.12, maxLon: -71.65 };
const BBOX_SHARED = { minLat: -33.24, minLon: -71.78, maxLat: -33.22, maxLon: -71.75 };
const BBOX_CONCURRENT = { minLat: -33.34, minLon: -71.88, maxLat: -33.32, maxLon: -71.85 };

const crearQuerySupabase = (data) => {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    lte: jest.fn(() => query),
    gte: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(async () => ({ data, error: null })),
  };
  mockSupabase.from.mockReturnValue(query);
  return query;
};

describe("red de rutas desde Supabase", () => {
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    mockSupabase.from.mockReset();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = fetchOriginal;
  });

  test("consulta red_peatonal por BBOX sin comuna y no usa Overpass", async () => {
    const query = crearQuerySupabase([
      {
        id_osm: "way-1",
        comuna: "Viña del Mar",
        geometria: [
          { nodo_id: "1", latitud: -33.03, longitud: -71.57 },
          { nodo_id: "2", latitud: -33.031, longitud: -71.571 },
        ],
        longitud_metros: 120,
      },
    ]);

    const segmentos = await obtenerRedPeatonal({
      bbox: BBOX,
      soloSupabase: true,
    });

    expect(segmentos).toHaveLength(1);
    expect(query.eq).not.toHaveBeenCalledWith("comuna", expect.anything());
    expect(query.lte).toHaveBeenCalledWith("bbox_min_lat", BBOX.maxLat);
    expect(query.gte).toHaveBeenCalledWith("bbox_max_lat", BBOX.minLat);
    expect(query.lte).toHaveBeenCalledWith("bbox_min_lon", BBOX.maxLon);
    expect(query.gte).toHaveBeenCalledWith("bbox_max_lon", BBOX.minLon);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("reutiliza entre solicitudes la respuesta Supabase cacheada para el mismo BBOX", async () => {
    crearQuerySupabase([{ id_osm: "shared", geometria: [
      { nodo_id: "n1", latitud: -33.23, longitud: -71.77 },
      { nodo_id: "n2", latitud: -33.225, longitud: -71.76 },
    ], longitud_metros: 5 }]);
    const args = { bbox: BBOX_SHARED, comuna: "Comuna Cache", soloSupabase: true };
    const primera = await obtenerRedPeatonal(args);
    mockSupabase.from.mockClear();
    const segunda = await obtenerRedPeatonal(args);
    expect(segunda).toEqual(primera);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  test("vuelve a consultar y actualiza los datos al expirar el TTL de 24 horas", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const args = { bbox: BBOX_SHARED, comuna: "Comuna TTL", soloSupabase: true };
    const geometria = [
      { nodo_id: "n1", latitud: -33.23, longitud: -71.77 },
      { nodo_id: "n2", latitud: -33.225, longitud: -71.76 },
    ];
    const consultaInicial = crearQuerySupabase([{ id_osm: "antes", geometria, longitud_metros: 5 }]);
    expect((await obtenerRedPeatonal(args))[0].id_osm).toBe("antes");
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    const consultaActualizada = {
      select: jest.fn(() => consultaActualizada), eq: jest.fn(() => consultaActualizada),
      lte: jest.fn(() => consultaActualizada), gte: jest.fn(() => consultaActualizada),
      order: jest.fn(() => consultaActualizada),
      range: jest.fn(async () => ({ data: [{ id_osm: "despues", geometria, longitud_metros: 8 }], error: null })),
    };
    mockSupabase.from.mockReturnValue(consultaActualizada);
    expect((await obtenerRedPeatonal(args))[0].id_osm).toBe("despues");
    expect(consultaInicial.range).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    mockSupabase.from.mockImplementation(() => { throw new Error("offline"); });
    expect(await obtenerRedPeatonal(args)).toEqual([]);
    crearQuerySupabase([{ id_osm: "recuperado", geometria, longitud_metros: 9 }]);
    expect((await obtenerRedPeatonal(args))[0].id_osm).toBe("recuperado");
    jest.useRealTimers();
  });

  test("comparte una sola carga Supabase entre cinco solicitudes simultáneas de la misma clave", async () => {
    crearQuerySupabase([{ id_osm: "single-flight", geometria: [
      { nodo_id: "n1", latitud: -33.33, longitud: -71.87 },
      { nodo_id: "n2", latitud: -33.325, longitud: -71.86 },
    ], longitud_metros: 5 }]);
    const args = { bbox: BBOX_CONCURRENT, comuna: "Comuna Concurrente", soloSupabase: true };
    const resultados = await Promise.all(Array.from({ length: 5 }, () => obtenerRedPeatonal(args)));
    expect(resultados.every((resultado) => resultado[0].id_osm === "single-flight")).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  test("permite que claves diferentes carguen por separado", async () => {
    crearQuerySupabase([{ id_osm: "uno", geometria: [], longitud_metros: 5 }]);
    const primero = { bbox: BBOX_CONCURRENT, comuna: "Comuna Uno", soloSupabase: true };
    const segundo = { bbox: BBOX_CONCURRENT, comuna: "Comuna Dos", soloSupabase: true };
    await Promise.all([obtenerRedPeatonal(primero), obtenerRedPeatonal(segundo)]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });

  test("no conserva una carga fallida y permite reintentar", async () => {
    const queryFallida = {
      select: jest.fn(() => queryFallida), eq: jest.fn(() => queryFallida),
      lte: jest.fn(() => queryFallida), gte: jest.fn(() => queryFallida),
      order: jest.fn(() => queryFallida), range: jest.fn(async () => { throw new Error("offline"); }),
    };
    mockSupabase.from.mockReturnValueOnce(queryFallida);
    const args = { bbox: BBOX_CONCURRENT, comuna: "Comuna Reintento", soloSupabase: true };
    expect(await obtenerRedPeatonal(args)).toEqual([]);
    crearQuerySupabase([{ id_osm: "recuperado", geometria: [
      { nodo_id: "n1", latitud: -33.33, longitud: -71.87 },
      { nodo_id: "n2", latitud: -33.325, longitud: -71.86 },
    ], longitud_metros: 5 }]);
    expect((await obtenerRedPeatonal(args))[0].id_osm).toBe("recuperado");
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });

  test("si Supabase no tiene segmentos en el BBOX, devuelve vacío sin fallback a Overpass", async () => {
    crearQuerySupabase([]);

    const segmentos = await obtenerRedPeatonal({
      bbox: BBOX_VACIO,
      soloSupabase: true,
    });

    expect(segmentos).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("no permite la modalidad solo Supabase sin BBOX", async () => {
    const segmentos = await obtenerRedPeatonal({ soloSupabase: true });

    expect(segmentos).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
