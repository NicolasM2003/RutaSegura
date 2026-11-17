import { agruparConcentracionesDelitos } from "../../src/components/mapa/concentracion-delitos";

const crearDelito = (
  id: number,
  latitud: number | string,
  longitud: number | string,
  rango_horario = "20:00 - 23:59",
) => ({ id, latitud, longitud, rango_horario });

describe("agruparConcentracionesDelitos", () => {
  it("representa un registro idéntico como círculo verde con contador 1", () => {
    const [grupo] = agruparConcentracionesDelitos([
      crearDelito(1, "-33.024", "-71.552"),
    ]);

    expect(grupo).toMatchObject({ cantidad_delitos: 1, color: "#16a34a" });
  });

  it("representa dos registros con coordenadas idénticas como amarillo", () => {
    const [grupo] = agruparConcentracionesDelitos([
      crearDelito(1, "-33.024", "-71.552"),
      crearDelito(2, -33.024, -71.552),
    ]);

    expect(grupo).toMatchObject({ cantidad_delitos: 2, color: "#facc15" });
    expect(grupo.delitos).toHaveLength(2);
  });

  it("representa tres o más registros como rojo y conserva el contador exacto", () => {
    const [grupo] = agruparConcentracionesDelitos(
      Array.from({ length: 5 }, (_, i) =>
        crearDelito(i + 1, "-33.024", "-71.552"),
      ),
    );

    expect(grupo).toMatchObject({ cantidad_delitos: 5, color: "#dc2626" });
    expect(grupo.delitos.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("no agrupa coordenadas diferentes aunque estén muy cerca", () => {
    const grupos = agruparConcentracionesDelitos([
      crearDelito(1, "-33.024000", "-71.552000"),
      crearDelito(2, "-33.024001", "-71.552000"),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos.map(({ cantidad_delitos }) => cantidad_delitos)).toEqual([1, 1]);
  });

  it("no redondea coordenadas para producir coincidencias", () => {
    const grupos = agruparConcentracionesDelitos([
      crearDelito(1, "-33.0241", "-71.5521"),
      crearDelito(2, "-33.0242", "-71.5522"),
    ]);

    expect(grupos).toHaveLength(2);
  });

  it("separa rangos horarios y puede aplicar el rango seleccionado", () => {
    const delitos = [
      crearDelito(1, "-33.024", "-71.552", "20:00 - 23:59"),
      crearDelito(2, "-33.024", "-71.552", "20:00 - 23:59"),
      crearDelito(3, "-33.024", "-71.552", "16:00 - 19:59"),
    ];

    const sinFiltro = agruparConcentracionesDelitos(delitos);
    const filtrado = agruparConcentracionesDelitos(delitos, "16:00 - 19:59");

    expect(sinFiltro.map(({ cantidad_delitos }) => cantidad_delitos)).toEqual([2, 1]);
    expect(filtrado).toHaveLength(1);
    expect(filtrado[0].delitos.map(({ id }) => id)).toEqual([3]);
  });

  it("conserva cada objeto original una sola vez sin mutar la entrada", () => {
    const delitos = [
      crearDelito(1, "-33.024", "-71.552"),
      crearDelito(2, "-33.024", "-71.552"),
      crearDelito(3, "-33.025", "-71.552"),
    ];
    const copia = [...delitos];
    const grupos = agruparConcentracionesDelitos(delitos);
    const originales = grupos.flatMap(({ delitos: asociados }) => asociados);

    expect(delitos).toEqual(copia);
    expect(originales).toHaveLength(delitos.length);
    expect(new Set(originales.map(({ id }) => id)).size).toBe(delitos.length);
    expect(originales.every((delito) => delitos.includes(delito))).toBe(true);
  });
});
