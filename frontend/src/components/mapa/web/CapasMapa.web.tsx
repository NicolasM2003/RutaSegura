import {
  Circle,
  CircleMarker,
  Polyline,
  Popup,
} from "react-leaflet";

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

          return (
            <Circle
              key={`${zona.comuna}-${zona.id_zona || index}`}
              center={[
                latitud,
                longitud,
              ]}
              radius={obtenerRadioZona(
                zoom
              )}
              pathOptions={{
                color,
                fillColor:
                  color,
                fillOpacity:
                  obtenerOpacidadZona(
                    zoom
                  ),
                weight:
                  obtenerPesoBorde(
                    zoom
                  ),
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 180,
                    fontFamily:
                      "Arial, sans-serif",
                  }}
                >
                  <div
                    style={{
                      color,
                      fontSize: 17,
                      fontWeight:
                        "bold",
                      marginBottom:
                        10,
                    }}
                  >
                    {obtenerEtiquetaRiesgo(
                      zona.nivel
                    )}
                  </div>

                  <div
                    style={{
                      marginBottom:
                        5,
                    }}
                  >
                    <strong>
                      Delitos:
                    </strong>{" "}
                    {
                      zona.cantidad_delitos
                    }
                  </div>

                  <div>
                    <strong>
                      Puntaje final:
                    </strong>{" "}
                    {
                      zona.puntajeFinal
                    }
                  </div>
                </div>
              </Popup>
            </Circle>
          );
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
      {delitos.map(
        (
          delito,
          index
        ) => {
          const latitud =
            Number(
              delito.latitud
            );

          const longitud =
            Number(
              delito.longitud
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

          return (
            <CircleMarker
              key={
                delito.id ||
                index
              }
              center={[
                latitud,
                longitud,
              ]}
              radius={4}
              pathOptions={{
                color:
                  "#111827",
                fillColor:
                  "#111827",
                fillOpacity:
                  0.9,
                weight: 1,
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 180,
                    fontFamily:
                      "Arial, sans-serif",
                  }}
                >
                  <strong>
                    Evento delictual
                  </strong>

                  <br />

                  <strong>
                    Fecha:
                  </strong>{" "}
                  {delito.fecha ??
                    "No informada"}

                  <br />

                  <strong>
                    Horario:
                  </strong>{" "}
                  {delito.rango_horario ??
                    "No informado"}

                  <br />

                  <strong>
                    Grupo:
                  </strong>{" "}
                  {delito.grupo_delito ??
                    "No informado"}

                  <br />

                  <strong>
                    Lugar:
                  </strong>{" "}
                  {delito.lugar ??
                    "No informado"}

                  <br />

                  <strong>
                    Comuna:
                  </strong>{" "}
                  {delito.comuna ??
                    "No informada"}
                </div>
              </Popup>
            </CircleMarker>
          );
        }
      )}
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