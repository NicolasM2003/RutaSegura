const { buscarDireccion } = require("../../src/services/geocoding.service");

describe("caché y single-flight del geocoder", () => {
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "-33.03", lon: "-71.57", display_name: "Dirección de prueba" }],
    }));
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.useRealTimers();
  });

  test("comparte una carga concurrente y luego atiende desde caché", async () => {
    const query = `consulta-${Date.now()}-${Math.random()}`;
    const respuestas = await Promise.all(Array.from({ length: 5 }, () => buscarDireccion(query)));
    expect(respuestas.every((respuesta) => respuesta[0].etiqueta === "Dirección de prueba")).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await buscarDireccion(query);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("no almacena errores y vuelve a intentar", async () => {
    const query = `fallo-${Date.now()}-${Math.random()}`;
    global.fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(buscarDireccion(query)).rejects.toThrow("offline");
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "-33.03", lon: "-71.57", display_name: "Recuperado" }],
    });
    expect((await buscarDireccion(query))[0].etiqueta).toBe("Recuperado");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("actualiza la entrada al expirar el TTL existente de 24 horas", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.now() + 100000));
    const query = `ttl-${Date.now()}-${Math.random()}`;
    await buscarDireccion(query);
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "-33.04", lon: "-71.58", display_name: "Actualizado" }],
    });
    expect((await buscarDireccion(query))[0].etiqueta).toBe("Actualizado");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
