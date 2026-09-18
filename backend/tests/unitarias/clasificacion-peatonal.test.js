require("dotenv").config();

const {
  obtenerCategoriaPeatonal,
} = require("../../src/services/red-peatonal.service");

describe("Clasificación de infraestructura peatonal", () => {
  test("footway debe clasificarse como exclusiva", () => {
    expect(
      obtenerCategoriaPeatonal("footway", {})
    ).toBe("exclusiva");
  });

  test("pedestrian debe clasificarse como exclusiva", () => {
    expect(
      obtenerCategoriaPeatonal("pedestrian", {})
    ).toBe("exclusiva");
  });

  test("path debe clasificarse como exclusiva", () => {
    expect(
      obtenerCategoriaPeatonal("path", {})
    ).toBe("exclusiva");
  });

  test("steps debe clasificarse como exclusiva", () => {
    expect(
      obtenerCategoriaPeatonal("steps", {})
    ).toBe("exclusiva");
  });

  test("secondary con sidewalk debe clasificarse como compartida_con_acera", () => {
    expect(
      obtenerCategoriaPeatonal("secondary", {
        sidewalk: "right",
      })
    ).toBe("compartida_con_acera");
  });

  test("secondary sin sidewalk debe clasificarse como compartida", () => {
    expect(
      obtenerCategoriaPeatonal("secondary", {})
    ).toBe("compartida");
  });

  test("secondary con sidewalk=no debe clasificarse como compartida", () => {
    expect(
      obtenerCategoriaPeatonal("secondary", {
        sidewalk: "no",
      })
    ).toBe("compartida");
  });

  test("primary debe clasificarse como compartida", () => {
    expect(
      obtenerCategoriaPeatonal("primary", {})
    ).toBe("compartida");
  });

  test("cycleway con foot=yes debe clasificarse como compartida", () => {
    expect(
      obtenerCategoriaPeatonal("cycleway", {
        foot: "yes",
      })
    ).toBe("compartida");
  });

  test("track con foot=designated debe clasificarse como compartida", () => {
    expect(
      obtenerCategoriaPeatonal("track", {
        foot: "designated",
      })
    ).toBe("compartida");
  });

  test("cycleway sin acceso peatonal explícito debe quedar como no_definida", () => {
    expect(
      obtenerCategoriaPeatonal("cycleway", {})
    ).toBe("no_definida");
  });

  test("tipo no contemplado debe quedar como no_definida", () => {
    expect(
      obtenerCategoriaPeatonal("unknown", {})
    ).toBe("no_definida");
  });
});
