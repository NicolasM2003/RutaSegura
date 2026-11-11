
let mockMapHandlers = null;

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => children,
  TileLayer: () => null,
  CircleMarker: () => null,
  useMap: jest.fn(),
  useMapEvents: jest.fn((handlers) => {
    mockMapHandlers = handlers;
    return null;
  }),
}));

const {
  SeleccionarPuntos,
} = require("../../src/components/mapa/web/MapaRiesgoCliente");

describe("Prueba funcional de selección de puntos", () => {
  beforeEach(() => {
    mockMapHandlers = null;
  });

  test("debe seleccionar el origen cuando el modo es origen", () => {
    const onSeleccionarPunto = jest.fn();

    SeleccionarPuntos({
      modo: "origen",
      onSeleccionarPunto,
    });

    expect(mockMapHandlers).not.toBeNull();

    mockMapHandlers.click({
      latlng: {
        lat: -33.024,
        lng: -71.551,
      },
    });

    expect(onSeleccionarPunto).toHaveBeenCalledTimes(1);

    expect(onSeleccionarPunto).toHaveBeenCalledWith(
      "origen",
      -33.024,
      -71.551
    );
  });

  test("debe seleccionar el destino cuando el modo es destino", () => {
    const onSeleccionarPunto = jest.fn();

    SeleccionarPuntos({
      modo: "destino",
      onSeleccionarPunto,
    });

    expect(mockMapHandlers).not.toBeNull();

    mockMapHandlers.click({
      latlng: {
        lat: -33.018,
        lng: -71.548,
      },
    });

    expect(onSeleccionarPunto).toHaveBeenCalledTimes(1);

    expect(onSeleccionarPunto).toHaveBeenCalledWith(
      "destino",
      -33.018,
      -71.548
    );
  });

  test("no debe seleccionar ningún punto cuando no hay modo activo", () => {
    const onSeleccionarPunto = jest.fn();

    SeleccionarPuntos({
      modo: null,
      onSeleccionarPunto,
    });

    expect(mockMapHandlers).not.toBeNull();

    mockMapHandlers.click({
      latlng: {
        lat: -33.020,
        lng: -71.550,
      },
    });

    expect(onSeleccionarPunto).not.toHaveBeenCalled();
  });
});
