import { useState } from "react";
import type {
  DestinoRuta,
  ResultadoDireccion,
} from "../direccion";
import {
  RANGOS_HORARIOS,
  esRangoHorarioValido,
} from "./ControlesMapa.web";
import "./UbicacionesMapa.web.css"


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

export default function UbicacionesMapaWeb(props: Props) {
  const [destinoBusqueda, setDestinoBusqueda] =
    useState<DestinoRuta>("origen");
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoDireccion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se conserva el flujo de búsqueda y selección existente.
  const ejecutarBusqueda = async () => {
    const texto = consulta.trim();

    if (texto.length < 3) return;

    setCargando(true);
    setError(null);
    setResultados([]);

    try {
      const encontrados = await props.buscarDireccion(
        texto,
        destinoBusqueda
      );

      setResultados(encontrados);

      if (!encontrados.length) {
        setError("No se encontraron direcciones cercanas.");
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

  const origenActivo = props.modo === "origen";
  const destinoActivo = props.modo === "destino";
  const busquedaDeshabilitada = cargando || consulta.trim().length < 3;

  return (
    <section
      className="rs-plan-panel"
      aria-label="Planificar ruta"
    >
      <header className="rs-plan-header">
        <div className="rs-plan-brand-row">
          <span className="rs-plan-brand-mark" aria-hidden="true">
            RS
          </span>
          <span className="rs-plan-brand-name">RUTASEGURA</span>
          <span className="rs-plan-brand-tag">WEB</span>
        </div>

        <div className="rs-plan-heading-row">
          <div>
            <h2 className="rs-plan-title">Planifica tu recorrido</h2>
            <p className="rs-plan-subtitle">
              Encuentra una ruta que se adapte a ti.
            </p>
          </div>

          {(props.origen || props.destino) && (
            <button
              type="button"
              className="rs-plan-clear-button"
              onClick={props.alReiniciar}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="rs-plan-progress" aria-label="Progreso de selección">
          <div
            className={`rs-plan-progress-step ${props.origen ? "is-complete" : origenActivo ? "is-active" : ""}`}
          >
            <span className="rs-plan-progress-number">
              {props.origen ? "✓" : "1"}
            </span>
            <span>Origen</span>
          </div>
          <span className="rs-plan-progress-line" aria-hidden="true" />
          <div
            className={`rs-plan-progress-step ${props.destino ? "is-complete" : destinoActivo ? "is-active" : ""}`}
          >
            <span className="rs-plan-progress-number">
              {props.destino ? "✓" : "2"}
            </span>
            <span>Destino</span>
          </div>
        </div>
      </header>

      <section className="rs-plan-section" aria-labelledby="rs-route-points-title">
        <div className="rs-plan-section-heading">
          <div>
            <span className="rs-plan-section-kicker">01</span>
            <h3 id="rs-route-points-title">Puntos del recorrido</h3>
          </div>
          <span className="rs-plan-section-hint">Selecciona en el mapa</span>
        </div>

        <div className="rs-plan-points-card">
          <div className="rs-plan-point-row">
            <span className="rs-plan-point-marker is-origin" aria-hidden="true">
              A
            </span>
            <div className="rs-plan-point-copy">
              <span className="rs-plan-point-label">ORIGEN</span>
              <span className={`rs-plan-point-value ${props.origen ? "is-selected" : ""}`}>
                {props.origen ? "Punto seleccionado" : "¿Dónde comienzas?"}
              </span>
            </div>
            <button
              type="button"
              className={`rs-plan-point-button ${origenActivo ? "is-active" : ""}`}
              onClick={() => props.alElegirModo("origen")}
              aria-pressed={origenActivo}
            >
              {props.origen ? "Cambiar" : "Elegir"}
            </button>
          </div>

          <div className="rs-plan-point-divider" aria-hidden="true">
            <span />
          </div>

          <div className="rs-plan-point-row">
            <span className="rs-plan-point-marker is-destination" aria-hidden="true">
              B
            </span>
            <div className="rs-plan-point-copy">
              <span className="rs-plan-point-label">DESTINO</span>
              <span className={`rs-plan-point-value ${props.destino ? "is-selected" : ""}`}>
                {props.destino ? "Punto seleccionado" : "¿Hacia dónde vas?"}
              </span>
            </div>
            <button
              type="button"
              className={`rs-plan-point-button ${destinoActivo ? "is-active is-destination" : ""}`}
              onClick={() => props.alElegirModo("destino")}
              aria-pressed={destinoActivo}
            >
              {props.destino ? "Cambiar" : "Elegir"}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="rs-plan-location-button"
          disabled={props.buscandoUbicacion}
          onClick={props.alUsarMiUbicacion}
        >
          <span className="rs-plan-location-icon" aria-hidden="true">◎</span>
          <span>
            {props.buscandoUbicacion
              ? "Obteniendo tu ubicación..."
              : "Usar mi ubicación como origen"}
          </span>
          {!props.buscandoUbicacion && (
            <span className="rs-plan-location-arrow" aria-hidden="true">↗</span>
          )}
        </button>
      </section>

      <section className="rs-plan-section rs-plan-preferences" aria-labelledby="rs-preferences-title">
        <div className="rs-plan-section-heading">
          <div>
            <span className="rs-plan-section-kicker">02</span>
            <h3 id="rs-preferences-title">Preferencias del recorrido</h3>
          </div>
        </div>

        <div className="rs-plan-preferences-grid">
          <div className="rs-plan-field">
            <label className="rs-plan-field-label" htmlFor="rs-comuna-select">
              Comuna
            </label>
            <select
              id="rs-comuna-select"
              className="rs-plan-select"
              value={props.comuna}
              onChange={(event) => props.alCambiarComuna(event.target.value)}
            >
              <option value="Viña del Mar">Viña del Mar</option>
              <option value="Valparaíso">Valparaíso</option>
              <option value="Concón">Concón</option>
            </select>
          </div>

          <div className="rs-plan-field">
            <label className="rs-plan-field-label" htmlFor="rs-horario-select">
              Horario
            </label>
            <select
              id="rs-horario-select"
              className="rs-plan-select"
              value={props.rangoHorario}
              onChange={(event) => {
                const valor = event.target.value;
                if (esRangoHorarioValido(valor)) {
                  props.alCambiarHorario(valor);
                }
              }}
            >
              {RANGOS_HORARIOS.map((rango) => (
                <option key={rango} value={rango}>
                  {rango}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="rs-plan-preferences-note">
          El horario permite consultar la información de riesgo correspondiente a ese período.
        </p>
      </section>

      <section className="rs-plan-section rs-plan-search" aria-labelledby="rs-search-title">
        <div className="rs-plan-section-heading">
          <div>
            <span className="rs-plan-section-kicker">03</span>
            <h3 id="rs-search-title">Buscar una dirección</h3>
          </div>
        </div>

        <div className="rs-plan-search-target">
          <span className="rs-plan-search-target-label">Buscar para</span>
          <select
            aria-label="Buscar dirección para"
            className="rs-plan-search-select"
            value={destinoBusqueda}
            onChange={(event) =>
              setDestinoBusqueda(event.target.value as DestinoRuta)
            }
          >
            <option value="origen">Origen</option>
            <option value="destino">Destino</option>
          </select>
        </div>

        <div className="rs-plan-search-row">
          <div className="rs-plan-search-input-wrap">
            <span className="rs-plan-search-icon" aria-hidden="true">⌕</span>
            <input
              aria-label="Dirección"
              className="rs-plan-search-input"
              value={consulta}
              onChange={(event) => setConsulta(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void ejecutarBusqueda();
                }
              }}
              placeholder="Ej. Avenida Libertad 1000"
            />
          </div>

          <button
            type="button"
            className="rs-plan-search-button"
            disabled={busquedaDeshabilitada}
            onClick={() => void ejecutarBusqueda()}
          >
            {cargando ? (
              <>
                <span className="rs-plan-spinner" aria-hidden="true" />
                Buscando
              </>
            ) : (
              "Buscar"
            )}
          </button>
        </div>
        <p className="rs-plan-search-hint">
          Escribe al menos 3 caracteres. Puedes incluir número y comuna.
        </p>
      </section>

      {error && (
        <div className="rs-plan-message is-error" role="status">
          <span className="rs-plan-message-icon" aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="rs-plan-results" role="list" aria-label="Direcciones encontradas">
          <div className="rs-plan-results-heading">
            <span>Resultados encontrados</span>
            <span className="rs-plan-results-count">{resultados.length}</span>
          </div>
          {resultados.map((resultado, index) => (
            <button
              key={`${resultado.latitud}-${resultado.longitud}-${index}`}
              type="button"
              role="listitem"
              className="rs-plan-result-item"
              onClick={() => {
                props.seleccionarDireccion(destinoBusqueda, resultado);
                setResultados([]);
              }}
            >
              <span className="rs-plan-result-pin" aria-hidden="true">⌖</span>
              <span className="rs-plan-result-copy">
                <span className="rs-plan-result-name">{resultado.etiqueta}</span>
                {resultado.distanciaMetros !== undefined && (
                  <span className="rs-plan-result-distance">
                    {(resultado.distanciaMetros / 1000).toFixed(1)} km del punto de referencia
                  </span>
                )}
              </span>
              <span className="rs-plan-result-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}

      <footer className="rs-plan-footer">
        <div className="rs-plan-status" aria-live="polite" aria-atomic="true">
          <span className={`rs-plan-status-dot ${props.origen && props.destino ? "is-ready" : ""}`} />
          <span>{estado}</span>
        </div>
        <div className="rs-plan-attribution">
          <span className="rs-plan-attribution-mark" aria-hidden="true">©</span>
          OpenStreetMap contributors
        </div>
      </footer>
    </section>
  );
}
