import {
  analizarPuntoSeleccionado,
  PROXIMIDAD_ZONA_RIESGO_METROS,
} from "../../src/components/mapa/native/zonas";

const zona = {
  id_zona: 7,
  comuna: "Viña del Mar",
  latitud: -33.024,
  longitud: -71.551,
  nivel: "Alto",
};

describe("asociación de origen/destino con zonas de riesgo", () => {
  test("mantiene como punto de ruta el punto tocado y solo asocia la zona cercana", () => {
    const seleccionado = { latitude: -33.0243, longitude: -71.551 };
    const resultado = analizarPuntoSeleccionado(seleccionado, [zona]);

    expect(resultado.punto).toEqual({ latitud: seleccionado.latitude, longitud: seleccionado.longitude });
    expect(resultado.zonaProxima?.zona).toBe(zona);
    expect(resultado.zonaProxima?.distanciaMetros).toBeLessThan(PROXIMIDAD_ZONA_RIESGO_METROS);
  });

  test("no asocia una zona cuando el punto queda fuera del umbral", () => {
    const resultado = analizarPuntoSeleccionado({ latitude: -33.03, longitude: -71.551 }, [zona]);
    expect(resultado.zonaProxima).toBeNull();
  });

  test("elige la zona cercana más próxima y admite cambiar el umbral", () => {
    const masCercana = { ...zona, id_zona: 8, latitud: -33.0241 };
    const resultado = analizarPuntoSeleccionado({ latitude: -33.0242, longitude: -71.551 }, [zona, masCercana]);
    expect(resultado.zonaProxima?.zona).toBe(masCercana);

    const fueraDeUmbral = analizarPuntoSeleccionado({ latitude: -33.0242, longitude: -71.551 }, [zona, masCercana], 5);
    expect(fueraDeUmbral.zonaProxima).toBeNull();
  });
});
