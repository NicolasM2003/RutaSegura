const RADIO_TIERRA_METROS = 6371000;

const haversine = (a, b) => {
  const latA = Number(a.latitud);
  const latB = Number(b.latitud);
  const lonA = Number(a.longitud);
  const lonB = Number(b.longitud);
  if (![latA, latB, lonA, lonB].every(Number.isFinite)) return Infinity;
  const rad = Math.PI / 180;
  const dLat = (latB - latA) * rad;
  const dLon = (lonB - lonA) * rad;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat ** 2 + Math.cos(latA * rad) * Math.cos(latB * rad) * sinLon ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(Math.min(1, h)));
};

const crearIndiceEspacial = (puntos, tamanoCeldaMetros = 75, latitudReferencia) => {
  const latitudes = puntos.map((p) => Number(p.latitud)).filter(Number.isFinite);
  const latRef = Number.isFinite(latitudReferencia)
    ? latitudReferencia
    : latitudes.reduce((suma, lat) => suma + lat, 0) / Math.max(1, latitudes.length);
  const cosLat = Math.max(0.01, Math.cos(latRef * Math.PI / 180));
  const escalarY = Math.PI / 180 * RADIO_TIERRA_METROS;
  const escalarX = escalarY * cosLat;
  const aXY = (p) => ({ x: Number(p.longitud) * escalarX, y: Number(p.latitud) * escalarY });
  const celdas = new Map();
  const entradas = puntos.map((punto, indice) => {
    const xy = aXY(punto);
    const entrada = { ...punto, indiceOriginal: indice, x: xy.x, y: xy.y };
    const clave = `${Math.floor(xy.x / tamanoCeldaMetros)}:${Math.floor(xy.y / tamanoCeldaMetros)}`;
    if (!celdas.has(clave)) celdas.set(clave, []);
    celdas.get(clave).push(entrada);
    return entrada;
  });

  const buscarCajaXY = (minX, minY, maxX, maxY) => {
    const encontrados = [];
    const minCx = Math.floor(minX / tamanoCeldaMetros);
    const maxCx = Math.floor(maxX / tamanoCeldaMetros);
    const minCy = Math.floor(minY / tamanoCeldaMetros);
    const maxCy = Math.floor(maxY / tamanoCeldaMetros);
    for (let x = minCx; x <= maxCx; x += 1) {
      for (let y = minCy; y <= maxCy; y += 1) {
        encontrados.push(...(celdas.get(`${x}:${y}`) || []));
      }
    }
    return encontrados;
  };

  return {
    latitudReferencia: latRef,
    tamanoCeldaMetros,
    entradas,
    aXY,
    buscarCajaXY,
    buscarCercanos(punto, radioMetros) {
      const xy = aXY(punto);
      return buscarCajaXY(xy.x - radioMetros, xy.y - radioMetros, xy.x + radioMetros, xy.y + radioMetros)
        .filter((otro) => haversine(punto, otro) <= radioMetros);
    },
    buscarEnGeometria(geometria, margenMetros = 0) {
      if (!Array.isArray(geometria) || geometria.length === 0) return [];
      const puntosXY = geometria.map(aXY);
      return buscarCajaXY(
        Math.min(...puntosXY.map((p) => p.x)) - margenMetros,
        Math.min(...puntosXY.map((p) => p.y)) - margenMetros,
        Math.max(...puntosXY.map((p) => p.x)) + margenMetros,
        Math.max(...puntosXY.map((p) => p.y)) + margenMetros,
      );
    },
  };
};

const puntoEnSegmentoMetros = (punto, inicio, fin, indice) => {
  const p = indice.aXY(punto);
  const a = indice.aXY(inicio);
  const b = indice.aXY(fin);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const longitud2 = dx * dx + dy * dy;
  const t = longitud2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / longitud2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

const intervaloSegmentoCirculo = (inicio, fin, centro, radioMetros, indice) => {
  const a = indice.aXY(inicio);
  const b = indice.aXY(fin);
  const c = indice.aXY(centro);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - c.x;
  const fy = a.y - c.y;
  const aa = dx * dx + dy * dy;
  if (aa === 0) return Math.hypot(fx, fy) <= radioMetros ? [0, 1] : null;
  const bb = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - radioMetros * radioMetros;
  const discriminante = bb * bb - 4 * aa * cc;
  if (discriminante < 0) return cc <= 0 ? [0, 1] : null;
  const raiz = Math.sqrt(discriminante);
  const t0 = Math.max(0, (-bb - raiz) / (2 * aa));
  const t1 = Math.min(1, (-bb + raiz) / (2 * aa));
  return t0 <= t1 ? [t0, t1] : null;
};

const muestrearGeometria = (geometria, pasoMetros, indice) => {
  const muestras = [];
  for (let i = 0; i < geometria.length - 1; i += 1) {
    const inicio = geometria[i];
    const fin = geometria[i + 1];
    const largo = haversine(inicio, fin);
    if (!Number.isFinite(largo) || largo <= 0) continue;
    const a = indice.aXY(inicio);
    const b = indice.aXY(fin);
    const pasos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / pasoMetros));
    for (let j = 0; j <= pasos; j += 1) {
      if (i > 0 && j === 0) continue;
      const t = j / pasos;
      muestras.push({
        latitud: Number(inicio.latitud) + (Number(fin.latitud) - Number(inicio.latitud)) * t,
        longitud: Number(inicio.longitud) + (Number(fin.longitud) - Number(inicio.longitud)) * t,
      });
    }
  }
  return muestras;
};

module.exports = {
  RADIO_TIERRA_METROS,
  haversine,
  crearIndiceEspacial,
  puntoEnSegmentoMetros,
  intervaloSegmentoCirculo,
  muestrearGeometria,
};
