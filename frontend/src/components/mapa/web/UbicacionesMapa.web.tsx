import { useState } from "react";
import type { CSSProperties } from "react";
import type {
  DestinoRuta,
  ResultadoDireccion,
} from "../direccion";
import {
  RANGOS_HORARIOS,
  esRangoHorarioValido,
} from "./ControlesMapa.web";

type Punto =
  | {
      latitud: number;
      longitud: number;
    }
  | null;

type Props = {
  origen: Punto;
  destino: Punto;
  modo: DestinoRuta | null;

  comuna: string;
  rangoHorario: string;

  alElegirModo: (modo: DestinoRuta) => void;
  alReiniciar: () => void;
  alUsarMiUbicacion: () => void;

  alCambiarComuna: (comuna: string) => void;
  alCambiarHorario: (horario: string) => void;

  buscandoUbicacion: boolean;
  estadoUbicacion: string | null;

  buscarDireccion: (
    consulta: string,
    destino: DestinoRuta
  ) => Promise<ResultadoDireccion[]>;

  seleccionarDireccion: (
    destino: DestinoRuta,
    resultado: ResultadoDireccion
  ) => void;
};

const botonBase: CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #d1d5db",
  borderRadius: 9,
  padding: "9px 12px",
  cursor: "pointer",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 700,
  fontSize: 12,
  boxSizing: "border-box",
};

const etiqueta: CSSProperties = {
  display: "block",
  marginBottom: 5,
  color: "#374151",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

export default function UbicacionesMapaWeb(
  props: Props
) {
  const [destinoBusqueda, setDestinoBusqueda] =
    useState<DestinoRuta>("origen");

  const [consulta, setConsulta] =
    useState("");

  const [resultados, setResultados] =
    useState<ResultadoDireccion[]>([]);

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const ejecutarBusqueda = async () => {
    const texto = consulta.trim();

    if (texto.length < 3) return;

    setCargando(true);
    setError(null);
    setResultados([]);

    try {
      const encontrados =
        await props.buscarDireccion(
          texto,
          destinoBusqueda
        );

      setResultados(encontrados);

      if (!encontrados.length) {
        setError(
          "No se encontraron direcciones cercanas."
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible buscar la dirección."
      );
    } finally {
      setCargando(false);
    }
  };

  const estado =
    props.estadoUbicacion ??
    (props.destino
      ? "Origen y destino seleccionados."
      : props.origen
        ? "Origen seleccionado. Elige el destino."
        : "Selecciona un origen para comenzar.");

  return (
    <section
      aria-label="Planificar ruta"
      style={{
        position: "absolute",
        zIndex: 12000,
        top: 16,
        left: 16,
        width: 360,
        maxWidth: "calc(100% - 32px)",
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: 16,
        borderRadius: 14,
        background: "rgba(255,255,255,0.97)",
        border: "1px solid #e5e7eb",
        boxShadow:
          "0 8px 24px rgba(0,0,0,0.18)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* CABECERA */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            Planificar ruta
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#6b7280",
              fontSize: 11,
            }}
          >
            Define el origen y destino
          </div>
        </div>

        {(props.origen || props.destino) && (
          <button
            type="button"
            onClick={props.alReiniciar}
            style={{
              border: 0,
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 8,
              padding: "7px 9px",
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* CONFIGURACIÓN */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <label style={etiqueta}>
            Comuna
          </label>

          <select
            value={props.comuna}
            onChange={(event) =>
              props.alCambiarComuna(
                event.target.value
              )
            }
            style={{
              width: "100%",
              minHeight: 40,
              border:
                "1px solid #d1d5db",
              borderRadius: 9,
              padding:
                "8px 9px",
              background:
                "#ffffff",
              color:
                "#111827",
              fontSize: 12,
              fontWeight: 700,
              outline:
                "none",
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

        <div>
          <label style={etiqueta}>
            Horario
          </label>

          <select
            value={props.rangoHorario}
            onChange={(event) => {
              const valor =
                event.target.value;

              if (
                esRangoHorarioValido(
                  valor
                )
              ) {
                props.alCambiarHorario(
                  valor
                );
              }
            }}
            style={{
              width: "100%",
              minHeight: 40,
              border:
                "1px solid #d1d5db",
              borderRadius: 9,
              padding:
                "8px 9px",
              background:
                "#ffffff",
              color:
                "#111827",
              fontSize: 12,
              fontWeight: 700,
              outline:
                "none",
            }}
          >
            {RANGOS_HORARIOS.map(
              (rango) => (
                <option
                  key={rango}
                  value={rango}
                >
                  {rango}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* ORIGEN / DESTINO */}
      <div
        style={{
          borderTop:
            "1px solid #e5e7eb",
          paddingTop: 12,
        }}
      >
        <label style={etiqueta}>
          Puntos de la ruta
        </label>

        <div
          style={{
            display: "grid",
            gap: 7,
          }}
        >
          <button
            type="button"
            onClick={() =>
              props.alElegirModo(
                "origen"
              )
            }
            style={{
              ...botonBase,
              background:
                props.modo ===
                "origen"
                  ? "#2563eb"
                  : "#ffffff",
              color:
                props.modo ===
                "origen"
                  ? "#ffffff"
                  : "#111827",
              borderColor:
                props.modo ===
                "origen"
                  ? "#2563eb"
                  : "#d1d5db",
            }}
          >
            {" "}
            {props.origen
              ? "Cambiar origen"
              : "Elegir origen en el mapa"}
          </button>

          <button
            type="button"
            onClick={() =>
              props.alElegirModo(
                "destino"
              )
            }
            style={{
              ...botonBase,
              background:
                props.modo ===
                "destino"
                  ? "#dc2626"
                  : "#ffffff",
              color:
                props.modo ===
                "destino"
                  ? "#ffffff"
                  : "#111827",
              borderColor:
                props.modo ===
                "destino"
                  ? "#dc2626"
                  : "#d1d5db",
            }}
          >
            {" "}
            {props.destino
              ? "Cambiar destino"
              : "Elegir destino en el mapa"}
          </button>

          <button
            type="button"
            disabled={
              props.buscandoUbicacion
            }
            onClick={
              props.alUsarMiUbicacion
            }
            style={{
              ...botonBase,
              background:
                "#f0fdf4",
              borderColor:
                "#bbf7d0",
              color:
                "#166534",
              opacity:
                props.buscandoUbicacion
                  ? 0.7
                  : 1,
            }}
          >
            {props.buscandoUbicacion
              ? "Obteniendo ubicación..."
              : "Usar mi ubicación como origen"}
          </button>
        </div>
      </div>

      {/* BÚSQUEDA */}
      <div
        style={{
          borderTop:
            "1px solid #e5e7eb",
          marginTop: 12,
          paddingTop: 12,
        }}
      >
        <label style={etiqueta}>
          Buscar dirección
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "90px 1fr 72px",
            gap: 6,
          }}
        >
          <select
            aria-label="Buscar dirección para"
            value={destinoBusqueda}
            onChange={(event) =>
              setDestinoBusqueda(
                event.target.value as DestinoRuta
              )
            }
            style={{
              width: "100%",
              minHeight: 40,
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              padding:
                "8px 7px",
              background:
                "#ffffff",
              color:
                "#111827",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <option value="origen">
              Origen
            </option>

            <option value="destino">
              Destino
            </option>
          </select>

          <input
            aria-label="Dirección"
            value={consulta}
            onChange={(event) =>
              setConsulta(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                void ejecutarBusqueda();
              }
            }}
            placeholder="Dirección, número y comuna"
            style={{
              width: "100%",
              minWidth: 0,
              minHeight: 40,
              boxSizing: "border-box",
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              padding:
                "8px 9px",
              outline: "none",
              fontSize: 11,
              color: "#111827",
            }}
          />

          <button
            type="button"
            disabled={
              cargando ||
              consulta.trim()
                .length < 3
            }
            onClick={() =>
              void ejecutarBusqueda()
            }
            style={{
              minHeight: 40,
              border:
                "1px solid #2563eb",
              borderRadius: 8,
              background:
                cargando ||
                consulta.trim()
                  .length < 3
                  ? "#bfdbfe"
                  : "#2563eb",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 800,
              cursor:
                cargando ||
                consulta.trim()
                  .length < 3
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {cargando
              ? "..."
              : "Buscar"}
          </button>
        </div>
      </div>

      {/* RESULTADOS */}
      {error && (
        <div
          role="status"
          style={{
            marginTop: 9,
            padding: 8,
            borderRadius: 8,
            background:
              "#fef2f2",
            border:
              "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}

      {resultados.length > 0 && (
        <div
          role="list"
          style={{
            marginTop: 8,
            maxHeight: 150,
            overflowY: "auto",
            border:
              "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          {resultados.map(
            (
              resultado,
              index
            ) => (
              <button
                key={`${resultado.latitud}-${resultado.longitud}-${index}`}
                type="button"
                role="listitem"
                onClick={() => {
                  props.seleccionarDireccion(
                    destinoBusqueda,
                    resultado
                  );
                  setResultados(
                    []
                  );
                }}
                style={{
                  display:
                    "block",
                  width:
                    "100%",
                  textAlign:
                    "left",
                  border: 0,
                  borderBottom:
                    index <
                    resultados.length -
                      1
                      ? "1px solid #e5e7eb"
                      : "none",
                  background:
                    "#ffffff",
                  padding:
                    "9px 10px",
                  cursor:
                    "pointer",
                  color:
                    "#111827",
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {
                    resultado.etiqueta
                  }
                </div>

                {resultado.distanciaMetros !==
                  undefined && (
                  <div
                    style={{
                      marginTop: 3,
                      color:
                        "#6b7280",
                      fontSize: 10,
                    }}
                  >
                    {(
                      resultado.distanciaMetros /
                      1000
                    ).toFixed(1)}{" "}
                    km del punto
                    de referencia
                  </div>
                )}
              </button>
            )
          )}
        </div>
      )}

      {/* ESTADO */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 9,
          borderTop:
            "1px solid #f3f4f6",
        }}
      >
        <div
          aria-live="polite"
          style={{
            color: "#374151",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {estado}
        </div>

        <div
          style={{
            color: "#9ca3af",
            fontSize: 9,
            marginTop: 5,
          }}
        >
          © OpenStreetMap contributors
        </div>
      </div>
    </section>
  );
}