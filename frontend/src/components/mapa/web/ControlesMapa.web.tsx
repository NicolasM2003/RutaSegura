import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

type CentroComuna = {
  latitud: number;
  longitud: number;
  zoom: number;
};

export const CENTROS_COMUNAS: Record<string, CentroComuna> = {
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
  setZoom: (zoom: number) => void;
}) {
  useMapEvents({
    zoomend: (event: any) => {
      setZoom(event.target.getZoom());
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
  const ultimaComuna = useRef<string | null>(null);

  useEffect(() => {
    if (ultimaComuna.current === comuna) return;

    const centro = CENTROS_COMUNAS[comuna];

    if (!centro) return;

    ultimaComuna.current = comuna;

    map.flyTo([centro.latitud, centro.longitud], centro.zoom, {
      duration: 0.8,
    });
  }, [comuna, map]);

  return null;
}

const estiloBoton = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

export function ControlesMapa() {
  const map = useMap();

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10000,
        right: 16,
        bottom: 90,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid #d1d5db",
        boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
      }}
    >
      <button
        type="button"
        aria-label="Acercar mapa"
        onClick={() => map.zoomIn()}
        style={{
          ...estiloBoton,
          width: 42,
          height: 42,
          border: "none",
          borderBottom: "1px solid #e5e7eb",
          borderRadius: 0,
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        +
      </button>

      <button
        type="button"
        aria-label="Alejar mapa"
        onClick={() => map.zoomOut()}
        style={{
          ...estiloBoton,
          width: 42,
          height: 42,
          border: "none",
          borderRadius: 0,
          fontSize: 22,
          lineHeight: 1,
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
  onChange: (comuna: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10000,
        top: 16,
        left: 16,
        width: 145,
        padding: "9px 11px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.97)",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#6b7280",
          marginBottom: 5,
          letterSpacing: 0.5,
        }}
      >
        COMUNA
      </div>

      <select
        value={comuna}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          border: "1px solid #d1d5db",
          borderRadius: 7,
          padding: "7px 8px",
          background: "#ffffff",
          color: "#111827",
          fontSize: 12,
          fontWeight: 700,
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="Viña del Mar">Viña del Mar</option>
        <option value="Valparaíso">Valparaíso</option>
        <option value="Concón">Concón</option>
      </select>
    </div>
  );
}

export function SelectorHorario({
  rangoHorario,
  onChange,
}: {
  rangoHorario: string;
  onChange: (rangoHorario: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10000,
        top: 16,
        left: 172,
        width: 145,
        padding: "9px 11px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.97)",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#6b7280",
          marginBottom: 5,
          letterSpacing: 0.5,
        }}
      >
        HORARIO
      </div>

      <select
        value={rangoHorario}
        onChange={(event) => {
          const valor = event.target.value;

          if (!esRangoHorarioValido(valor)) return;

          onChange(valor);
        }}
        style={{
          width: "100%",
          border: "1px solid #d1d5db",
          borderRadius: 7,
          padding: "7px 8px",
          background: "#ffffff",
          color: "#111827",
          fontSize: 12,
          fontWeight: 700,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {RANGOS_HORARIOS.map((rango) => (
          <option key={rango} value={rango}>
            {rango}
          </option>
        ))}
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
        position: "absolute",
        zIndex: 10000,
        top: 16,
        right: 16,
        border: "1px solid #d1d5db",
        borderRadius: 9,
        padding: "9px 13px",
        background: mostrar ? "#2563eb" : "#ffffff",
        color: mostrar ? "#ffffff" : "#111827",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
        whiteSpace: "nowrap",
      }}
    >
      {mostrar ? "Ocultar red peatonal" : "Mostrar red peatonal"}
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
        position: "absolute",
        zIndex: 10000,
        top: 16,
        right: 185,
        border: "1px solid #d1d5db",
        borderRadius: 9,
        padding: "9px 13px",
        background: mostrar ? "#111827" : "#ffffff",
        color: mostrar ? "#ffffff" : "#111827",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
        whiteSpace: "nowrap",
      }}
    >
      {mostrar ? "Ocultar delitos" : "Mostrar delitos"}
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
  if (!cargando && !error) return null;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10000,
        top: 66,
        right: 16,
        background: "rgba(255,255,255,0.97)",
        color: error ? "#b91c1c" : "#374151",
        padding: "8px 12px",
        borderRadius: 9,
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
        fontFamily: "Arial, sans-serif",
        fontSize: 12,
      }}
    >
      {cargando
        ? "Cargando red peatonal..."
        : "No se pudo cargar la red peatonal."}
    </div>
  );
}

export const RANGOS_HORARIOS = [
  "00:00 - 03:59",
  "04:00 - 07:59",
  "08:00 - 11:59",
  "12:00 - 15:59",
  "16:00 - 19:59",
  "20:00 - 23:59",
];

export const esRangoHorarioValido = (
  rangoHorario: string
): boolean => RANGOS_HORARIOS.includes(rangoHorario);