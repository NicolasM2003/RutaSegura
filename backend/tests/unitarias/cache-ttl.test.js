jest.mock("../../src/config/supabase", () => ({
  from: jest.fn(),
}));

const supabase = require("../../src/config/supabase");

const {
  obtenerRedPeatonal,
} = require("../../src/services/red-peatonal.service");

const TTL_24_HORAS = 24 * 60 * 60 * 1000;

const COMUNA = "Viña del Mar";
const COMUNA_SEGUNDA_PRUEBA = "Concón";

const BBOX = {
  minLat: -33.03,
  minLon: -71.56,
  maxLat: -33.01,
  maxLon: -71.53,
};

const crearParametros = (comuna) => ({
  comuna,
  bbox: BBOX,
  soloSupabase: true,
});

// Simula una fila recuperada desde Supabase.
const crearSegmento = (id, comuna) => ({
  id_osm: String(id),
  nombre: `Calle de prueba ${id}`,
  comuna,
  tipo: "residential",
  categoria_peatonal: "compartida",
  geometria: [
    {
      nodo_id: "100",
      latitud: -33.02,
      longitud: -71.55,
    },
    {
      nodo_id: "101",
      latitud: -33.021,
      longitud: -71.551,
    },
  ],
  cantidad_nodos: 2,
  longitud_metros: 120,
});

// Simula la consulta encadenada de Supabase.
const crearConsultaSupabase = (segmentos) => {
  const query = {};

  query.select = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.lte = jest.fn(() => query);
  query.gte = jest.fn(() => query);
  query.order = jest.fn(() => query);

  query.range = jest.fn().mockResolvedValue({
    data: segmentos,
    error: null,
  });

  return query;
};

describe("Caché de red peatonal - TTL", () => {
  let tiempoActual;

  beforeEach(() => {
    // Limpia llamadas e implementaciones de mocks.
    supabase.from.mockReset();

    tiempoActual = new Date(
      "2026-11-23T12:00:00.000Z"
    ).getTime();

    jest.spyOn(Date, "now").mockImplementation(
      () => tiempoActual
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test(
    "reutiliza la información mientras el TTL de 24 horas sigue vigente",
    async () => {
      const parametros = crearParametros(COMUNA);

      const consultaInicial = crearConsultaSupabase([
        crearSegmento(100, COMUNA),
      ]);

      supabase.from.mockReturnValueOnce(
        consultaInicial
      );

      // Primera solicitud: consulta Supabase.
      const primeraRespuesta =
        await obtenerRedPeatonal(parametros);

      expect(primeraRespuesta).toHaveLength(1);
      expect(primeraRespuesta[0].id_osm).toBe("100");

      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Avanza 23 horas y 59 minutos.
      tiempoActual += TTL_24_HORAS - 60 * 1000;

      // Segunda solicitud: debe reutilizar la caché.
      const segundaRespuesta =
        await obtenerRedPeatonal(parametros);

      expect(segundaRespuesta).toHaveLength(1);
      expect(segundaRespuesta[0].id_osm).toBe("100");

      // No debe consultar Supabase nuevamente.
      expect(supabase.from).toHaveBeenCalledTimes(1);
    }
  );

  test(
    "vuelve a consultar Supabase cuando el TTL alcanza las 24 horas y actualiza la caché",
    async () => {
      // Otra comuna para aislar esta prueba.
      const parametros = crearParametros(
        COMUNA_SEGUNDA_PRUEBA
      );

      const consultaInicial = crearConsultaSupabase([
        crearSegmento(100, COMUNA_SEGUNDA_PRUEBA),
      ]);

      const consultaActualizada = crearConsultaSupabase([
        crearSegmento(200, COMUNA_SEGUNDA_PRUEBA),
      ]);

      supabase.from
        .mockReturnValueOnce(consultaInicial)
        .mockReturnValueOnce(consultaActualizada);

      // Primera carga.
      const primeraRespuesta =
        await obtenerRedPeatonal(parametros);

      expect(primeraRespuesta).toHaveLength(1);
      expect(primeraRespuesta[0].id_osm).toBe("100");

      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Avanza exactamente 24 horas.
      tiempoActual += TTL_24_HORAS;

      // Segunda solicitud: debe renovar la entrada.
      const respuestaActualizada =
        await obtenerRedPeatonal(parametros);

      expect(respuestaActualizada).toHaveLength(1);
      expect(respuestaActualizada[0].id_osm).toBe("200");

      expect(supabase.from).toHaveBeenCalledTimes(2);

      // Tercera solicitud: debe reutilizar la caché renovada.
      const terceraRespuesta =
        await obtenerRedPeatonal(parametros);

      expect(terceraRespuesta).toHaveLength(1);
      expect(terceraRespuesta[0].id_osm).toBe("200");

      // No debe producir una tercera consulta.
      expect(supabase.from).toHaveBeenCalledTimes(2);
    }
  );
});