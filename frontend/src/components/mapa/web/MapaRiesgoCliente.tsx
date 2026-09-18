import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";

import {
  BotonDelitos,
  BotonRedPeatonal,
  CentrarComuna,
  ControlesMapa,
  ControlZoom,
  EstadoRedPeatonal,
  SelectorComuna,
  SelectorHorario,
} from "./ControlesMapa.web";

import {
  CapaDelitos,
  CapaRedPeatonal,
  CapaZonasRiesgo,
  LeyendaMapa,
} from "./CapasMapa.web";

/**
 * Escucha los movimientos y cambios de zoom del mapa
 * y notifica el BBOX visible.
 */
function EscuchaBbox({
  onBboxChange,
}: {
  onBboxChange: (
    bbox: string
  ) => void;
}) {
  const timeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useMapEvents({
    moveend: (evento) => {
      const bounds =
        evento.target.getBounds();

      const norte =
        bounds.getNorth();
      const sur =
        bounds.getSouth();
      const este =
        bounds.getEast();
      const oeste =
        bounds.getWest();

      const nuevoBbox =
        `${sur},${oeste},${norte},${este}`;

      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current
        );
      }

      timeoutRef.current =
        setTimeout(() => {
          onBboxChange(
            nuevoBbox
          );
        }, 400);
    },

    zoomend: (evento) => {
      const bounds =
        evento.target.getBounds();

      const norte =
        bounds.getNorth();
      const sur =
        bounds.getSouth();
      const este =
        bounds.getEast();
      const oeste =
        bounds.getWest();

      const nuevoBbox =
        `${sur},${oeste},${norte},${este}`;

      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current
        );
      }

      timeoutRef.current =
        setTimeout(() => {
          onBboxChange(
            nuevoBbox
          );
        }, 400);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current
        );
      }
    };
  }, []);

  return null;
}

export function SeleccionarPuntos({
  origen,
  destino,
  onSeleccionarOrigen,
  onSeleccionarDestino,
}: {
  origen: {
    latitud: number;
    longitud: number;
  } | null;
  destino: {
    latitud: number;
    longitud: number;
  } | null;
  onSeleccionarOrigen: (
    latitud: number,
    longitud: number
  ) => void;
  onSeleccionarDestino: (
    latitud: number,
    longitud: number
  ) => void;
}) {
  useMapEvents({
    click: (evento) => {
      const latitud = evento.latlng.lat;
      const longitud = evento.latlng.lng;

      if (!origen) {
        onSeleccionarOrigen(latitud, longitud);
        return;
      }

      if (!destino) {
        onSeleccionarDestino(latitud, longitud);
      }
    },
  });

  return null;
}

function puntosCompletos(
  origen: {
    latitud: number;
    longitud: number;
  } | null,
  destino: {
    latitud: number;
    longitud: number;
  } | null
) {
  return origen !== null && destino !== null;
}

export default function MapaRiesgoClient() {
  const [zonas, setZonas] =
    useState<any[]>([]);

  const [delitos, setDelitos] =
    useState<any[]>([]);

  const [redPeatonal, setRedPeatonal] =
    useState<any[]>([]);

  const [
    comunaRedPeatonal,
    setComunaRedPeatonal,
  ] = useState(
    "Viña del Mar"
  );

  const [
    mostrarRedPeatonal,
    setMostrarRedPeatonal,
  ] = useState(true);

  const [
    mostrarZonasRiesgo,
    setMostrarZonasRiesgo,
  ] = useState(true);

  const [
    mostrarDelitos,
    setMostrarDelitos,
  ] = useState(false);

  const [
    cargandoRedPeatonal,
    setCargandoRedPeatonal,
  ] = useState(false);

  const [
    errorRedPeatonal,
    setErrorRedPeatonal,
  ] = useState(false);

  const [
    bbox,
    setBbox,
  ] = useState<string | null>(
    null
  );

  const [zoom, setZoom] =
    useState(13);

  const [origen, setOrigen] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

  const [destino, setDestino] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

    const [ruta, setRuta] = useState<any>(null);

    const [cargandoRuta, setCargandoRuta] = useState(false);

    const [errorRuta, setErrorRuta] = useState<string | null>(null);

  const reiniciarPuntos = () => {
    setOrigen(null);
    setDestino(null);
    setRuta(null);
    setErrorRuta(null);
  };

  /*
   * Carga zonas y delitos una sola vez.
   */

  const [
  rangoHorario,
  setRangoHorario,
] = useState(
  "20:00 - 23:59"
);

  useEffect(() => {
    let cancelado = false;

    const cargarZonasYDelitos =
      async () => {
        try {
          const comunas = [
            "Viña del Mar",
            "Concón",
            "Valparaíso",
          ];

          const respuestasZonas =
            await Promise.all(
              comunas.map(
                (comuna) =>
                  fetch(
                    `http://localhost:3000/api/geografia?comuna=${encodeURIComponent(
                      comuna
                    )}&rango_horario=${encodeURIComponent(
                      rangoHorario
                    )}`
                  )
              )
            );

          const respuestaDelitos =
            await fetch(
              "http://localhost:3000/api/delitos?rango_horario=" +
                encodeURIComponent(
                  rangoHorario
                )
            );

          for (const respuesta of respuestasZonas) {
            if (!respuesta.ok) {
              throw new Error(
                `Error zonas HTTP: ${respuesta.status}`
              );
            }
          }

          if (!respuestaDelitos.ok) {
            throw new Error(
              `Error delitos HTTP: ${respuestaDelitos.status}`
            );
          }

          const resultadosZonas =
            await Promise.all(
              respuestasZonas.map(
                (respuesta) =>
                  respuesta.json()
              )
            );

          const resultadoDelitos =
            await respuestaDelitos.json();

          const zonasTodas =
            resultadosZonas.flatMap(
              (
                resultado,
                index
              ) => {
                const comuna =
                  comunas[index];

                return (
                  resultado.data || []
                ).map(
                  (zona: any) => ({
                    ...zona,
                    comuna,
                  })
                );
              }
            );

          if (cancelado) {
            return;
          }

          setZonas(zonasTodas);

          setDelitos(
            resultadoDelitos.data || []
          );
        } catch (error) {
          if (!cancelado) {
            console.error(
              "Error obteniendo zonas y delitos:",
              error
            );
          }
        }
      };

    cargarZonasYDelitos();

    return () => {
      cancelado = true;
    };
  }, [rangoHorario]);

  useEffect(() => {
    if (!origen || !destino) {
      return;
    }

    const consultarRuta = async () => {
      setCargandoRuta(true);
      setErrorRuta(null);

      try {
        const parametros = new URLSearchParams();

        parametros.set(
          "comuna",
          comunaRedPeatonal
        );

        parametros.set(
          "origen_lat",
          String(origen.latitud)
        );

        parametros.set(
          "origen_lon",
          String(origen.longitud)
        );

        parametros.set(
          "destino_lat",
          String(destino.latitud)
        );

        parametros.set(
          "destino_lon",
          String(destino.longitud)
        );

        parametros.set(
          "rango_horario",
          rangoHorario
        );

        const url =
          `http://localhost:3000/api/rutas?${parametros.toString()}`;

        console.log("Consultando ruta:", url);

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
          throw new Error(
            `Error ruta HTTP: ${respuesta.status}`
          );
        }

        const resultado = await respuesta.json();

        console.log("Resultado ruta:", resultado);

        setRuta(resultado);
      } catch (error) {
         console.error("Error consultando ruta:", error);

        setRuta(null);
        setErrorRuta("No fue posible calcular la ruta. Inténtelo nuevamente.");
      }
      finally {
        setTimeout(() => {
          setCargandoRuta(false);
        }, 1000);
      }
    };

    consultarRuta();
  }, [
    origen,
    destino,
    comunaRedPeatonal,
    rangoHorario,
  ]);

  /*
   * Carga la red peatonal según el BBOX visible.
   */
  useEffect(() => {
    if (!bbox) {
      return;
    }

    if (zoom < 12) {
      setRedPeatonal([]);
      return;
    }

    const controlador =
      new AbortController();

    const cargarRedPeatonal =
      async () => {
        try {
          setCargandoRedPeatonal(
            true
          );

          setErrorRedPeatonal(
            false
          );

          const parametros =
            new URLSearchParams();

          parametros.set(
            "comuna",
            comunaRedPeatonal
          );

          parametros.set(
            "bbox",
            bbox
          );

          const url =
            `http://localhost:3000/api/geografia/red-peatonal?${parametros.toString()}`;

          console.log(
            "Consultando red peatonal:",
            url
          );

          const respuesta =
            await fetch(url, {
              signal:
                controlador.signal,
            });

          if (!respuesta.ok) {
            throw new Error(
              `Error red peatonal HTTP: ${respuesta.status}`
            );
          }

          const resultado =
            await respuesta.json();

          if (
            controlador.signal
              .aborted
          ) {
            return;
          }

          console.log(
            `Red peatonal ${comunaRedPeatonal}:`,
            resultado.total,
            "segmentos"
          );

          setRedPeatonal(
            resultado.data || []
          );
        } catch (error: any) {
          if (
            error?.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            `Error obteniendo red peatonal de ${comunaRedPeatonal}:`,
            error
          );

          setErrorRedPeatonal(
            true
          );

          setRedPeatonal([]);
        } finally {
          if (
            !controlador.signal
              .aborted
          ) {
            setCargandoRedPeatonal(
              false
            );
          }
        }
      };

    cargarRedPeatonal();

    return () => {
      controlador.abort();
    };
  }, [
    comunaRedPeatonal,
    bbox,
    zoom,
  ]);

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
        preferCanvas={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <EscuchaBbox
          onBboxChange={
            setBbox
          }
        />

        <SeleccionarPuntos
  origen={origen}
  destino={destino}
  onSeleccionarOrigen={(latitud, longitud) =>
    setOrigen({
      latitud,
      longitud,
    })
  }
  onSeleccionarDestino={(latitud, longitud) =>
    setDestino({
      latitud,
      longitud,
    })
  }
/>

        {origen && (
          <CircleMarker
            center={[
              origen.latitud,
              origen.longitud,
            ]}
            radius={8}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.9,
            }}
          />
        )}
        {destino && (
          <CircleMarker
            center={[
              destino.latitud,
              destino.longitud,
            ]}
            radius={8}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#dc2626",
              fillOpacity: 0.9,
            }}
          />
        )}

        <ControlZoom
          setZoom={setZoom}
        />

        <ControlesMapa />

        <CentrarComuna
          comuna={
            comunaRedPeatonal
          }
        />

        {mostrarRedPeatonal &&
          zoom >= 12 && (
            <CapaRedPeatonal
              redPeatonal={
                redPeatonal
              }
              comunaRedPeatonal={
                comunaRedPeatonal
              }
            />
          )}

        {mostrarZonasRiesgo && (
          <CapaZonasRiesgo
            zonas={zonas}
            zoom={zoom}
          />
        )}

        {mostrarDelitos &&
          zoom >= 13 && (
            <CapaDelitos
              delitos={delitos}
            />
          )}
      </MapContainer>

      <SelectorComuna
        comuna={
          comunaRedPeatonal
        }
        onChange={
          setComunaRedPeatonal
        }
      />

      <SelectorHorario
        rangoHorario={
          rangoHorario
        }
        onChange={
          setRangoHorario
        }
      />

      {origen && destino && (
        <button
          type="button"
          onClick={reiniciarPuntos}
          style={{
            position: "absolute",
            zIndex: 20000,
            top: 75,
            left: 15,
            background: "#ffffff",
            color: "#111827",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: "bold",
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          Cambiar puntos
        </button>
      )}

      <BotonRedPeatonal
        mostrar={
          mostrarRedPeatonal
        }
        onClick={() =>
          setMostrarRedPeatonal(
            (actual) =>
              !actual
          )
        }
      />

      <BotonDelitos
        mostrar={
          mostrarDelitos
        }
        onClick={() =>
          setMostrarDelitos(
            (actual) =>
              !actual
          )
        }
      />

      <button
        type="button"
        onClick={() =>
          setMostrarZonasRiesgo(
            (actual) =>
              !actual
          )
        }
        style={{
          position: "absolute",
          zIndex: 10000,
          top: 115,
          right: 15,
          background:
            mostrarZonasRiesgo
              ? "#dc2626"
              : "#ffffff",
          color:
            mostrarZonasRiesgo
              ? "#ffffff"
              : "#111827",
          border: "none",
          borderRadius: 8,
          padding: "10px 14px",
          fontWeight: "bold",
          fontSize: 14,
          cursor: "pointer",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        {mostrarZonasRiesgo
          ? "Ocultar zonas de riesgo"
          : "Mostrar zonas de riesgo"}
      </button>

      <EstadoRedPeatonal
        cargando={
          cargandoRedPeatonal
        }
        error={
          errorRedPeatonal
        }
      />

      <LeyendaMapa />

      {cargandoRuta && (
        <div
          style={{
            position: "absolute",
            zIndex: 20000,
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111827",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: "bold",
            fontSize: 14,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          Calculando ruta...
        </div>
      )}

      {errorRuta && (
        <div
          style={{
            position: "absolute",
            zIndex: 20000,
            top: 135,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: "bold",
            fontSize: 14,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            border: "1px solid #fca5a5",
          }}
        >
          {errorRuta}
        </div>
      )}
    </div>
  );
}