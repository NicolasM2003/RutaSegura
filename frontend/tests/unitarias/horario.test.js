jest.mock("react-leaflet", () => ({
  useMap: jest.fn(),
  useMapEvents: jest.fn(),
}));

import {
  RANGOS_HORARIOS,
  esRangoHorarioValido,
} from "../../src/components/mapa/web/ControlesMapa.web";

describe("Validación de rangos horarios", () => {
  test("debe aceptar los rangos horarios permitidos", () => {
    RANGOS_HORARIOS.forEach((rango) => {
      expect(
        esRangoHorarioValido(rango)
      ).toBe(true);
    });
  });

  test("debe rechazar un rango horario no permitido", () => {
    expect(
      esRangoHorarioValido("25:00 - 26:00")
    ).toBe(false);
  });

  test("debe rechazar un rango vacío", () => {
    expect(
      esRangoHorarioValido("")
    ).toBe(false);
  });

  test("debe rechazar un rango con formato incorrecto", () => {
    expect(
      esRangoHorarioValido("20:00-23:59")
    ).toBe(false);
  });
});