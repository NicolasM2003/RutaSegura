import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
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

  /*
   * Carga zonas y delitos una sola vez.
   */
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
                    )}`
                  )
              )
            );

          const respuestaDelitos =
            await fetch(
              "http://localhost:3000/api/delitos"
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
  }, []);

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
    </div>
  );
}