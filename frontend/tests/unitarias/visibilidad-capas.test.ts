import { obtenerVisibilidadCapas } from "../../src/components/mapa/visibilidad-capas";

describe("visibilidad independiente de capas del mapa", () => {
  it("muestra solo delitos individuales", () => {
    expect(obtenerVisibilidadCapas({
      delitosIndividuales: true,
      concentracionDelitos: false,
      zonasRiesgo: false,
    }, 13)).toEqual({
      delitosIndividuales: true,
      concentracionDelitos: false,
      zonasRiesgo: false,
    });
  });

  it("muestra concentración sin depender de delitos ni zonas", () => {
    expect(obtenerVisibilidadCapas({
      delitosIndividuales: false,
      concentracionDelitos: true,
      zonasRiesgo: false,
    }, 13)).toEqual({
      delitosIndividuales: false,
      concentracionDelitos: true,
      zonasRiesgo: false,
    });
  });

  it("mantiene concentración y zonas como capas simultáneas", () => {
    expect(obtenerVisibilidadCapas({
      delitosIndividuales: false,
      concentracionDelitos: true,
      zonasRiesgo: true,
    }, 13)).toEqual({
      delitosIndividuales: false,
      concentracionDelitos: true,
      zonasRiesgo: true,
    });
  });

  it("permite activar las tres capas simultáneamente", () => {
    expect(obtenerVisibilidadCapas({
      delitosIndividuales: true,
      concentracionDelitos: true,
      zonasRiesgo: true,
    }, 13)).toEqual({
      delitosIndividuales: true,
      concentracionDelitos: true,
      zonasRiesgo: true,
    });
  });

  it("mantiene las tres capas desactivadas cuando sus controles lo están", () => {
    expect(obtenerVisibilidadCapas({
      delitosIndividuales: false,
      concentracionDelitos: false,
      zonasRiesgo: false,
    }, 13)).toEqual({
      delitosIndividuales: false,
      concentracionDelitos: false,
      zonasRiesgo: false,
    });
  });

  it("conserva la compuerta de zoom para delitos sin acoplar las capas entre sí", () => {
    expect(obtenerVisibilidadCapas({
      delitosIndividuales: true,
      concentracionDelitos: true,
      zonasRiesgo: false,
    }, 12)).toEqual({
      delitosIndividuales: false,
      concentracionDelitos: false,
      zonasRiesgo: false,
    });
  });
});
