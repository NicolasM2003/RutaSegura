import { useState } from "react";
import type { CSSProperties } from "react";
import type { DestinoRuta, ResultadoDireccion } from "../direccion";

type Punto = { latitud: number; longitud: number } | null;
type Props = {
  origen: Punto;
  destino: Punto;
  modo: DestinoRuta | null;
  alElegirModo: (modo: DestinoRuta) => void;
  alReiniciar: () => void;
  alUsarMiUbicacion: () => void;
  buscandoUbicacion: boolean;
  estadoUbicacion: string | null;
  buscarDireccion: (consulta: string, destino: DestinoRuta) => Promise<ResultadoDireccion[]>;
  seleccionarDireccion: (destino: DestinoRuta, resultado: ResultadoDireccion) => void;
};

const boton = (activo = false): CSSProperties => ({
  border: "1px solid #d1d5db", borderRadius: 7, padding: "8px 10px", cursor: "pointer",
  background: activo ? "#2563eb" : "#fff", color: activo ? "#fff" : "#111827", fontWeight: 700,
});

export default function UbicacionesMapaWeb(props: Props) {
  const [destino, setDestino] = useState<DestinoRuta>("origen");
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoDireccion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutarBusqueda = async () => {
    setCargando(true); setError(null); setResultados([]);
    try {
      const encontrados = await props.buscarDireccion(consulta, destino);
      setResultados(encontrados);
      if (!encontrados.length) setError("No se encontraron direcciones dentro de 4 km del punto de referencia.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible buscar la dirección.");
    } finally { setCargando(false); }
  };

  return <section aria-label="Seleccionar origen y destino" style={{ position: "absolute", zIndex: 12000, top: 65, left: 15, width: 330, maxWidth: "calc(100% - 30px)", background: "rgba(255,255,255,0.97)", padding: 10, borderRadius: 9, boxShadow: "0 2px 8px rgba(0,0,0,0.22)", fontFamily: "Arial, sans-serif" }}>
    <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
      <button type="button" style={boton(props.modo === "origen")} onClick={() => { setDestino("origen"); props.alElegirModo("origen"); }}>Elegir origen en mapa</button>
      <button type="button" style={boton(props.modo === "destino")} onClick={() => { setDestino("destino"); props.alElegirModo("destino"); }}>Elegir destino</button>
    </div>
    <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
      <button type="button" style={boton()} disabled={props.buscandoUbicacion} onClick={props.alUsarMiUbicacion}>{props.buscandoUbicacion ? "Obteniendo ubicación…" : "Usar mi ubicación como origen"}</button>
      {(props.origen || props.destino) && <button type="button" style={boton()} onClick={props.alReiniciar}>Limpiar</button>}
    </div>
    <div style={{ display: "flex", gap: 5 }}>
      <select aria-label="Buscar dirección para" value={destino} onChange={(event) => setDestino(event.target.value as DestinoRuta)} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }}>
        <option value="origen">Origen</option><option value="destino">Destino</option>
      </select>
      <input aria-label="Dirección" value={consulta} onChange={(event) => setConsulta(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ejecutarBusqueda(); }} placeholder="Dirección, número y comuna" style={{ minWidth: 0, flex: 1, padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
      <button type="button" disabled={cargando || consulta.trim().length < 3} style={boton(true)} onClick={() => void ejecutarBusqueda()}>{cargando ? "…" : "Buscar"}</button>
    </div>
    {error && <div role="status" style={{ color: "#b91c1c", fontSize: 12, paddingTop: 6 }}>{error}</div>}
    {resultados.length > 0 && <div role="list" style={{ maxHeight: 150, overflowY: "auto", marginTop: 5 }}>
      {resultados.map((resultado, index) => <button key={`${resultado.latitud}-${resultado.longitud}-${index}`} type="button" role="listitem" onClick={() => { props.seleccionarDireccion(destino, resultado); setResultados([]); }} style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderTop: "1px solid #e5e7eb", background: "white", padding: 8, cursor: "pointer", color: "#111827" }}>{resultado.etiqueta}{resultado.distanciaMetros !== undefined ? ` · ${(resultado.distanciaMetros / 1000).toFixed(1)} km del punto de referencia` : ""}</button>)}
    </div>}
    <div style={{ color: "#6b7280", fontSize: 10, marginTop: 5 }}>Direcciones: © OpenStreetMap contributors</div>
    <div aria-live="polite" style={{ color: "#374151", fontSize: 11, marginTop: 4 }}>{props.estadoUbicacion ?? (props.origen ? `Origen: ${props.origen.latitud.toFixed(5)}, ${props.origen.longitud.toFixed(5)}` : "Elige el origen tocando el mapa, usando tu ubicación o buscando una dirección.")}{props.destino ? ` · Destino: ${props.destino.latitud.toFixed(5)}, ${props.destino.longitud.toFixed(5)}` : ""}</div>
  </section>;
}
