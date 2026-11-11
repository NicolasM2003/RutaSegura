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

  test("si Supabase no tiene segmentos en el BBOX, devuelve vacío sin fallback a Overpass", async () => {
    crearQuerySupabase([]);

    const segmentos = await obtenerRedPeatonal({
      bbox: BBOX,
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
