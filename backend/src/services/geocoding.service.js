const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1100;
const cache = new Map();
let lastRequestAt = 0;
let requestQueue = Promise.resolve();

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function limitarSolicitudes() {
  const tarea = requestQueue.then(async () => {
    const espera = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (espera) await esperar(espera);
    lastRequestAt = Date.now();
  });
  requestQueue = tarea.catch(() => {});
  await tarea;
}

async function buscarDireccion(query, referencia = null, radioMetros = 4000) {
  const clave = `${query.trim().toLocaleLowerCase("es-CL")}|${referencia ? `${referencia.latitud},${referencia.longitud},${radioMetros}` : "sin-centro"}`;
  const almacenado = cache.get(clave);
  if (almacenado && almacenado.expira > Date.now()) return almacenado.resultados;

  await limitarSolicitudes();
  const baseUrl = process.env.GEOCODING_URL || "https://nominatim.openstreetmap.org/search";
  const url = new URL(baseUrl);
  const parametros = new URLSearchParams({ q: query, format: "jsonv2", limit: "10", countrycodes: "cl" });
  if (referencia) {
    const latitudRadio = radioMetros / 111320;
    const longitudRadio = radioMetros / (111320 * Math.max(Math.cos(referencia.latitud * Math.PI / 180), 0.1));
    parametros.set("viewbox", [referencia.longitud - longitudRadio, referencia.latitud + latitudRadio, referencia.longitud + longitudRadio, referencia.latitud - latitudRadio].join(","));
    parametros.set("bounded", "1");
  }
  url.search = parametros.toString();
  const respuesta = await fetch(url, {
    headers: { "User-Agent": `RutaSegura/1.0${process.env.GEOCODING_CONTACT ? ` (+${process.env.GEOCODING_CONTACT})` : ""}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!respuesta.ok) throw new Error(`Geocoder respondió HTTP ${respuesta.status}`);
  const datos = await respuesta.json();
  if (!Array.isArray(datos)) throw new Error("Respuesta inválida del geocoder");

  const resultados = datos.flatMap((item) => {
    const latitud = Number(item.lat);
    const longitud = Number(item.lon);
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return [];
    const distanciaMetros = referencia ? distanciaHaversine(referencia.latitud, referencia.longitud, latitud, longitud) : undefined;
    if (distanciaMetros !== undefined && distanciaMetros > radioMetros) return [];
    return [{ latitud, longitud, etiqueta: String(item.display_name || "Dirección"), ...(distanciaMetros === undefined ? {} : { distanciaMetros: Math.round(distanciaMetros) }) }];
  });
  cache.set(clave, { resultados, expira: Date.now() + CACHE_TTL_MS });
  return resultados;
}

function distanciaHaversine(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { buscarDireccion };
