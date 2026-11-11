export const PROXIMIDAD_ZONA_RIESGO_METROS = 100;

export type CoordenadaMapa = { latitude: number; longitude: number };
export type PuntoRutaSeleccionado = { latitud: number; longitud: number };

export type ZonaConCoordenadas = {
  id_zona?: string | number;
  comuna?: string;
  latitud: number | string;
  longitud: number | string;
  nivel?: string;
};

export type ZonaProxima<T extends ZonaConCoordenadas = ZonaConCoordenadas> = {
  zona: T;
  distanciaMetros: number;
};

function distanciaHaversineMetros(
  punto: CoordenadaMapa,
  zona: ZonaConCoordenadas,
) {
  const lat = Number(zona.latitud);
  const lon = Number(zona.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const rad = Math.PI / 180;
  const dLat = (lat - punto.latitude) * rad;
  const dLon = (lon - punto.longitude) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(punto.latitude * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function claveZonaRiesgo(zona: ZonaConCoordenadas) {
  return `${zona.comuna ?? ""}:${zona.id_zona ?? `${zona.latitud},${zona.longitud}`}`;
}

export function analizarPuntoSeleccionado<T extends ZonaConCoordenadas>(
  coordenada: CoordenadaMapa,
  zonas: T[],
  distanciaMaximaMetros = PROXIMIDAD_ZONA_RIESGO_METROS,
) {
  const punto: PuntoRutaSeleccionado = {
    latitud: coordenada.latitude,
    longitud: coordenada.longitude,
  };
  let cercana: ZonaProxima<T> | null = null;

  for (const zona of zonas) {
    const distanciaMetros = distanciaHaversineMetros(coordenada, zona);
    if (distanciaMetros !== null && distanciaMetros <= distanciaMaximaMetros &&
      (cercana === null || distanciaMetros < cercana.distanciaMetros)) {
      cercana = { zona, distanciaMetros };
    }
  }

  // La zona es únicamente una asociación visual: el punto de ruta no se ajusta
  // al centro de la zona ni se convierte en el destino.
  return { punto, zonaProxima: cercana };
}
