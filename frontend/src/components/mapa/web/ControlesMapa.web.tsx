import { useEffect, useRef } from "react";
import {
  useMap,
  useMapEvents,
} from "react-leaflet";

type CentroComuna = {
  latitud: number;
  longitud: number;
  zoom: number;
};

export const CENTROS_COMUNAS: Record<
  string,
  CentroComuna
> = {
  "Viña del Mar": {
    latitud: -33.0245,
    longitud: -71.5518,
    zoom: 13,
  },

  Valparaíso: {
    latitud: -33.0472,
    longitud: -71.6127,
    zoom: 13,
  },

  Concón: {
    latitud: -32.9225,
    longitud: -71.5147,
    zoom: 13,
  },
};

export function ControlZoom({
  setZoom,
}: {
  setZoom: (
    zoom: number
  ) => void;
}) {
  useMapEvents({
    zoomend: (event: any) => {
      setZoom(
        event.target.getZoom()
      );
    },
  });

  return null;
}

export function CentrarComuna({
  comuna,
}: {
  comuna: string;
}) {
  const map = useMap();

  const ultimaComuna =
    useRef<string | null>(
      null
    );

  useEffect(() => {
    if (
      ultimaComuna.current ===
      comuna
    ) {
      return;
    }

    const centro =
      CENTROS_COMUNAS[
        comuna
      ];

    if (!centro) {
      return;
    }

    ultimaComuna.current =
      comuna;

    /*
     * Solo centramos cuando
     * cambia la comuna.
     *
     * NO usamos fitBounds().
     */
    map.flyTo(
      [
        centro.latitud,
        centro.longitud,
      ],
      centro.zoom,
      {
        duration: 0.8,
      }
    );
  }, [comuna, map]);

  return null;
}

export function ControlesMapa() {
  const map = useMap();

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10000,
        right: 15,
        bottom: 15,
        display: "flex",
        flexDirection:
          "column",
        overflow: "hidden",
        borderRadius: 8,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <button
        type="button"
        onClick={() =>
          map.zoomIn()
        }
        style={{
          width: 40,
          height: 40,
          border: "none",
          borderBottom:
            "1px solid #d1d5db",
          background:
            "#ffffff",
          color:
            "#111827",
          fontSize: 22,
          fontWeight:
            "bold",
          cursor: "pointer",
        }}
      >
        +
      </button>

      <button
        type="button"
        onClick={() =>
          map.zoomOut()
        }
        style={{
          width: 40,
          height: 40,
          border: "none",
          background:
            "#ffffff",
          color:
            "#111827",
          fontSize: 22,
          fontWeight:
            "bold",
          cursor: "pointer",
        }}
      >
        −
      </button>
    </div>
  );
}

export function SelectorComuna({
  comuna,
  onChange,
}: {
  comuna: string;
  onChange: (
    comuna: string
  ) => void;
}) {
  return (
    <div
      style={{
        position:
          "absolute",
        zIndex: 10000,
        top: 15,
        left: 15,
        background:
          "rgba(255,255,255,0.96)",
        padding:
          "9px 12px",
        borderRadius: 8,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.25)",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight:
            "bold",
          marginBottom: 5,
          color:
            "#374151",
        }}
      >
        RED PEATONAL
      </div>

      <select
        value={comuna}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          border:
            "1px solid #d1d5db",
          borderRadius: 6,
          padding:
            "7px 9px",
          background:
            "#ffffff",
          color:
            "#111827",
          fontSize: 13,
          fontWeight:
            "bold",
          cursor:
            "pointer",
          outline: "none",
        }}
      >
        <option value="Viña del Mar">
          Viña del Mar
        </option>

        <option value="Valparaíso">
          Valparaíso
        </option>

        <option value="Concón">
          Concón
        </option>
      </select>
    </div>
  );
}

export function BotonRedPeatonal({
  mostrar,
  onClick,
}: {
  mostrar: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position:
          "absolute",
        zIndex: 10000,
        top: 15,
        right: 15,
        background:
          mostrar
            ? "#2563eb"
            : "#ffffff",
        color:
          mostrar
            ? "#ffffff"
            : "#111827",
        border: "none",
        borderRadius: 8,
        padding:
          "10px 14px",
        fontWeight:
          "bold",
        fontSize: 14,
        cursor:
          "pointer",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.25)",
        whiteSpace:
          "nowrap",
      }}
    >
      {mostrar
        ? "Ocultar red peatonal"
        : "Mostrar red peatonal"}
    </button>
  );
}

export function BotonDelitos({
  mostrar,
  onClick,
}: {
  mostrar: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position:
          "absolute",
        zIndex: 10000,
        top: 15,
        right: 175,
        background:
          mostrar
            ? "#111827"
            : "#ffffff",
        color:
          mostrar
            ? "#ffffff"
            : "#111827",
        border: "none",
        borderRadius: 8,
        padding:
          "10px 14px",
        fontWeight:
          "bold",
        fontSize: 14,
        cursor:
          "pointer",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.25)",
        whiteSpace:
          "nowrap",
      }}
    >
      {mostrar
        ? "Ocultar delitos"
        : "Mostrar delitos"}
    </button>
  );
}

export function EstadoRedPeatonal({
  cargando,
  error,
}: {
  cargando: boolean;
  error: boolean;
}) {
  if (
    !cargando &&
    !error
  ) {
    return null;
  }

  return (
    <div
      style={{
        position:
          "absolute",
        zIndex: 10000,
        top: 65,
        right: 15,
        background:
          "rgba(255,255,255,0.96)",
        color:
          error
            ? "#b91c1c"
            : "#111827",
        padding:
          "8px 12px",
        borderRadius: 8,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.2)",
        fontFamily:
          "Arial, sans-serif",
        fontSize: 12,
      }}
    >
      {cargando
        ? "Cargando red peatonal..."
        : "No se pudo cargar la red peatonal."}
    </div>
  );
}