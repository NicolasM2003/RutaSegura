
const request = require("supertest");
const app = require("../../src/app");

describe("Integración filtro horario", () => {
  test(
    "debe modificar los resultados de riesgo al cambiar el rango horario",
    async () => {
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

      // Verificar que cada respuesta corresponde al rango solicitado.
      expect(
        respuestaNoche.body.data.every(
          (zona) => zona.rango_horario === "20:00 - 23:59"
        )
      ).toBe(true);

      expect(
        respuestaManana.body.data.every(
          (zona) => zona.rango_horario === "04:00 - 07:59"
        )
      ).toBe(true);

      // Normalizar las zonas sin utilizar id_zona,
      // porque el identificador cambia según el rango horario.
      const normalizarZonas = (zonas) =>
        zonas
          .map((zona) => ({
            latitud: Number(zona.latitud).toFixed(6),
            longitud: Number(zona.longitud).toFixed(6),
            cantidadDelitos: Number(
              zona.delitos_en_horario ?? zona.cantidad_delitos
            ),
            puntajeFinal: Number(zona.puntajeFinal),
            nivel: zona.nivel,
          }))
          .sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b))
          );

      const zonasNoche = normalizarZonas(
        respuestaNoche.body.data
      );

      const zonasManana = normalizarZonas(
        respuestaManana.body.data
      );

      // Los resultados deben reflejar las diferencias
      // de los delitos agrupados para cada horario.
      expect(zonasNoche).not.toEqual(zonasManana);
    },
    60000
  );
});
