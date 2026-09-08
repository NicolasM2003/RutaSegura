const request = require("supertest");
const app = require("../src/app");

describe("GET /health", () => {
  test("responde 200", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
  });

  test("devuelve status ok", async () => {
    const response = await request(app).get("/health");

    expect(response.body).toEqual({
      status: "ok",
    });
  });
});

describe("GET /api/delitos", () => {
  test("responde 200", async () => {
    const response = await request(app).get("/api/delitos");

    expect(response.statusCode).toBe(200);
  });

  test("devuelve una lista de delitos", async () => {
    const response = await request(app).get("/api/delitos");

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test("devuelve el total", async () => {
    const response = await request(app).get("/api/delitos");

    expect(typeof response.body.total).toBe("number");
  });

  test("devuelve los campos principales del delito", async () => {
    const response = await request(app).get("/api/delitos");

    const delito = response.body.data[0];

    expect(delito).toHaveProperty("id");
    expect(delito).toHaveProperty("fecha");
    expect(delito).toHaveProperty("rango_horario");
    expect(delito).toHaveProperty("clasificacion");
    expect(delito).toHaveProperty("familia_delito");
    expect(delito).toHaveProperty("grupo_delito");
    expect(delito).toHaveProperty("lugar");
    expect(delito).toHaveProperty("comuna");
    expect(delito).toHaveProperty("region");
    expect(delito).toHaveProperty("latitud");
    expect(delito).toHaveProperty("longitud");
    expect(delito).toHaveProperty("fuente");
  });

  test("contiene datos de Viña del Mar", async () => {
    const response = await request(app).get("/api/delitos");

    const registros = response.body.data;

    const existe = registros.some(
      (delito) => delito.comuna === "Viña del Mar"
    );

    expect(existe).toBe(true);
  });

  test("contiene datos de Valparaíso", async () => {
    const response = await request(app).get("/api/delitos");

    const registros = response.body.data;

    const existe = registros.some(
      (delito) => delito.comuna === "Valparaíso"
    );

    expect(existe).toBe(true);
  });

  test("contiene datos de Concón", async () => {
    const response = await request(app).get("/api/delitos");

    const registros = response.body.data;

    const existe = registros.some(
      (delito) => delito.comuna === "Concón"
    );

    expect(existe).toBe(true);
  });
});