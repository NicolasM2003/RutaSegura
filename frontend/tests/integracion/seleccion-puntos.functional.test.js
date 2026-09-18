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

  test("debe seleccionar el origen con el primer clic", () => {
    const onSeleccionarOrigen = jest.fn();
    const onSeleccionarDestino = jest.fn();

    SeleccionarPuntos({
      origen: null,
      destino: null,
      onSeleccionarOrigen,
      onSeleccionarDestino,
    });

    mockMapHandlers.click({
      latlng: {
        lat: -33.024,
        lng: -71.551,
      },
    });

    expect(onSeleccionarOrigen).toHaveBeenCalledWith(
      -33.024,
      -71.551
    );

    expect(onSeleccionarDestino).not.toHaveBeenCalled();
  });

  test("debe seleccionar el destino con el segundo clic", () => {
    const onSeleccionarOrigen = jest.fn();
    const onSeleccionarDestino = jest.fn();

    SeleccionarPuntos({
      origen: {
        latitud: -33.024,
        longitud: -71.551,
      },
      destino: null,
      onSeleccionarOrigen,
      onSeleccionarDestino,
    });

    mockMapHandlers.click({
      latlng: {
        lat: -33.018,
        lng: -71.548,
      },
    });

    expect(onSeleccionarDestino).toHaveBeenCalledWith(
      -33.018,
      -71.548
    );

    expect(onSeleccionarOrigen).not.toHaveBeenCalled();
  });

  test("no debe modificar los puntos cuando ambos ya están definidos", () => {
    const onSeleccionarOrigen = jest.fn();
    const onSeleccionarDestino = jest.fn();

    SeleccionarPuntos({
      origen: {
        latitud: -33.024,
        longitud: -71.551,
      },
      destino: {
        latitud: -33.018,
        longitud: -71.548,
      },
      onSeleccionarOrigen,
      onSeleccionarDestino,
    });

    mockMapHandlers.click({
      latlng: {
        lat: -33.020,
        lng: -71.550,
      },
    });

    expect(onSeleccionarOrigen).not.toHaveBeenCalled();
    expect(onSeleccionarDestino).not.toHaveBeenCalled();
  });
});