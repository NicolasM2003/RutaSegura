const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { performance } = require("node:perf_hooks");
const {
  TRABAJADORES_BUSQUEDA,
  MAX_TRABAJOS_EN_COLA,
} = require("../config/rutas-alternativas.config");
const diagnosticoWorkerActivo =
  process.env.NODE_ENV !== "production" &&
  process.env.RUTASEGURA_DEBUG_ALGORITMOS === "true";

const crearError = (message, code) => Object.assign(new Error(message), { code });

class PoolBusquedaRutas {
  constructor({ cantidadTrabajadores = TRABAJADORES_BUSQUEDA, maxCola = MAX_TRABAJOS_EN_COLA } = {}) {
    this.cantidadTrabajadores = cantidadTrabajadores;
    this.maxCola = maxCola;
    this.trabajadores = [];
    this.cola = [];
    this.secuencia = 0;
    this.loteSiguiente = 0;
  }

  iniciar() {
    if (this.trabajadores.length) return;
    this.trabajadores = Array.from({ length: this.cantidadTrabajadores }, () => ({
      worker: null,
      actual: null,
      listo: false,
      inicioArranqueMs: 0,
      tiempoArranqueMs: null,
      listoEnMs: null,
    }));
    this.trabajadores.forEach((slot) => this.crearTrabajador(slot));
  }

  crearTrabajador(slot) {
    slot.listo = false;
    slot.inicioArranqueMs = performance.now();
    slot.tiempoArranqueMs = null;
    slot.listoEnMs = null;
    const worker = new Worker(path.join(__dirname, "busqueda-rutas.worker.js"));
    slot.worker = worker;
    if (!diagnosticoWorkerActivo) {
      // En producción conserva el despacho original: worker_threads deja en
      // cola el mensaje hasta que el worker adjunta su listener.
      slot.listo = true;
      slot.listoEnMs = slot.inicioArranqueMs;
    }
    worker.unref();
    worker.on("message", (mensaje) => {
      if (slot.worker !== worker) return;
      if (mensaje?.tipo === "ready") {
        slot.listo = true;
        slot.listoEnMs = performance.now();
        slot.tiempoArranqueMs = performance.now() - slot.inicioArranqueMs;
        this.despachar();
        return;
      }
      const job = slot.actual;
      if (!job || job.id !== mensaje.id) return;

      slot.actual = null;
      worker.unref();
      if (mensaje.error) {
        job.reject(crearError(mensaje.error.message, mensaje.error.code));
      } else {
        job.resolve({
          resultado: mensaje.resultado,
          tiempoBusquedaMs: mensaje.tiempoBusquedaMs,
          tiempoTransferenciaContextoMs: job.tiempoTransferenciaContextoMs,
          tiempoEnColaMs: job.tiempoEsperaPoolMs,
          tiempoArranqueWorkerMs: job.tiempoArranqueWorkerMs,
          tiempoEsperaDisponibilidadWorkerMs: job.tiempoEsperaDisponibilidadWorkerMs,
          tiempoEsperaPoolMs: job.tiempoEsperaPoolMs,
          tiempoRoundTripWorkerMs: performance.now() - job.inicioPostMessageMs,
          tiempoPostMessageMs: job.tiempoPostMessageMs,
        });
      }
      this.despachar();
    });

    const reemplazar = (error) => {
      if (slot.worker !== worker) return;
      const job = slot.actual;
      slot.actual = null;
      slot.listo = false;
      if (job) job.reject(error ?? crearError("El trabajador de rutas se detuvo.", "TRABAJADOR_DETENIDO"));
      slot.worker = null;
      this.crearTrabajador(slot);
      this.despachar();
    };
    worker.on("error", (error) => reemplazar(crearError(error.message, "ERROR_TRABAJADOR")));
    worker.on("exit", (code) => {
      if (slot.worker === worker && code !== 0) {
        reemplazar(crearError(`El trabajador de rutas terminó con código ${code}.`, "TRABAJADOR_DETENIDO"));
      }
    });
  }

  ejecutarLote(tareas, { signal } = {}) {
    if (!Array.isArray(tareas) || tareas.length === 0) {
      return Promise.resolve({ resultados: [], metricas: { tiempoTotalMs: 0, tiempoTransferenciaContextoMs: 0 } });
    }
    if (signal?.aborted) {
      return Promise.reject(crearError("La solicitud de rutas fue cancelada.", "BUSQUEDA_CANCELADA"));
    }
    if (this.cola.length + tareas.length > this.maxCola) {
      return Promise.reject(crearError("El servicio de rutas está ocupado. Inténtalo nuevamente.", "BUSQUEDA_SATURADA"));
    }

    this.iniciar();
    const inicioLote = performance.now();
    const loteId = this.loteSiguiente++;
    const cancelacion = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const indicadorCancelacion = new Int32Array(cancelacion);
    const trabajos = tareas.map((tarea, indice) => {
      let resolve;
      let reject;
      const promesa = new Promise((resolver, rechazar) => {
        resolve = resolver;
        reject = rechazar;
      });
      const job = {
        id: `${loteId}-${indice}`,
        loteId,
        tarea,
        prioridad: indice === 0 ? 0 : 1,
        secuencia: this.secuencia++,
        cancelacion,
        enColaMs: performance.now(),
        inicioEjecucionMs: null,
        tiempoTransferenciaContextoMs: 0,
        resolve,
        reject,
      };
      this.cola.push(job);
      return { job, promesa };
    });
    this.cola.sort((a, b) => a.prioridad - b.prioridad || a.secuencia - b.secuencia);

    const cancelar = () => {
      Atomics.store(indicadorCancelacion, 0, 1);
      const pendientes = this.cola.filter((job) => job.loteId === loteId);
      this.cola = this.cola.filter((job) => job.loteId !== loteId);
      pendientes.forEach((job) => job.reject(crearError("La solicitud de rutas fue cancelada.", "BUSQUEDA_CANCELADA")));
      this.despachar();
    };
    signal?.addEventListener("abort", cancelar, { once: true });

    this.despachar();
    return Promise.all(trabajos.map(({ promesa }) => promesa))
      .then((resultados) => ({
        resultados,
        metricas: {
          tiempoTotalMs: performance.now() - inicioLote,
          tiempoTransferenciaContextoMs: resultados.reduce(
            (suma, resultado) => suma + resultado.tiempoTransferenciaContextoMs,
            0,
          ),
          tiempoEsperaColaMs: Math.max(0, ...resultados.map((resultado) => resultado.tiempoEnColaMs)),
          tiempoArranqueWorkersMs: resultados.reduce(
            (suma, resultado) => suma + (resultado.tiempoArranqueWorkerMs || 0),
            0,
          ),
          tiempoRoundTripWorkersMs: resultados.reduce(
            (suma, resultado) => suma + (resultado.tiempoRoundTripWorkerMs || 0),
            0,
          ),
          detalleTrabajos: resultados.map((resultado) => ({
            tiempoBusquedaMs: resultado.tiempoBusquedaMs,
            tiempoTransferenciaContextoMs: resultado.tiempoTransferenciaContextoMs,
            tiempoEsperaColaMs: resultado.tiempoEnColaMs,
            tiempoArranqueWorkerMs: resultado.tiempoArranqueWorkerMs,
            tiempoEsperaDisponibilidadWorkerMs: resultado.tiempoEsperaDisponibilidadWorkerMs,
            tiempoEsperaPoolMs: resultado.tiempoEsperaPoolMs,
            tiempoRoundTripWorkerMs: resultado.tiempoRoundTripWorkerMs,
            tiempoPostMessageMs: resultado.tiempoPostMessageMs,
          })),
        },
      }))
      .finally(() => signal?.removeEventListener("abort", cancelar));
  }

  despachar() {
    if (!this.trabajadores.length || !this.cola.length) return;
    for (const slot of this.trabajadores) {
      if (slot.actual || !slot.listo || !this.cola.length) continue;
      const job = this.cola.shift();
      if (Atomics.load(new Int32Array(job.cancelacion), 0) !== 0) {
        job.reject(crearError("La solicitud de rutas fue cancelada.", "BUSQUEDA_CANCELADA"));
        continue;
      }

      slot.actual = job;
      slot.worker.ref();
      job.inicioEjecucionMs = performance.now();
      job.tiempoArranqueWorkerMs = slot.listoEnMs >= job.enColaMs
        ? slot.tiempoArranqueMs
        : 0;
      job.tiempoEsperaDisponibilidadWorkerMs = Math.max(
        0,
        slot.listoEnMs - Math.max(slot.inicioArranqueMs, job.enColaMs),
      );
      job.tiempoEsperaPoolMs = Math.max(
        0,
        job.inicioEjecucionMs - Math.max(slot.listoEnMs, job.enColaMs),
      );
      const inicioTransferencia = performance.now();
      try {
        slot.worker.postMessage({
          id: job.id,
          contexto: job.tarea.contexto,
          perfil: job.tarea.perfil,
          cancelacion: job.cancelacion,
        });
        job.tiempoTransferenciaContextoMs = performance.now() - inicioTransferencia;
        job.tiempoPostMessageMs = job.tiempoTransferenciaContextoMs;
        job.inicioPostMessageMs = performance.now();
      } catch (error) {
        slot.actual = null;
        slot.worker.unref();
        job.reject(crearError(error.message, "ERROR_TRANSFERENCIA_CONTEXTO"));
      }
    }
  }
}

const pool = new PoolBusquedaRutas();

module.exports = {
  PoolBusquedaRutas,
  ejecutarLoteBusqueda: (tareas, opciones) => pool.ejecutarLote(tareas, opciones),
};
