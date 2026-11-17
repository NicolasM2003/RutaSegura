import {
  Circle,
  CircleMarker,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import { agruparConcentracionesDelitos } from "../concentracion-delitos";

const RADIO_ZONA =
  65;

function obtenerColorRiesgo(
  nivel: string
) {
  switch (nivel) {
    case "Alto":
      return "#dc2626";

    case "Medio":
      return "#facc15";

    case "Bajo":
      return "#16a34a";

    default:
      return "#9ca3af";
  }
}

function obtenerEtiquetaRiesgo(
  nivel: string
) {
  switch (nivel) {
    case "Alto":
      return "RIESGO ALTO";

    case "Medio":
      return "RIESGO MEDIO";

    case "Bajo":
      return "RIESGO BAJO";

    default:
      return "RIESGO NO DEFINIDO";
  }
}

function obtenerOpacidadZona(
  zoom: number
) {
  if (zoom <= 10)
    return 0.06;

  if (zoom <= 11)
    return 0.08;

  if (zoom <= 12)
    return 0.11;

  if (zoom <= 13)
    return 0.15;

  if (zoom <= 14)
    return 0.2;

  return 0.26;
}

function obtenerPesoBorde(
  zoom: number
) {
  return zoom <= 11
    ? 1
    : 2;
}

function obtenerRadioZona(
  zoom: number
) {
  if (zoom <= 10)
    return 45;

  if (zoom <= 11)
    return 50;

  if (zoom <= 12)
    return 55;

  if (zoom <= 13)
    return RADIO_ZONA;

  if (zoom <= 14)
    return 68;

  return 72;
}

/*
 * ================================
 * RED PEATONAL
 * ================================
 */
export function CapaRedPeatonal({
  redPeatonal,
  comunaRedPeatonal,
}: {
  redPeatonal: any[];
  comunaRedPeatonal: string;
}) {
  return (
    <>
      {redPeatonal.map(
        (
          segmento,
          index
        ) => {
          if (
            !Array.isArray(
              segmento.geometria
            ) ||
            segmento
              .geometria
              .length < 2
          ) {
            return null;
          }

          const posiciones =
            segmento.geometria
              .map(
                (punto: any) => [
                  Number(
                    punto.latitud
                  ),
                  Number(
                    punto.longitud
                  ),
                ]
              )
              .filter(
                (
                  posicion: number[]
                ) =>
                  Number.isFinite(
                    posicion[0]
                  ) &&
                  Number.isFinite(
                    posicion[1]
                  )
              );

          if (
            posiciones.length <
            2
          ) {
            return null;
          }

          const esExclusiva =
            segmento.categoria_peatonal ===
            "exclusiva";

          return (
            <Polyline
              key={
                segmento.id_osm ||
                index
              }
              positions={
                posiciones
              }
              pathOptions={{
                color:
                  esExclusiva
                    ? "#2563eb"
                    : "#64748b",

                weight:
                  esExclusiva
                    ? 3
                    : 2,

                opacity:
                  0.75,
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 190,
                    fontFamily:
                      "Arial, sans-serif",
                  }}
                >
                  <strong>
                    Segmento peatonal
                  </strong>

                  <br />

                  <strong>
                    Nombre:
                  </strong>{" "}
                  {segmento.nombre ??
                    "Sin nombre"}

                  <br />

                  <strong>
                    Tipo:
                  </strong>{" "}
                  {segmento.tipo ??
                    "No informado"}

                  <br />

                  <strong>
                    Categoría:
                  </strong>{" "}
                  {segmento.categoria_peatonal ??
                    "No definida"}

                  <br />

                  <strong>
                    Comuna:
                  </strong>{" "}
                  {segmento.comuna ??
                    comunaRedPeatonal}

                  <br />

                  <strong>
                    Superficie:
                  </strong>{" "}
                  {segmento.superficie ??
                    "No informada"}

                  <br />

                  <strong>
                    Longitud:
                  </strong>{" "}
                  {segmento.longitud_metros ??
                    "No disponible"}{" "}
                  m

                  <br />

                  <strong>
                    Nodo inicio:
                  </strong>{" "}
                  {segmento.nodo_inicio ??
                    "No disponible"}

                  <br />

                  <strong>
                    Nodo fin:
                  </strong>{" "}
                  {segmento.nodo_fin ??
                    "No disponible"}
                </div>
              </Popup>
            </Polyline>
          );
        }
      )}
    </>
  );
}

/*
 * ================================
 * ZONAS DE RIESGO
 * ================================
 */
export function CapaZonasRiesgo({
  zonas,
  zoom,
}: {
  zonas: any[];
  zoom: number;
}) {
  return (
    <>
      {zonas.map(
        (
          zona,
          index
        ) => {
          const latitud =
            Number(
              zona.latitud
            );

          const longitud =
            Number(
              zona.longitud
            );

          if (
            !Number.isFinite(
              latitud
            ) ||
            !Number.isFinite(
              longitud
            )
          ) {
            return null;
          }

          const color =
            obtenerColorRiesgo(
              zona.nivel
            );

          const buffers = Array.isArray(zona.geometria_zona?.centros)
            ? zona.geometria_zona.centros
            : [{ latitud, longitud }];
          const radioMetros = Number(zona.geometria_zona?.radio_metros) || obtenerRadioZona(zoom);

          return buffers.map((buffer: any, bufferIndex: number) => {
            const centroLatitud = Number(buffer.latitud);
            const centroLongitud = Number(buffer.longitud);
            if (!Number.isFinite(centroLatitud) || !Number.isFinite(centroLongitud)) return null;

            return (
              <Circle
                key={`${zona.comuna}-${zona.id_zona || index}-${bufferIndex}`}
                center={[centroLatitud, centroLongitud]}
                radius={radioMetros}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: obtenerOpacidadZona(zoom),
                  weight: obtenerPesoBorde(zoom),
                }}
              >
                <Popup>
                  <div style={{ minWidth: 180, fontFamily: "Arial, sans-serif" }}>
                    <div style={{ color, fontSize: 17, fontWeight: "bold", marginBottom: 10 }}>
                      {obtenerEtiquetaRiesgo(zona.nivel)}
                    </div>
                    <div style={{ marginBottom: 5 }}>
                      <strong>Delitos:</strong> {zona.cantidad_delitos}
                    </div>
                    <div>
                      <strong>Puntaje final:</strong> {zona.puntajeFinal}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 11, color: "#4b5563" }}>
                      {zona.metodo_agrupacion === "coordenadas_reportadas_identicas"
                        ? "Zona formada por dos coordenadas reportadas idénticas"
                        : "Zona generada con DBSCAN"} · influencia {radioMetros} m
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          });
        }
      )}
    </>
  );
}

/*
 * ================================
 * DELITOS
 * ================================
 */
export function CapaDelitos({
  delitos,
}: {
  delitos: any[];
}) {
  return (
    <>
      {delitos.map((delito: any, index: number) => {
        const latitud = Number(delito.latitud);
        const longitud = Number(delito.longitud);
        if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null;
        return (
          <CircleMarker
            key={delito.id ?? index}
            center={[latitud, longitud]}
            radius={4}
            pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 0.9, weight: 1 }}
          >
          <Popup>
            <div style={{ minWidth: 180, fontFamily: "Arial, sans-serif" }}>
              <strong>Evento delictual</strong><br />
              <strong>Fecha:</strong> {delito.fecha ?? "No informada"}<br />
              <strong>Horario:</strong> {delito.rango_horario ?? "No informado"}<br />
              <strong>Grupo:</strong> {delito.grupo_delito ?? "No informado"}<br />
              <strong>Lugar:</strong> {delito.lugar ?? "No informado"}<br />
              <strong>Comuna:</strong> {delito.comuna ?? "No informada"}
            </div>
          </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export function CapaConcentracionDelitos({
  delitos,
  rangoHorario,
}: {
  delitos: any[];
  rangoHorario?: string | null;
}) {
  const concentraciones = agruparConcentracionesDelitos(delitos, rangoHorario);
  // Resolve Leaflet lazily so importing the map layer remains safe in SSR/Jest.
  const crearIcono = (cantidad: number, color: string) => {
    const { divIcon } = require("leaflet") as typeof import("leaflet");
    return divIcon({
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      html: `<div style="box-sizing:border-box;width:28px;height:28px;border:2px solid #fff;border-radius:50%;background:${color}bf;box-shadow:0 1px 4px #0008;display:flex;align-items:center;justify-content:center;color:#111827;font:700 12px Arial,sans-serif">${cantidad}</div>`,
    });
  };

  return (
    <>
      {concentraciones.map((concentracion) => (
        <Marker
          key={concentracion.id}
          position={[concentracion.latitud, concentracion.longitud]}
          icon={crearIcono(concentracion.cantidad_delitos, concentracion.color)}
          zIndexOffset={1000}
          title={`Concentración de delitos: ${concentracion.cantidad_delitos}`}
        >
          <Popup>
            <div style={{ minWidth: 190, maxWidth: 280, fontFamily: "Arial, sans-serif" }}>
              <strong>Concentración de delitos</strong>
              <div style={{ marginTop: 5 }}>
                <strong>Registros en esta coordenada reportada:</strong> {concentracion.cantidad_delitos}
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: "#4b5563" }}>
                Representa una celda de coordenadas reportada; no una ubicación física exacta.
              </div>
              <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 7 }}>
                {concentracion.delitos.map((delito: any, index: number) => (
                  <div key={delito.id ?? index} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 5, marginTop: 5 }}>
                    <strong>Registro {index + 1}</strong><br />
                    Fecha: {delito.fecha ?? "No informada"}<br />
                    Horario: {delito.rango_horario ?? "No informado"}<br />
                    Grupo: {delito.grupo_delito ?? "No informado"}<br />
                    Lugar: {delito.lugar ?? "No informado"}<br />
                    Comuna: {delito.comuna ?? "No informada"}
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/*
 * ================================
 * LEYENDA
 * ================================
 */
export function LeyendaMapa() {
  return (
    <div
      style={{
        position:
          "absolute",
        zIndex: 10000,
        left: 15,
        bottom: 15,
        background:
          "rgba(255,255,255,0.96)",
        padding:
          "12px 15px",
        borderRadius: 8,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.2)",
        fontFamily:
          "Arial, sans-serif",
        fontSize: 13,
        minWidth: 200,
      }}
    >
      <div
        style={{
          fontWeight:
            "bold",
          marginBottom: 8,
        }}
      >
        Información del mapa
      </div>

      <div style={{ fontWeight: "bold", marginBottom: 6 }}>
        Concentración de delitos
      </div>
      {[
        ["#16a34a", "Verde: 1 delito."],
        ["#facc15", "Amarillo: 2 delitos."],
        ["#dc2626", "Rojo: 3 o más delitos."],
      ].map(([color, label]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: color, border: "1px solid #fff", boxShadow: "0 0 1px #111" }} />
          <span>{label}</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 10 }}>
        Representa coordenadas reportadas, no ubicaciones físicas exactas.
      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 6,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            display:
              "inline-block",
            width: 24,
            height: 3,
            background:
              "#2563eb",
          }}
        />

        <span>
          Ruta peatonal exclusiva
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display:
              "inline-block",
            width: 24,
            height: 3,
            background:
              "#64748b",
          }}
        />

        <span>
          Vía compartida
        </span>
      </div>

      <div
        style={{
          fontWeight:
            "bold",
          marginBottom: 7,
        }}
      >
        Nivel de riesgo
      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            color:
              "#dc2626",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ●
        </span>

        <span>
          Alto
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            color:
              "#facc15",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ●
        </span>

        <span>
          Medio
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 6,
        }}
      >
        <span
          style={{
            color:
              "#16a34a",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ●
        </span>

        <span>
          Bajo
        </span>
      </div>
    </div>
  );
}
