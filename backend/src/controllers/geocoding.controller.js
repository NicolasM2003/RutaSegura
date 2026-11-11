const { buscarDireccion } = require("../services/geocoding.service");

async function buscarDireccionController(req, res) {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 3 || query.length > 200) {
    return res.status(400).json({ error: "Ingresa una dirección entre 3 y 200 caracteres." });
  }
  const hasLat = req.query.lat !== undefined;
  const hasLon = req.query.lon !== undefined;
  if (hasLat !== hasLon) return res.status(400).json({ error: "lat y lon deben enviarse juntos." });
  let referencia = null;
  if (hasLat && hasLon) {
    const latitud = Number(req.query.lat);
    const longitud = Number(req.query.lon);
    const radioMetros = Number(req.query.radio ?? 4000);
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90 || !Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      return res.status(400).json({ error: "El punto de referencia no es válido." });
    }
    if (!Number.isFinite(radioMetros) || radioMetros < 100 || radioMetros > 4000) {
      return res.status(400).json({ error: "El radio de búsqueda debe estar entre 100 y 4000 metros." });
    }
    referencia = { latitud, longitud };
  }
  try {
    const resultados = await buscarDireccion(query, referencia, Number(req.query.radio ?? 4000));
    return res.status(200).json({ data: resultados, attribution: "Geocodificación © OpenStreetMap contributors" });
  } catch (error) {
    console.error("Error al buscar dirección:", error);
    return res.status(502).json({ error: "No fue posible buscar la dirección. Inténtalo nuevamente." });
  }
}

module.exports = { buscarDireccionController };
