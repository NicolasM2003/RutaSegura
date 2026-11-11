let mockMapHandlers = null;

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => children,
  TileLayer: () => null,
  CircleMarker: () => null,
  Polyline: () => null,
  Tooltip: ({ children }) => children,
  useMap: jest.fn(),
  useMapEvents: jest.fn((handlers) => {
    mockMapHandlers = handlers;
    return null;
  }),
}));

const {
  normalizarGeometriaRuta,
  formatearDistancia,
} = require("../../src/components/mapa/web/MapaRiesgoCliente");

describe("Visualización de ruta", () => {
  beforeEach(() => {
    mockMapHandlers = null;
  });

  test("debe normalizar la geometría de la ruta", () => {
    const geometria = [
      [-33.0164593, -71.5497516],
      [-33.0164128, -71.55008],
      [-33.017, -71.551],
    ];

    const resultado = normalizarGeometriaRuta(geometria);

    expect(resultado).toHaveLength(3);
    expect(resultado[0]).toEqual([
      -33.0164593,
      -71.5497516,
    ]);
  });

  test("debe mostrar distancia en metros", () => {
    expect(formatearDistancia(850.32)).toBe("850.32 m");
  });

  test("debe mostrar distancia en kilómetros", () => {
    expect(formatearDistancia(2186.24)).toBe("2.19 km");
  });

  test("debe rechazar geometría inválida", () => {
    expect(
      normalizarGeometriaRuta([
        ["abc", "xyz"],
        null,
        [undefined, undefined],
      ])
    ).toEqual([]);
  });
});