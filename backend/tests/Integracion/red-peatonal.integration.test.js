require("dotenv").config();

const {
  obtenerRedPeatonal,
} = require("../../src/services/red-peatonal.service");

const {
  obtenerGrafoPeatonal,
} = require("../../src/services/grafo-peatonal.service");

describe("Integración - Red peatonal", () => {
  const COMUNA = "Viña del Mar";

  test(
    "debe recuperar la red peatonal desde Supabase",
    async () => {
      const red =
        await obtenerRedPeatonal({
          comuna: COMUNA,
        });

      expect(
        Array.isArray(red)
      ).toBe(true);

      expect(
        red.length
      ).toBeGreaterThan(0);

      const segmento = red[0];

      expect(
        segmento
      ).toHaveProperty(
        "id_osm"
      );

      expect(
        segmento
      ).toHaveProperty(
        "comuna"
      );

      expect(
        segmento
      ).toHaveProperty(
        "geometria"
      );

      expect(
        Array.isArray(
          segmento.geometria
        )
      ).toBe(true);

      expect(
        segmento.geometria.length
      ).toBeGreaterThanOrEqual(2);
    },
    30000
  );

  test(
    "debe construir el grafo peatonal a partir de la red recuperada",
    async () => {
      const grafo =
        await obtenerGrafoPeatonal({
          comuna: COMUNA,
        });

      expect(
        grafo
      ).toHaveProperty(
        "nodos"
      );

      expect(
        grafo
      ).toHaveProperty(
        "aristas"
      );

      expect(
        grafo
          .nodos.length
      ).toBeGreaterThan(0);

      expect(
        grafo
          .aristas.length
      ).toBeGreaterThan(0);

      expect(
        grafo
          .resumen
          .cantidad_vias
      ).toBeGreaterThan(0);

      expect(
        grafo
          .resumen
          .cantidad_nodos
      ).toBeGreaterThan(0);

      expect(
        grafo
          .resumen
          .cantidad_aristas
      ).toBeGreaterThan(0);
    },
    60000
  );

  test(
    "los segmentos recuperados deben contener información geográfica válida",
    async () => {
      const red =
        await obtenerRedPeatonal({
          comuna: COMUNA,
        });

      expect(
        red.length
      ).toBeGreaterThan(0);

      const segmentosValidos =
        red.filter(
          (segmento) => {
            if (
              !Array.isArray(
                segmento.geometria
              )
            ) {
              return false;
            }

            if (
              segmento.geometria.length <
              2
            ) {
              return false;
            }

            return segmento.geometria.every(
              (punto) =>
                Number.isFinite(
                  Number(
                    punto.latitud
                  )
                ) &&
                Number.isFinite(
                  Number(
                    punto.longitud
                  )
                )
            );
          }
        );

      expect(
        segmentosValidos.length
      ).toBe(
        red.length
      );
    },
    30000
  );
});
