import { useEffect, useState } from "react";

const RADIO_ZONA = 65;

export default function MapaRiesgo() {
  const [mapaComponentes, setMapaComponentes] =
    useState<any>(null);

  const [leaflet, setLeaflet] =
    useState<any>(null);

  const [zonas, setZonas] = useState<any[]>([]);
  const [delitos, setDelitos] = useState<any[]>([]);

  const [mostrarDelitos, setMostrarDelitos] =
    useState(false);

  const [zoom, setZoom] = useState(13);

  /*
   * Cargar Leaflet y React-Leaflet una sola vez.
   */
  useEffect(() => {
    const cargarMapa = async () => {
      try {
        const L = await import("leaflet");
        const componentes =
          await import("react-leaflet");

        setLeaflet(L);
        setMapaComponentes(componentes);
      } catch (error) {
        console.error(
          "Error cargando Leaflet:",
          error
        );
      }
    };

    cargarMapa();
  }, []);

  /*
   * Obtener zonas y delitos desde el backend.
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [
          respuestaZonas,
          respuestaDelitos,
        ] = await Promise.all([
          fetch(
            "http://localhost:3000/api/geografia?comuna=Vi%C3%B1a%20del%20Mar"
          ),
          fetch(
            "http://localhost:3000/api/delitos"
          ),
        ]);

        if (!respuestaZonas.ok) {
          throw new Error(
            `Error zonas HTTP: ${respuestaZonas.status}`
          );
        }

        if (!respuestaDelitos.ok) {
          throw new Error(
            `Error delitos HTTP: ${respuestaDelitos.status}`
          );
        }

        const resultadoZonas =
          await respuestaZonas.json();

        const resultadoDelitos =
          await respuestaDelitos.json();

        console.log(
          "Total zonas:",
          resultadoZonas.total
        );

        console.log(
          "Total delitos:",
          resultadoDelitos.total
        );

        setZonas(
          resultadoZonas.data || []
        );

        setDelitos(
          resultadoDelitos.data || []
        );
      } catch (error) {
        console.error(
          "Error obteniendo datos:",
          error
        );
      }
    };

    cargarDatos();
  }, []);

  if (!mapaComponentes || !leaflet) {
    return null;
  }

  const {
    MapContainer,
    TileLayer,
    Circle,
    CircleMarker,
    Popup,
    useMap,
    useMapEvents,
  } = mapaComponentes;

  /*
   * Colores del nivel de riesgo.
   * Solo representan el resultado del backend.
   */
  const obtenerColorRiesgo = (
    nivel: string
  ) => {
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
  };

  /*
   * Texto del nivel de riesgo.
   */
  const obtenerEtiquetaRiesgo = (
    nivel: string
  ) => {
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
  };

  /*
   * Opacidad de las zonas según zoom.
   */
  const obtenerOpacidadZona = () => {
    if (zoom <= 10) {
      return 0.06;
    }

    if (zoom <= 11) {
      return 0.08;
    }

    if (zoom <= 12) {
      return 0.11;
    }

    if (zoom <= 13) {
      return 0.15;
    }

    if (zoom <= 14) {
      return 0.2;
    }

    return 0.26;
  };

  /*
   * Grosor del borde.
   */
  const obtenerPesoBorde = () => {
    return zoom <= 11 ? 1 : 2;
  };

  /*
   * Radio visual de la zona.
   */
  const obtenerRadioZona = () => {
    if (zoom <= 10) {
      return 45;
    }

    if (zoom <= 11) {
      return 50;
    }

    if (zoom <= 12) {
      return 55;
    }

    if (zoom <= 13) {
      return RADIO_ZONA;
    }

    if (zoom <= 14) {
      return 68;
    }

    return 72;
  };

  /*
   * Detectar cambios de zoom.
   */
  const ControlZoom = () => {
    useMapEvents({
      zoomend: (event: any) => {
        setZoom(
          event.target.getZoom()
        );
      },
    });

    return null;
  };

  /*
   * Controles de zoom personalizados.
   */
  const ControlesMapa = () => {
    const map = useMap();

    return (
      <div
        style={{
          position: "absolute",
          zIndex: 10000,
          right: 15,
          bottom: 15,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 8,
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        <button
          type="button"
          onClick={() => map.zoomIn()}
          style={{
            width: 40,
            height: 40,
            border: "none",
            borderBottom:
              "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            fontSize: 22,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          +
        </button>

        <button
          type="button"
          onClick={() => map.zoomOut()}
          style={{
            width: 40,
            height: 40,
            border: "none",
            background: "#ffffff",
            color: "#111827",
            fontSize: 22,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          −
        </button>
      </div>
    );
  };

  /*
   * Botón real de Leaflet para mostrar/ocultar delitos.
   */
  const ControlDelitos = () => {
    const map = useMap();

    useEffect(() => {
      const control = new leaflet.Control({
        position: "topright",
      });

      control.onAdd = () => {
        const contenedor =
          leaflet.DomUtil.create(
            "div",
            "leaflet-control"
          );

        contenedor.style.marginTop = "10px";

        const boton =
          leaflet.DomUtil.create(
            "button",
            "",
            contenedor
          );

        boton.type = "button";

        boton.innerHTML =
          mostrarDelitos
            ? "Ocultar delitos"
            : "Mostrar delitos";

        boton.style.background =
          mostrarDelitos
            ? "#111827"
            : "#ffffff";

        boton.style.color =
          mostrarDelitos
            ? "#ffffff"
            : "#111827";

        boton.style.border = "none";
        boton.style.borderRadius = "8px";
        boton.style.padding =
          "10px 14px";
        boton.style.fontWeight = "bold";
        boton.style.fontSize = "14px";
        boton.style.cursor = "pointer";
        boton.style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.25)";
        boton.style.whiteSpace =
          "nowrap";

        leaflet.DomEvent.on(
          boton,
          "click",
          (event: any) => {
            leaflet.DomEvent.stopPropagation(
              event
            );

            leaflet.DomEvent.preventDefault(
              event
            );

            setMostrarDelitos(
              (actual) => !actual
            );
          }
        );

        leaflet.DomEvent.disableClickPropagation(
          contenedor
        );

        return contenedor;
      };

      map.addControl(control);

      return () => {
        map.removeControl(control);
      };
    }, [
      map,
      mostrarDelitos,
      leaflet,
    ]);

    return null;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
      }}
    >
      <MapContainer
        center={[
          -33.0245,
          -71.5518,
        ]}
        zoom={13}
        style={{
          width: "100%",
          height: "100%",
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ControlZoom />
        <ControlesMapa />
        <ControlDelitos />

        {/* ============================== */}
        {/* ZONAS DE RIESGO */}
        {/* ============================== */}

        {zonas.map(
          (zona, index) => {
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
                key={
                  zona.id_zona ||
                  index
                }
                center={[
                  latitud,
                  longitud,
                ]}
                radius={
                  obtenerRadioZona()
                }
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity:
                    obtenerOpacidadZona(),
                  weight:
                    obtenerPesoBorde(),
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
                        fontWeight: "bold",
                        marginBottom: 10,
                      }}
                    >
                      {obtenerEtiquetaRiesgo(
                        zona.nivel
                      )}
                    </div>

                    <div
                      style={{
                        marginBottom: 5,
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

        {/* ============================== */}
        {/* DELITOS INDIVIDUALES */}
        {/* ============================== */}

        {mostrarDelitos &&
          delitos.map(
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
                    fillOpacity: 0.9,
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
                      {
                        delito.fecha ??
                        "No informada"
                      }

                      <br />

                      <strong>
                        Horario:
                      </strong>{" "}
                      {
                        delito.rango_horario ??
                        "No informado"
                      }

                      <br />

                      <strong>
                        Grupo:
                      </strong>{" "}
                      {
                        delito.grupo_delito ??
                        "No informado"
                      }

                      <br />

                      <strong>
                        Lugar:
                      </strong>{" "}
                      {
                        delito.lugar ??
                        "No informado"
                      }

                      <br />

                      <strong>
                        Comuna:
                      </strong>{" "}
                      {
                        delito.comuna ??
                        "No informada"
                      }
                    </div>
                  </Popup>
                </CircleMarker>
              );
            }
          )}
      </MapContainer>

      {/* ============================== */}
      {/* LEYENDA */}
      {/* ============================== */}

      <div
        style={{
          position: "absolute",
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
          minWidth: 120,
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            marginBottom: 7,
          }}
        >
          Nivel de riesgo
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              color: "#dc2626",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ●
          </span>

          <span>Alto</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              color: "#facc15",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ●
          </span>

          <span>Medio</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              color: "#16a34a",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ●
          </span>

          <span>Bajo</span>
        </div>
      </div>
    </div>
  );
}