const { parentPort } = require("node:worker_threads");
const { performance } = require("node:perf_hooks");
const { aStarMinHeap } = require("./busqueda-a-star-min-heap.service");

parentPort.on("message", ({ id, contexto, perfil, cancelacion }) => {
  const inicio = performance.now();
  try {
    const indicador = new Int32Array(cancelacion);
    const resultado = aStarMinHeap({
      ...contexto,
      perfil,
      estaCancelada: () => Atomics.load(indicador, 0) !== 0,
    });
    parentPort.postMessage({
      id,
      resultado,
      tiempoBusquedaMs: performance.now() - inicio,
    });
  } catch (error) {
    parentPort.postMessage({
      id,
      error: {
        message: error?.message ?? "Falló la búsqueda de ruta.",
        code: error?.code ?? "ERROR_BUSQUEDA",
      },
      tiempoBusquedaMs: performance.now() - inicio,
    });
  }
});

if (
  process.env.NODE_ENV !== "production" &&
  process.env.RUTASEGURA_DEBUG_ALGORITMOS === "true"
) {
  parentPort.postMessage({ tipo: "ready" });
}
