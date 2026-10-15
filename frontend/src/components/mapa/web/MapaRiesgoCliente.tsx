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
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  BotonDelitos,
  BotonRedPeatonal,
  CentrarComuna,
  ControlesMapa,
  ControlZoom,
  EstadoRedPeatonal,
} from "./ControlesMapa.web";
import {
  CapaDelitos,
  CapaRedPeatonal,
  CapaZonasRiesgo,
  LeyendaMapa,
} from "./CapasMapa.web";
import UbicacionesMapaWeb from "./UbicacionesMapa.web";
import {
  buscarDirecciones,
  type DestinoRuta,
  type ResultadoDireccion,
} from "../direccion";

function EscuchaBbox({
  onBboxChange,
}: {
  onBboxChange: (bbox: string) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    moveend: (evento) => {
      const bounds = evento.target.getBounds();
      const norte = bounds.getNorth();
      const sur = bounds.getSouth();
      const este = bounds.getEast();
      const oeste = bounds.getWest();
      const nuevoBbox = `${sur},${oeste},${norte},${este}`;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onBboxChange(nuevoBbox);
      }, 400);
    },
    zoomend: (evento) => {
      const bounds = evento.target.getBounds();
      const norte = bounds.getNorth();
      const sur = bounds.getSouth();
      const este = bounds.getEast();
      const oeste = bounds.getWest();
      const nuevoBbox = `${sur},${oeste},${norte},${este}`;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onBboxChange(nuevoBbox);
      }, 400);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
}

export function SeleccionarPuntos({
  modo,
  onSeleccionarPunto,
}: {
  modo: DestinoRuta | null;
  onSeleccionarPunto: (
    tipo: DestinoRuta,
    latitud: number,
    longitud: number,
  ) => void;
}) {
  useMapEvents({
    click: (evento) => {
      if (!modo) return;
      onSeleccionarPunto(modo, evento.latlng.lat, evento.latlng.lng);
    },
  });

  return null;
}

function CentrarPunto({
  punto,
}: {
  punto: { latitud: number; longitud: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (punto) {
      map.flyTo(
        [punto.latitud, punto.longitud],
        Math.max(map.getZoom(), 15),
        { duration: 0.6 },
      );
    }
  }, [map, punto]);

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
  } | null,
) {
  return origen !== null && destino !== null;
}

export function normalizarGeometriaRuta(
  geometria: unknown,
): [number, number][] {
  if (!Array.isArray(geometria)) {
    return [];
  }

  return geometria
    .filter(
      (punto): punto is [unknown, unknown] =>
        Array.isArray(punto) && punto.length >= 2,
    )
    .map(
      (punto) =>
        [Number(punto[0]), Number(punto[1])] as [number, number],
    )
    .filter(
      ([latitud, longitud]) =>
        Number.isFinite(latitud) && Number.isFinite(longitud),
    );
}

function AjustarVistaRutas({
  ruta,
  origen,
  destino,
}: {
  ruta: any;
  origen: { latitud: number; longitud: number } | null;
  destino: { latitud: number; longitud: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (
      !ruta?.encontrada ||
      !Array.isArray(ruta.rutas) ||
      ruta.rutas.length === 0 ||
      !origen ||
      !destino
    ) {
      return;
    }

    const coordenadas: [number, number][] = [
      [origen.latitud, origen.longitud],
      [destino.latitud, destino.longitud],
    ];

    for (const alternativa of ruta.rutas) {
      coordenadas.push(
        ...normalizarGeometriaRuta(
          alternativa.geometria,
        ),
      );
    }

    const puntosValidos = coordenadas.filter(
      ([latitud, longitud]) =>
        Number.isFinite(latitud) &&
        Number.isFinite(longitud) &&
        latitud >= -90 &&
        latitud <= 90 &&
        longitud >= -180 &&
        longitud <= 180,
    );

    if (puntosValidos.length < 2) {
      return;
    }

    const latitudes = puntosValidos.map(
      ([latitud]) => latitud,
    );

    const longitudes = puntosValidos.map(
      ([, longitud]) => longitud,
    );

    const limites = [
      [
        Math.min(...latitudes),
        Math.min(...longitudes),
      ],
      [
        Math.max(...latitudes),
        Math.max(...longitudes),
      ],
    ] as [[number, number], [number, number]];

    map.fitBounds(limites, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true,
      duration: 0.6,
    });
  }, [map, ruta, origen, destino]);

  return null;
}

export function formatearDistancia(metros: number) {
  if (metros >= 1000) {
    return `${(metros / 1000).toFixed(2)} km`;
  }

  return `${metros.toFixed(2)} m`;
}

export default function MapaRiesgoClient() {
  const [zonas, setZonas] = useState<any[]>([]);
  const [delitos, setDelitos] = useState<any[]>([]);
  const [redPeatonal, setRedPeatonal] = useState<any[]>([]);
  const [comunaRedPeatonal, setComunaRedPeatonal] =
    useState("Viña del Mar");
  const [mostrarRedPeatonal, setMostrarRedPeatonal] = useState(false);
  const [mostrarZonasRiesgo, setMostrarZonasRiesgo] = useState(true);
  const [mostrarDelitos, setMostrarDelitos] = useState(false);
  const [cargandoRedPeatonal, setCargandoRedPeatonal] = useState(false);
  const [errorRedPeatonal, setErrorRedPeatonal] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);
  const [zoom, setZoom] = useState(13);

  const [origen, setOrigen] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

  const [destino, setDestino] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

  const [modoSeleccion, setModoSeleccion] =
    useState<DestinoRuta | null>("origen");

  const [ubicacionActual, setUbicacionActual] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

  const [puntoParaCentrar, setPuntoParaCentrar] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [estadoUbicacion, setEstadoUbicacion] = useState<string | null>(null);
  const [ruta, setRuta] = useState<any>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);

  const rutaAbortRef = useRef<AbortController | null>(null);
  const rutaIdRef = useRef(0);

  const cancelarRutaPendiente = () => {
    rutaIdRef.current += 1;
    rutaAbortRef.current?.abort();
    rutaAbortRef.current = null;
    setCargandoRuta(false);
  };

  const rutasAlternativas = Array.isArray(ruta?.rutas)
    ? ruta.rutas.map((alternativa: any) => ({
        ...alternativa,
        geometria: normalizarGeometriaRuta(alternativa.geometria),
      }))
    : [];

  const rutasParaDibujar = rutaSeleccionada
    ? rutasAlternativas.filter(
        (alternativa: any) =>
          alternativa.perfil_ruta === rutaSeleccionada,
      )
    : rutasAlternativas;

  const reiniciarPuntos = () => {
    cancelarRutaPendiente();
    setOrigen(null);
    setDestino(null);
    setRuta(null);
    setRutaSeleccionada(null);
    setErrorRuta(null);
    setModoSeleccion("origen");
  };

  const seleccionarPunto = (
    tipo: DestinoRuta,
    latitud: number,
    longitud: number,
    centrarEnMapa = false,
  ): boolean => {
    const punto = { latitud, longitud };

    if (tipo === "origen") {
      setOrigen(punto);
      setDestino(null);
      setModoSeleccion("destino");
    } else {
      if (!origen) {
        setEstadoUbicacion("Primero establece un origen.");
        setModoSeleccion("origen");
        return false;
      }

      setDestino(punto);
      setModoSeleccion(null);
    }

    cancelarRutaPendiente();
    setPuntoParaCentrar(centrarEnMapa ? punto : null);
    setRuta(null);
    setRutaSeleccionada(null);
    setErrorRuta(null);
    setEstadoUbicacion(null);

    return true;
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setEstadoUbicacion(
        "Este navegador no ofrece geolocalización. Puedes seleccionar el punto en el mapa o buscar una dirección.",
      );
      return;
    }

    setBuscandoUbicacion(true);
    setEstadoUbicacion(null);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const punto = {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        };

        setUbicacionActual(punto);
        seleccionarPunto("origen", punto.latitud, punto.longitud, true,);
        setEstadoUbicacion("Ubicación actual establecida como origen.");
        setBuscandoUbicacion(false);
      },
      (reason) => {
        setEstadoUbicacion(
          reason.code === reason.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Puedes elegir un punto en el mapa o buscar una dirección."
            : "No se pudo obtener la ubicación. Puedes elegir un punto en el mapa o buscar una dirección.",
        );
        setBuscandoUbicacion(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
  };

  const buscarDireccion = (consulta: string, tipo: DestinoRuta) => {
    if (tipo === "destino" && !origen) {
      throw new Error(
        "Establece primero un origen para buscar destinos cercanos.",
      );
    }

    const limites = bbox?.split(",").map(Number);

    const centroMapa =
      limites?.length === 4 && limites.every(Number.isFinite)
        ? {
            latitud: (limites[0] + limites[2]) / 2,
            longitud: (limites[1] + limites[3]) / 2,
          }
        : { latitud: -33.0245, longitud: -71.5518 };

    const referencia =
      tipo === "destino" && origen
        ? origen
        : origen ?? ubicacionActual ?? centroMapa;

    return buscarDirecciones("http://localhost:3000", consulta, referencia);
  };

  const seleccionarDireccion = (
    tipo: DestinoRuta,
    resultado: ResultadoDireccion,
  ) => {
    if (seleccionarPunto(tipo, resultado.latitud, resultado.longitud)) {
      setEstadoUbicacion(
        `${tipo === "origen" ? "Origen" : "Destino"} establecido desde la dirección seleccionada.`,
      );
    }
  };

  const [rangoHorario, setRangoHorario] = useState("20:00 - 23:59");

  useEffect(() => {
    let cancelado = false;

    const cargarZonasYDelitos = async () => {
      try {
        const comunas = ["Viña del Mar", "Concón", "Valparaíso"];

        const respuestasZonas = await Promise.all(
          comunas.map((comuna) =>
            fetch(
              `http://localhost:3000/api/geografia?comuna=${encodeURIComponent(
                comuna,
              )}&rango_horario=${encodeURIComponent(rangoHorario)}`,
            ),
          ),
        );

        const respuestaDelitos = await fetch(
          "http://localhost:3000/api/delitos?rango_horario=" +
            encodeURIComponent(rangoHorario),
        );

        for (const respuesta of respuestasZonas) {
          if (!respuesta.ok) {
            throw new Error(`Error zonas HTTP: ${respuesta.status}`);
          }
        }

        if (!respuestaDelitos.ok) {
          throw new Error(`Error delitos HTTP: ${respuestaDelitos.status}`);
        }

        const resultadosZonas = await Promise.all(
          respuestasZonas.map((respuesta) => respuesta.json()),
        );

        const resultadoDelitos = await respuestaDelitos.json();

        const zonasTodas = resultadosZonas.flatMap(
          (resultado, index) => {
            const comuna = comunas[index];

            return (resultado.data || []).map((zona: any) => ({
              ...zona,
              comuna,
            }));
          },
        );

        if (cancelado) {
          return;
        }

        setZonas(zonasTodas);
        setDelitos(resultadoDelitos.data || []);
      } catch (error) {
        if (!cancelado) {
          console.error("Error obteniendo zonas y delitos:", error);
        }
      }
    };

    void cargarZonasYDelitos();

    return () => {
      cancelado = true;
    };
  }, [rangoHorario]);

  useEffect(() => {
    const id = ++rutaIdRef.current;
    rutaAbortRef.current?.abort();
    rutaAbortRef.current = null;

    if (!origen || !destino) {
      setRuta(null);
      setRutaSeleccionada(null);
      setErrorRuta(null);
      setCargandoRuta(false);
      return;
    }

    const controlador = new AbortController();
    rutaAbortRef.current = controlador;
    setRuta(null);
    setRutaSeleccionada(null);

    const consultarRuta = async () => {
      setCargandoRuta(true);
      setErrorRuta(null);

      try {
        const parametros = new URLSearchParams();

        parametros.set("comuna", comunaRedPeatonal);
        parametros.set("origen_lat", String(origen.latitud));
        parametros.set("origen_lon", String(origen.longitud));
        parametros.set("destino_lat", String(destino.latitud));
        parametros.set("destino_lon", String(destino.longitud));
        parametros.set("rango_horario", rangoHorario);

        const url =
          `http://localhost:3000/api/rutas/alternativas?${parametros.toString()}`;

        console.log("Consultando ruta:", url);

        const respuesta = await fetch(url, {
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error(`Error ruta HTTP: ${respuesta.status}`);
        }

        const resultado = await respuesta.json();

        console.log("Resultado rutas alternativas:", resultado);

        if (controlador.signal.aborted || id !== rutaIdRef.current) return;

        setRuta(resultado);

        if (resultado.encontrada === false) {
          setErrorRuta(
            resultado.mensaje ??
              "No se encontraron rutas para los puntos seleccionados.",
          );
        }
      } catch (error) {
        if (controlador.signal.aborted || id !== rutaIdRef.current) return;

        console.error("Error consultando ruta:", error);
        setRuta(null);
        setRutaSeleccionada(null);
        setErrorRuta(
          "No fue posible calcular la ruta. Inténtelo nuevamente.",
        );
      } finally {
        if (id === rutaIdRef.current) {
          setCargandoRuta(false);
        }
      }
    };

    void consultarRuta();

    return () => {
      controlador.abort();

      if (rutaAbortRef.current === controlador) {
        rutaAbortRef.current = null;
      }
    };
  }, [
    origen,
    destino,
    comunaRedPeatonal,
    rangoHorario,
  ]);

  useEffect(() => {
    if (!mostrarRedPeatonal) {
    setRedPeatonal([]);
    setCargandoRedPeatonal(false);
    setErrorRedPeatonal(false);
    return;
  }

    if (!bbox) {
      return;
    }

    if (zoom < 12) {
      setRedPeatonal([]);
      return;
    }

    const controlador = new AbortController();

    const cargarRedPeatonal = async () => {
      try {
        setCargandoRedPeatonal(true);
        setErrorRedPeatonal(false);

        const parametros = new URLSearchParams();

        parametros.set("comuna", comunaRedPeatonal);
        parametros.set("bbox", bbox);

        const url =
          `http://localhost:3000/api/geografia/red-peatonal?${parametros.toString()}`;

        console.log("Consultando red peatonal:", url);

        const respuesta = await fetch(url, {
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error(`Error red peatonal HTTP: ${respuesta.status}`);
        }

        const resultado = await respuesta.json();

        if (controlador.signal.aborted) {
          return;
        }

        console.log(
          `Red peatonal ${comunaRedPeatonal}:`,
          resultado.total,
          "segmentos",
        );

        setRedPeatonal(resultado.data || []);
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error(
          `Error obteniendo red peatonal de ${comunaRedPeatonal}:`,
          error,
        );

        setErrorRedPeatonal(true);
        setRedPeatonal([]);
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoRedPeatonal(false);
        }
      }
    };

    void cargarRedPeatonal();

    return () => {
      controlador.abort();
    };
  }, [mostrarRedPeatonal, comunaRedPeatonal, bbox, zoom]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
      }}
    >
      <MapContainer
        center={[-33.0245, -71.5518]}
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

        <EscuchaBbox onBboxChange={setBbox} />

        <SeleccionarPuntos
          modo={modoSeleccion}
          onSeleccionarPunto={seleccionarPunto}
        />

        <CentrarPunto punto={puntoParaCentrar} />

        <AjustarVistaRutas
          ruta={ruta}
          origen={origen}
          destino={destino}
        />

        {ubicacionActual && (
          <CircleMarker
            center={[ubicacionActual.latitud, ubicacionActual.longitud]}
            radius={6}
            pathOptions={{
              color: "#0f766e",
              fillColor: "#14b8a6",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top">Mi ubicación</Tooltip>
          </CircleMarker>
        )}

        {origen && (
          <CircleMarker
            center={[origen.latitud, origen.longitud]}
            radius={8}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              Origen
            </Tooltip>
          </CircleMarker>
        )}

        {destino && (
          <CircleMarker
            center={[destino.latitud, destino.longitud]}
            radius={8}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#dc2626",
              fillOpacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              Destino
            </Tooltip>
          </CircleMarker>
        )}

        {[...rutasParaDibujar].reverse().map((alternativa: any) => {
          const geometria = alternativa.geometria as [number, number][];

          if (geometria.length < 2) {
            return null;
          }

          const colorRuta =
            alternativa.perfil_ruta === "menor_riesgo"
              ? "#16a34a"
              : alternativa.perfil_ruta === "equilibrada"
                ? "#2563eb"
                : alternativa.perfil_ruta === "mas_rapida"
                  ? "#ea580c"
                  : "#64748b";

          return (
            <Polyline
              key={alternativa.perfil_ruta}
              positions={geometria}
              pathOptions={{
                color: colorRuta,
                weight: 5,
                opacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div
                  style={{
                    textAlign: "center",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <strong>{alternativa.nombre_perfil_ruta}</strong>

                  <div>
                    Distancia:{" "}
                    {formatearDistancia(
                      Number(alternativa.distancia_metros),
                    )}
                  </div>

                  <div>
                    Tiempo:{" "}
                    {Number(
                      alternativa.tiempo_estimado_minutos,
                    ).toFixed(1)}{" "}
                    min
                  </div>

                  <div>Riesgo: {alternativa.nivel_riesgo}</div>

                  <div>
                    Puntaje:{" "}
                    {Number(alternativa.puntaje_riesgo).toFixed(2)}
                  </div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        <ControlZoom setZoom={setZoom} />
        <ControlesMapa />
        <CentrarComuna comuna={comunaRedPeatonal} />

        {mostrarRedPeatonal && zoom >= 12 && (
          <CapaRedPeatonal
            redPeatonal={redPeatonal}
            comunaRedPeatonal={comunaRedPeatonal}
          />
        )}

        {mostrarZonasRiesgo && (
          <CapaZonasRiesgo zonas={zonas} zoom={zoom} />
        )}

        {mostrarDelitos && zoom >= 13 && (
          <CapaDelitos delitos={delitos} />
        )}
      </MapContainer>

      <UbicacionesMapaWeb
        origen={origen}
        destino={destino}
        modo={modoSeleccion}
        comuna={comunaRedPeatonal}
        rangoHorario={rangoHorario}
        alElegirModo={(modo) => {
          if (modo === "destino" && !origen) {
            setEstadoUbicacion("Primero establece un origen.");
            setModoSeleccion("origen");
            return;
          }

          setEstadoUbicacion(null);
          setModoSeleccion(modo);
        }}
        alReiniciar={reiniciarPuntos}
        alUsarMiUbicacion={usarMiUbicacion}
        alCambiarComuna={setComunaRedPeatonal}
        alCambiarHorario={setRangoHorario}
        buscandoUbicacion={buscandoUbicacion}
        estadoUbicacion={estadoUbicacion}
        buscarDireccion={buscarDireccion}
        seleccionarDireccion={seleccionarDireccion}
      />

      <BotonRedPeatonal
        mostrar={mostrarRedPeatonal}
        onClick={() =>
          setMostrarRedPeatonal((actual) => !actual)
        }
      />

      <BotonDelitos
        mostrar={mostrarDelitos}
        onClick={() =>
          setMostrarDelitos((actual) => !actual)
        }
      />

      <button
        type="button"
        onClick={() =>
          setMostrarZonasRiesgo((actual) => !actual)
        }
        style={{
          position: "absolute",
          zIndex: 10000,
          top: 115,
          right: 15,
          background: mostrarZonasRiesgo ? "#dc2626" : "#ffffff",
          color: mostrarZonasRiesgo ? "#ffffff" : "#111827",
          border: "none",
          borderRadius: 8,
          padding: "10px 14px",
          fontWeight: "bold",
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        {mostrarZonasRiesgo
          ? "Ocultar zonas de riesgo"
          : "Mostrar zonas de riesgo"}
      </button>

      <EstadoRedPeatonal
        cargando={cargandoRedPeatonal}
        error={errorRedPeatonal}
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
          Calculando rutas y preparando la recomendación de IA...
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

      {ruta?.encontrada && rutasAlternativas.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 20000,
            bottom: 20,
            right: 20,
            width: 370,
            maxWidth: "calc(100% - 32px)",
            maxHeight: "70%",
            overflowY: "auto",
            background: "rgba(255,255,255,0.98)",
            padding: 14,
            borderRadius: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontFamily: "Arial, sans-serif",
            color: "#1f2937",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            Alternativas de ruta
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#4b5563",
              marginBottom: 12,
            }}
          >
            La IA compara las alternativas calculadas por RutaSegura.
            Puedes seleccionar una ruta para destacarla en el mapa.
          </div>

          {ruta.mensaje && (
            <div
              role="status"
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              {ruta.mensaje}
            </div>
          )}

          {/* Recomendación general de la IA */}
          {ruta.interpretacion_ia?.disponible === true && (
            <section
              aria-live="polite"
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: "#166534",
                  marginBottom: 8,
                }}
              >
                Recomendación de RutaSegura
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: "bold",
                  marginBottom: 6,
                }}
              >
                {rutasAlternativas.find(
                  (alternativa: any) =>
                    alternativa.perfil_ruta ===
                    ruta.interpretacion_ia.recomendacion?.perfil_ruta,
                )?.nombre_perfil_ruta ?? "Ruta recomendada"}
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                {ruta.interpretacion_ia.recomendacion?.motivo}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#374151",
                  lineHeight: 1.5,
                  borderTop: "1px solid #bbf7d0",
                  paddingTop: 8,
                }}
              >
                {ruta.interpretacion_ia.resumen_general}
              </div>

              {Array.isArray(
                ruta.interpretacion_ia.consideraciones,
              ) &&
                ruta.interpretacion_ia.consideraciones.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      Consideraciones
                    </div>

                    {ruta.interpretacion_ia.consideraciones.map(
                      (consideracion: string, indice: number) => (
                        <div
                          key={`${indice}-${consideracion}`}
                          style={{
                            fontSize: 12,
                            lineHeight: 1.5,
                            marginBottom: 4,
                          }}
                        >
                          • {consideracion}
                        </div>
                      ),
                    )}
                  </div>
                )}

              <div
                style={{
                  fontSize: 11,
                  color: "#166534",
                  marginTop: 10,
                }}
              >
                Recomendación basada en las métricas disponibles.
                No garantiza seguridad absoluta.
              </div>
            </section>
          )}

          {/* La IA puede fallar sin ocultar las rutas */}
          {ruta.interpretacion_ia?.disponible === false && (
            <div
              role="status"
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                borderRadius: 6,
                padding: 10,
                marginBottom: 12,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {ruta.interpretacion_ia.mensaje ??
                "No fue posible generar la recomendación automática. Las rutas siguen disponibles."}
            </div>
          )}

          {/* Todas las alternativas siguen visibles */}
          {rutasAlternativas.map((alternativa: any) => {
            const color =
              alternativa.perfil_ruta === "menor_riesgo"
                ? "#16a34a"
                : alternativa.perfil_ruta === "equilibrada"
                  ? "#2563eb"
                  : "#ea580c";

            const seleccionada =
              rutaSeleccionada === alternativa.perfil_ruta;

            const interpretacionDisponible =
              ruta.interpretacion_ia?.disponible === true;

            const recomendada =
              interpretacionDisponible &&
              ruta.interpretacion_ia.recomendacion?.perfil_ruta ===
                alternativa.perfil_ruta;

            const explicacion = interpretacionDisponible
              ? ruta.interpretacion_ia.comparaciones?.find(
                  (comparacion: any) =>
                    comparacion.perfil_ruta === alternativa.perfil_ruta,
                )?.explicacion
              : null;

            return (
              <button
                type="button"
                key={alternativa.perfil_ruta}
                aria-pressed={seleccionada}
                onClick={() =>
                  setRutaSeleccionada((actual) =>
                    actual === alternativa.perfil_ruta
                      ? null
                      : alternativa.perfil_ruta,
                  )
                }
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#1f2937",
                  borderLeft: `4px solid ${color}`,
                  borderTop: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                  borderBottom: "1px solid #e5e7eb",
                  borderRadius: 6,
                  padding: "10px",
                  marginBottom: 9,
                  background: seleccionada ? "#f0fdf4" : "#ffffff",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                    fontWeight: "bold",
                    fontSize: 14,
                    marginBottom: 7,
                  }}
                >
                  <span>{alternativa.nombre_perfil_ruta}</span>

                  {recomendada && (
                    <span
                      style={{
                        color: "#166534",
                        background: "#dcfce7",
                        borderRadius: 20,
                        padding: "4px 7px",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      Recomendada por IA
                    </span>
                  )}

                  {seleccionada && (
                    <span style={{ color, fontSize: 12 }}>
                      ✓ Seleccionada en el mapa
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  Distancia:{" "}
                  {formatearDistancia(
                    Number(alternativa.distancia_metros),
                  )}
                  {" · "}
                  Tiempo:{" "}
                  {Number(
                    alternativa.tiempo_estimado_minutos,
                  ).toFixed(1)}{" "}
                  min
                </div>

                <div style={{ fontSize: 13 }}>
                  Riesgo: {alternativa.nivel_riesgo}
                  {" · "}
                  Puntaje:{" "}
                  {Number(alternativa.puntaje_riesgo).toFixed(2)}
                </div>

                {explicacion && (
                  <div
                    style={{
                      marginTop: 9,
                      padding: 9,
                      borderRadius: 6,
                      background: recomendada ? "#f0fdf4" : "#f9fafb",
                      border: `1px solid ${
                        recomendada ? "#bbf7d0" : "#e5e7eb"
                      }`,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: 4,
                        color: recomendada ? "#166534" : "#374151",
                      }}
                    >
                      {recomendada
                        ? "¿Por qué se recomienda?"
                        : "Interpretación de la IA"}
                    </div>

                    {explicacion}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}