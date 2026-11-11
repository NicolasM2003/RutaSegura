const request = require("supertest");
const app = require("../../src/app");

describe("Integración filtro horario", () => {
  test("debe modificar los resultados de riesgo al cambiar el rango horario", async () => {
    const respuestaNoche = await request(app)
      .get("/api/riesgo/zonas")
      .query({
        comuna: "Viña del Mar",
        rango_horario: "20:00 - 23:59",
      });

    const respuestaManana = await request(app)
      .get("/api/riesgo/zonas")
      .query({
        comuna: "Viña del Mar",
        rango_horario: "04:00 - 07:59",
      });

    expect(respuestaNoche.status).toBe(200);
    expect(respuestaManana.status).toBe(200);

    expect(Array.isArray(respuestaNoche.body.data)).toBe(true);
    expect(Array.isArray(respuestaManana.body.data)).toBe(true);

    expect(respuestaNoche.body.data.length).toBeGreaterThan(0);
    expect(respuestaManana.body.data.length).toBeGreaterThan(0);

    const zonasNoche = new Map(
      respuestaNoche.body.data.map((zona) => [
        zona.id_zona,
        zona,
      ])
    );

    const zonasManana = new Map(
      respuestaManana.body.data.map((zona) => [
        zona.id_zona,
        zona,
      ])
    );

    const existeDiferencia = [...zonasNoche.keys()].some(
      (idZona) => {
        const noche = zonasNoche.get(idZona);
        const manana = zonasManana.get(idZona);

        if (!manana) {
          return false;
        }

        return (
          noche.delitos_en_horario !==
            manana.delitos_en_horario ||
          noche.puntajeHorario !==
            manana.puntajeHorario ||
          noche.puntajeFinal !==
            manana.puntajeFinal ||
          noche.nivel !== manana.nivel
        );
      }
    );

    expect(existeDiferencia).toBe(true);
  });
});