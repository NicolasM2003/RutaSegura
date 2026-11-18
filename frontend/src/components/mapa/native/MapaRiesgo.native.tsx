import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import MapView, {
  PROVIDER_GOOGLE,
  Polyline,
  type Region,
} from "react-native-maps";

import ControlesMapa, {
  RANGOS_HORARIOS,
} from "./ControlesMapa.native";

import {
  CapaDelitos,
  CapaConcentracionDelitos,
  CapaRedPeatonal,
  CapaPuntosRuta,
  CapaZonasRiesgo,
  type Delito,
  type ElementoMapa,
  type SegmentoPeatonal,
  type PuntoRuta,
  type ZonaRiesgo,
} from "./CapasMapa.native";

import { API_BASE_URL } from "./api";

import {
  analizarPuntoSeleccionado,
  claveZonaRiesgo,
  type ZonaProxima,
} from "./zonas";

import {
  buscarDirecciones,
  type DestinoRuta,
  type ResultadoDireccion,
} from "../direccion";

import { obtenerVisibilidadCapas } from "../visibilidad-capas";

import CabeceraMapa from "./CabeceraMapa.native";
import ControlesCapas from "./ControlesCapas.native";
import PanelResultados from "./PanelResultados.native";

const REGION_INICIAL: Region = {
  latitude: -33.0245,
  longitude: -71.5518,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const COMUNAS = [
  "Viña del Mar",
  "Concón",
  "Valparaíso",
];

type Carga<T> = {
  data?: T[];
};

type RutaAlternativa = {
  perfil_ruta: string;
  nombre_perfil_ruta?: string;
  es_ruta_principal?: boolean;
  geometria?: unknown;
  distancia_metros?: number;
  tiempo_estimado_minutos?: number;
  nivel_riesgo?: string;
  puntaje_riesgo?: number;
};

type InterpretacionIA = {
  disponible: boolean;
  resumen_general?: string;
  recomendacion?: {
    perfil_ruta: string;
    motivo: string;
  };
  comparaciones?: Array<{
    perfil_ruta: string;
    explicacion: string;
  }>;
  consideraciones?: string[];
  mensaje?: string;
};

type ResultadoRuta = {
  encontrada?: boolean;
  cantidad_rutas?: number;
  perfil_principal?: string;
  rutas?: RutaAlternativa[];
  mensaje?: string;
  message?: string;
  interpretacion_ia?: InterpretacionIA;
};

function normalizarGeometria(
  value: unknown,
): Array<[number, number]> {
  if (!Array.isArray(value)) return [];

  return value.flatMap((point): Array<[number, number]> => {
    if (!Array.isArray(point) || point.length < 2) return [];

    const lat = Number(point[0]);
    const lon = Number(point[1]);

    return Number.isFinite(lat) && Number.isFinite(lon)
      ? [[lat, lon]]
      : [];
  });
}

function enRango(
  value: number,
  center: number,
  delta: number,
) {
  return (
    Math.abs(value - center) <= delta / 2 + delta * 0.08
  );
}

function estaEnVista(
  lat: number | string,
  lon: number | string,
  region: Region,
) {
  const latitude = Number(lat);
  const longitude = Number(lon);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    enRango(latitude, region.latitude, region.latitudeDelta) &&
    enRango(longitude, region.longitude, region.longitudeDelta)
  );
}

function zoomEstimado(region: Region) {
  const anchoDp = Dimensions.get("window").width;

  return Math.round(
    Math.log2(
      (360 * anchoDp) /
        (256 * Math.max(region.longitudeDelta, 0.00001)),
    ),
  );
}

function bboxVisible(region: Region) {
  const sur = Math.max(
    -90,
    region.latitude - region.latitudeDelta / 2,
  );

  const oeste = Math.max(
    -180,
    region.longitude - region.longitudeDelta / 2,
  );

  const norte = Math.min(
    90,
    region.latitude + region.latitudeDelta / 2,
  );

  const este = Math.min(
    180,
    region.longitude + region.longitudeDelta / 2,
  );

  return [sur, oeste, norte, este]
    .map((value) => value.toFixed(6))
    .join(",");
}

function valor(value: unknown, fallback = "No informado") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function colorPerfilRuta(perfil: string): string {
  switch (perfil) {
    case "menor_riesgo":
      return "#16a34a";

    case "equilibrada":
      return "#2563eb";

    case "mas_rapida":
      return "#ea580c";

    default:
      return "#64748b";
  }
}

function FichaElemento({
  elemento,
  cerrar,
}: {
  elemento: ElementoMapa;
  cerrar: () => void;
}) {
  const fields: Array<[string, unknown]> =
    elemento.tipo === "zona"
      ? [
          ["Nivel", elemento.datos.nivel],
          ["Comuna", elemento.datos.comuna],
          ["Cantidad de delitos", elemento.datos.cantidad_delitos],
          ["Puntaje final", elemento.datos.puntajeFinal],
          [
            "Agrupación",
            elemento.datos.metodo_agrupacion ===
            "coordenadas_reportadas_identicas"
              ? "Dos coordenadas reportadas idénticas"
              : "DBSCAN",
          ],
        ]
      : elemento.tipo === "delito"
        ? [
            ["Fecha", elemento.datos.fecha],
            ["Rango horario", elemento.datos.rango_horario],
            ["Grupo del delito", elemento.datos.grupo_delito],
            ["Lugar", elemento.datos.lugar],
            ["Comuna", elemento.datos.comuna],
          ]
        : elemento.tipo === "concentracion"
          ? [
              [
                "Cantidad de registros",
                elemento.datos.cantidad_delitos,
              ],
              ["Rango horario", elemento.datos.rango_horario],
              ["Latitud reportada", elemento.datos.latitud],
              ["Longitud reportada", elemento.datos.longitud],
            ]
          : [
              ["Nombre", elemento.datos.nombre],
              ["Tipo", elemento.datos.tipo],
              [
                "Categoría peatonal",
                elemento.datos.categoria_peatonal,
              ],
              ["Comuna", elemento.datos.comuna],
              ["Superficie", elemento.datos.superficie],
              [
                "Longitud",
                elemento.datos.longitud_metros === undefined
                  ? undefined
                  : `${elemento.datos.longitud_metros} m`,
              ],
              ["Nodo inicio", elemento.datos.nodo_inicio],
              ["Nodo fin", elemento.datos.nodo_fin],
            ];

  const title =
    elemento.tipo === "zona"
      ? "Zona de riesgo"
      : elemento.tipo === "delito"
        ? "Evento delictual"
        : elemento.tipo === "concentracion"
          ? "Concentración de delitos"
          : "Segmento peatonal";

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoTitle}>{title}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar información"
          onPress={cerrar}
          hitSlop={10}
        >
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      {fields.map(([label, content]) => (
        <Text key={label} style={styles.infoLine}>
          <Text style={styles.infoLabel}>{label}: </Text>
          {valor(content)}
        </Text>
      ))}

      {elemento.tipo === "concentracion" && (
        <>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLabel}>Ubicación: </Text>
            Coordenada reportada; no representa un punto físico exacto.
          </Text>

          {elemento.datos.delitos.map((delito, index) => (
            <Text
              key={delito.id ?? index}
              style={styles.infoLine}
            >
              {`Registro ${index + 1}: ${valor(delito.fecha, "Fecha no informada")} · ${valor(delito.grupo_delito, "Grupo no informado")} · ${valor(delito.lugar, "Lugar no informado")}`}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

export type PerfilRuta =
  | "menor_riesgo"
  | "equilibrada"
  | "mas_rapida";

export default function MapaRiesgo({
  perfilInicial = "menor_riesgo",
}:{
  perfilInicial?: PerfilRuta;
}){
  const mapRef = useRef<MapView>(null);

  const redAbort = useRef<AbortController | null>(null);
  const redConsultaKey = useRef<string | null>(null);
  const cargaId = useRef(0);

  const [region, setRegion] = useState(REGION_INICIAL);
  const [comuna, setComuna] = useState<string | null>(null);
  const [horario, setHorario] = useState("20:00 - 23:59");

  const [zonas, setZonas] = useState<ZonaRiesgo[]>([]);
  const [delitos, setDelitos] = useState<Delito[]>([]);
  const [segmentos, setSegmentos] =
    useState<SegmentoPeatonal[]>([]);

  const [mostrarZonas, setMostrarZonas] = useState(true);
  const [mostrarDelitos, setMostrarDelitos] = useState(false);
  const [
    mostrarConcentracionDelitos,
    setMostrarConcentracionDelitos,
  ] = useState(false);
  const [mostrarRed, setMostrarRed] = useState(false);

  const [cargandoRed, setCargandoRed] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seleccion, setSeleccion] =
    useState<ElementoMapa | null>(null);

  const [origen, setOrigen] = useState<PuntoRuta | null>(null);
  const [destino, setDestino] = useState<PuntoRuta | null>(null);
  const [ubicacion, setUbicacion] =
    useState<PuntoRuta | null>(null);

  const [cargandoUbicacion, setCargandoUbicacion] =
    useState(false);

  const [estadoUbicacion, setEstadoUbicacion] =
    useState<string | null>(null);

  const [zonaOrigenDetectada, setZonaOrigenDetectada] =
    useState<ZonaProxima<ZonaRiesgo> | null | undefined>(
      undefined,
    );

  const [zonaDestinoDetectada, setZonaDestinoDetectada] =
    useState<ZonaProxima<ZonaRiesgo> | null | undefined>(
      undefined,
    );

  const [modoSeleccion, setModoSeleccion] = useState<
    "origen" | "destino" | null
  >(null);

  const [ruta, setRuta] = useState<ResultadoRuta | null>(null);

  const [rutaSeleccionada, setRutaSeleccionada] =
    useState<string | null>(null);

  const [perfilPrincipal, setPerfilPrincipal] =
    useState<string>(perfilInicial);

  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);

  const rutaId = useRef(0);
  const rutaAbort = useRef<AbortController | null>(null);

  const cancelarRutaPendiente = useCallback(() => {
    rutaId.current += 1;
    rutaAbort.current?.abort();
    rutaAbort.current = null;
    setCargandoRuta(false);
  }, []);

  const zoom = zoomEstimado(region);

  const seleccionarElemento = useCallback(
    (item: ElementoMapa) => setSeleccion(item),
    [],
  );

  const cambiarZonas = useCallback(() => {
    setMostrarZonas((visible) => !visible);

    setSeleccion((actual) =>
      actual?.tipo === "zona" ? null : actual,
    );
  }, []);

  const limpiarRuta = useCallback(() => {
    cancelarRutaPendiente();

    setOrigen(null);
    setDestino(null);
    setRuta(null);
    setRutaSeleccionada(null);
    setErrorRuta(null);
    setModoSeleccion(null);
    setSeleccion(null);

    setZonaOrigenDetectada(undefined);
    setZonaDestinoDetectada(undefined);
  }, [cancelarRutaPendiente]);

  const elegirOrigen = useCallback(() => {
    cancelarRutaPendiente();

    setDestino(null);
    setRuta(null);
    setRutaSeleccionada(null);
    setErrorRuta(null);
    setModoSeleccion("origen");
    setSeleccion(null);

    setZonaOrigenDetectada(undefined);
    setZonaDestinoDetectada(undefined);
  }, [cancelarRutaPendiente]);

  const elegirDestino = useCallback(() => {
    if (!origen) return;

    cancelarRutaPendiente();

    setDestino(null);
    setRuta(null);
    setRutaSeleccionada(null);
    setErrorRuta(null);
    setModoSeleccion("destino");
    setSeleccion(null);

    setZonaDestinoDetectada(undefined);
  }, [origen, cancelarRutaPendiente]);

  const solicitarUbicacion = useCallback(async () => {
    setCargandoUbicacion(true);
    setEstadoUbicacion(null);

    try {
      const permiso =
        await Location.requestForegroundPermissionsAsync();

      if (permiso.status !== "granted") {
        setEstadoUbicacion(
          "Permiso denegado. Puedes elegir el origen o destino tocando el mapa.",
        );
        return;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        setEstadoUbicacion(
          "Activa la ubicación del dispositivo o selecciona un punto manualmente en el mapa.",
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const punto = {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      };

      if (
        !Number.isFinite(punto.latitud) ||
        !Number.isFinite(punto.longitud)
      ) {
        setEstadoUbicacion(
          "No se obtuvo una ubicación válida. Puedes seleccionar un punto manualmente.",
        );
        return;
      }

      setUbicacion(punto);

      cancelarRutaPendiente();

      setOrigen(punto);
      setDestino(null);

      setZonaOrigenDetectada(
        analizarPuntoSeleccionado(
          {
            latitude: punto.latitud,
            longitude: punto.longitud,
          },
          zonas,
        ).zonaProxima,
      );

      setZonaDestinoDetectada(undefined);
      setRuta(null);
      setRutaSeleccionada(null);
      setErrorRuta(null);
      setModoSeleccion("destino");

      mapRef.current?.animateToRegion(
        {
          latitude: punto.latitud,
          longitude: punto.longitud,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        800,
      );

      setEstadoUbicacion(
        "Ubicación actual establecida como origen. Elige o busca un destino.",
      );
    } catch (reason) {
      const detail =
        reason instanceof Error
          ? reason.message
          : "No fue posible obtener la ubicación.";

      setEstadoUbicacion(
        `${detail} Puedes seleccionar un punto manualmente en el mapa.`,
      );
    } finally {
      setCargandoUbicacion(false);
    }
  }, [zonas, cancelarRutaPendiente]);

  const buscarDireccion = useCallback(
    (consulta: string, tipo: DestinoRuta) => {
      if (tipo === "destino" && !origen) {
        throw new Error(
          "Establece primero un origen para buscar destinos cercanos.",
        );
      }

      const referencia =
        tipo === "destino" && origen
          ? origen
          : origen ??
            ubicacion ?? {
              latitud: region.latitude,
              longitud: region.longitude,
            };

      return buscarDirecciones(
        API_BASE_URL,
        consulta,
        referencia,
      );
    },
    [
      origen,
      ubicacion,
      region.latitude,
      region.longitude,
    ],
  );

  const seleccionarDireccion = useCallback(
    (tipo: DestinoRuta, resultado: ResultadoDireccion) => {
      if (tipo === "destino" && !origen) {
        setEstadoUbicacion(
          "Primero establece un origen para seleccionar el destino.",
        );
        return;
      }

      cancelarRutaPendiente();

      const punto = {
        latitud: resultado.latitud,
        longitud: resultado.longitud,
      };

      const { zonaProxima } = analizarPuntoSeleccionado(
        {
          latitude: punto.latitud,
          longitude: punto.longitud,
        },
        zonas,
      );

      setSeleccion(null);
      setRuta(null);
      setRutaSeleccionada(null);
      setErrorRuta(null);

      if (tipo === "origen") {
        setOrigen(punto);
        setDestino(null);

        setZonaOrigenDetectada(zonaProxima);
        setZonaDestinoDetectada(undefined);

        setModoSeleccion("destino");
      } else {
        setDestino(punto);
        setZonaDestinoDetectada(zonaProxima);
        setModoSeleccion(null);
      }

      mapRef.current?.animateToRegion(
        {
          latitude: punto.latitud,
          longitude: punto.longitud,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        600,
      );
    },
    [origen, zonas, cancelarRutaPendiente],
  );

  const seleccionarPuntoMapa = useCallback(
    (event: {
      nativeEvent: {
        coordinate: {
          latitude: number;
          longitude: number;
        };
      };
    }) => {
      if (!modoSeleccion) return;

      cancelarRutaPendiente();

      const { latitude, longitude } =
        event.nativeEvent.coordinate;

      const { punto, zonaProxima } =
        analizarPuntoSeleccionado(
          { latitude, longitude },
          zonas,
        );

      setSeleccion(null);
      setRuta(null);
      setRutaSeleccionada(null);
      setErrorRuta(null);

      if (modoSeleccion === "origen") {
        setOrigen(punto);
        setDestino(null);

        setZonaOrigenDetectada(zonaProxima);
        setZonaDestinoDetectada(undefined);

        setModoSeleccion("destino");
      } else {
        setDestino(punto);
        setZonaDestinoDetectada(zonaProxima);
        setModoSeleccion(null);
      }
    },
    [modoSeleccion, zonas, cancelarRutaPendiente],
  );

  useEffect(() => {
    const id = ++rutaId.current;

    rutaAbort.current?.abort();
    rutaAbort.current = null;

    if (!origen || !destino) {
      setRuta(null);
      setRutaSeleccionada(null);
      setErrorRuta(null);
      setCargandoRuta(false);
      return;
    }

    const controller = new AbortController();
    rutaAbort.current = controller;

    setRuta(null);
    setRutaSeleccionada(null);

    const params = new URLSearchParams({
      origen_lat: String(origen.latitud),
      origen_lon: String(origen.longitud),
      destino_lat: String(destino.latitud),
      destino_lon: String(destino.longitud),
      rango_horario: horario,
      perfil_ruta: perfilPrincipal,
    });

    if (comuna) {
      params.set("comuna", comuna);
    }

    setCargandoRuta(true);
    setErrorRuta(null);

    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/rutas/alternativas?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            `No se pudieron calcular las rutas (HTTP ${response.status}).`,
          );
        }

        const result =
          (await response.json()) as ResultadoRuta;

        if (id !== rutaId.current) return;

        const rutasNormalizadas = (result.rutas ?? []).map(
          (alternativa) => ({
            ...alternativa,
            geometria: normalizarGeometria(
              alternativa.geometria,
            ),
          }),
        );

        setRuta({
          ...result,
          rutas: rutasNormalizadas,
        });

        setRutaSeleccionada(
          result.perfil_principal ??
            rutasNormalizadas.find(
              (ruta) => ruta.es_ruta_principal,
            )?.perfil_ruta ??
            rutasNormalizadas[0]?.perfil_ruta ??
            perfilPrincipal,
        );

        if (
          result.encontrada === false ||
          rutasNormalizadas.length === 0
        ) {
          setErrorRuta(
            result.mensaje ??
              result.message ??
              "No se encontraron rutas alternativas para esos puntos.",
          );
        }
      } catch (reason) {
        if (
          controller.signal.aborted ||
          id !== rutaId.current
        ) {
          return;
        }

        setErrorRuta(
          reason instanceof Error
            ? reason.message
            : "No fue posible calcular la ruta.",
        );
      } finally {
        if (id === rutaId.current) {
          setCargandoRuta(false);
        }
      }
    })();

    return () => {
      controller.abort();

      if (rutaAbort.current === controller) {
        rutaAbort.current = null;
      }
    };
  }, [origen, destino, horario, comuna, perfilPrincipal]);

  useEffect(() => {
    if (ruta?.encontrada === false) return;

    const alternativasParaEncuadrar = (
      ruta?.rutas ?? []
    ).filter(
      (alternativa) =>
        rutaSeleccionada === null ||
        alternativa.perfil_ruta === rutaSeleccionada,
    );

    const coordenadas: Array<[number, number]> =
      alternativasParaEncuadrar.flatMap((alternativa) =>
        Array.isArray(alternativa.geometria)
          ? (alternativa.geometria as Array<[number, number]>)
          : [],
      );

    if (coordenadas.length < 2) return;

    mapRef.current?.fitToCoordinates(
      coordenadas.map(([latitude, longitude]) => ({
        latitude,
        longitude,
      })),
      {
        edgePadding: {
          top: 125,
          right: 38,
          bottom: 300,
          left: 38,
        },
        animated: true,
      },
    );
  }, [ruta, rutaSeleccionada]);

  useEffect(() => {
    if (!RANGOS_HORARIOS.includes(horario)) return;

    const id = ++cargaId.current;
    const controller = new AbortController();

    setCargando(true);
    setError(null);

    const query =
      `rango_horario=${encodeURIComponent(horario)}`;

    const cargar = async () => {
      try {
        const [respuestasZonas, respuestaDelitos] =
          await Promise.all([
            Promise.all(
              COMUNAS.map((nombre) =>
                fetch(
                  `${API_BASE_URL}/api/geografia?comuna=${encodeURIComponent(nombre)}&${query}`,
                  { signal: controller.signal },
                ),
              ),
            ),

            fetch(`${API_BASE_URL}/api/delitos?${query}`, {
              signal: controller.signal,
            }),
          ]);

        const errorResponse = [
          ...respuestasZonas,
          respuestaDelitos,
        ].find((res) => !res.ok);

        if (errorResponse) {
          throw new Error(
            `Error del backend (HTTP ${errorResponse.status})`,
          );
        }

        const [resultadosZonas, resultadoDelitos] =
          await Promise.all([
            Promise.all(
              respuestasZonas.map(
                (res) => res.json() as Promise<Carga<ZonaRiesgo>>,
              ),
            ),

            respuestaDelitos.json() as Promise<Carga<Delito>>,
          ]);

        if (id !== cargaId.current) return;

        setZonas(
          resultadosZonas.flatMap((result, index) =>
            (result.data ?? []).map((zona) => ({
              ...zona,
              comuna: COMUNAS[index],
            })),
          ),
        );

        setDelitos(resultadoDelitos.data ?? []);
      } catch (reason) {
        if (
          controller.signal.aborted ||
          id !== cargaId.current
        ) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar zonas y delitos.",
        );
      } finally {
        if (id === cargaId.current) {
          setCargando(false);
        }
      }
    };

    void cargar();

    return () => controller.abort();
  }, [horario]);

  const bbox = bboxVisible(region);
  const zoomSuficiente = zoom >= 12;

  useEffect(() => {
    if (!mostrarRed || !comuna || !zoomSuficiente) {
      redAbort.current?.abort();
      redAbort.current = null;
      redConsultaKey.current = null;

      setSegmentos([]);
      setCargandoRed(false);
      return;
    }

    const consultaKey = `${comuna}|${bbox}`;

    if (
      redConsultaKey.current === consultaKey &&
      redAbort.current &&
      !redAbort.current.signal.aborted
    ) {
      return;
    }

    redAbort.current?.abort();

    const controller = new AbortController();

    redAbort.current = controller;
    redConsultaKey.current = consultaKey;

    setSegmentos([]);
    setCargandoRed(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          comuna,
          bbox,
        });

        const response = await fetch(
          `${API_BASE_URL}/api/geografia/red-peatonal?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            `Error red peatonal (HTTP ${response.status})`,
          );
        }

        const result =
          (await response.json()) as Carga<SegmentoPeatonal>;

        if (!controller.signal.aborted) {
          setSegmentos(result.data ?? []);
        }
      } catch (reason) {
        if (controller.signal.aborted) return;

        setSegmentos([]);

        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar la red peatonal.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setCargandoRed(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bbox, comuna, mostrarRed, zoomSuficiente]);

  const cambiarComuna = useCallback(
    (nombre: string | null) => {
      setSegmentos([]);
      setComuna(nombre);
      setSeleccion(null);
    },
    [],
  );

  const zonasVisibles = zonas.filter((zona) =>
    estaEnVista(zona.latitud, zona.longitud, region),
  );

  const capasVisibles = obtenerVisibilidadCapas(
    {
      delitosIndividuales: mostrarDelitos,
      concentracionDelitos: mostrarConcentracionDelitos,
      zonasRiesgo: mostrarZonas,
    },
    zoom,
  );

  const delitosVisibles =
    capasVisibles.delitosIndividuales ||
    capasVisibles.concentracionDelitos
      ? delitos.filter((delito) =>
          estaEnVista(delito.latitud, delito.longitud, region),
        )
      : [];

  const rutasParaDibujar = (ruta?.rutas ?? []).filter(
    (alternativa) =>
      rutaSeleccionada === null ||
      alternativa.perfil_ruta === rutaSeleccionada,
  );

  const clavePuntosRuta =
    origen && destino
      ? `${origen.latitud},${origen.longitud}:${destino.latitud},${destino.longitud}`
      : "sin-puntos";
        return (
    <View style={styles.container}>
      <MapView
        key={`map-zonas-${mostrarZonas}-ruta-${rutaSeleccionada ?? "todas"}-${clavePuntosRuta}`}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        accessibilityLabel="Mapa de RutaSegura, centrado en Viña del Mar"
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="standard"
        loadingEnabled
        showsCompass
        showsScale
        onPress={seleccionarPuntoMapa}
        onRegionChangeComplete={(nextRegion) =>
          setRegion(nextRegion)
        }
      >
        {mostrarRed && comuna !== null && zoom >= 12 && (
          <CapaRedPeatonal
            segmentos={segmentos}
            onSeleccionar={seleccionarElemento}
          />
        )}

        {delitosVisibles.length > 0 &&
          capasVisibles.delitosIndividuales && (
            <CapaDelitos
              delitos={delitosVisibles}
              onSeleccionar={seleccionarElemento}
            />
          )}

        {capasVisibles.zonasRiesgo && (
          <CapaZonasRiesgo
            zonas={zonasVisibles}
            zoom={zoom}
            visible={capasVisibles.zonasRiesgo}
            onSeleccionar={seleccionarElemento}
            zonaOrigenSeleccionada={
              zonaOrigenDetectada
                ? claveZonaRiesgo(zonaOrigenDetectada.zona)
                : null
            }
            zonaDestinoSeleccionada={
              zonaDestinoDetectada
                ? claveZonaRiesgo(zonaDestinoDetectada.zona)
                : null
            }
            habilitarSeleccionZona={!modoSeleccion}
          />
        )}

        {delitosVisibles.length > 0 &&
          capasVisibles.concentracionDelitos && (
            <CapaConcentracionDelitos
              delitos={delitosVisibles}
              rangoHorario={horario}
              onSeleccionar={seleccionarElemento}
            />
          )}

        {[...rutasParaDibujar]
          .reverse()
          .map((alternativa) => {
            const geometria = Array.isArray(
              alternativa.geometria,
            )
              ? (alternativa.geometria as Array<
                  [number, number]
                >)
              : [];

            if (geometria.length < 2) return null;

            return (
              <Polyline
                key={`${clavePuntosRuta}-${alternativa.perfil_ruta}-${rutaSeleccionada ?? "todas"}`}
                coordinates={geometria.map(
                  ([latitude, longitude]) => ({
                    latitude,
                    longitude,
                  }),
                )}
                strokeColor={colorPerfilRuta(
                  alternativa.perfil_ruta,
                )}
                strokeWidth={6}
              />
            );
          })}

        <CapaPuntosRuta
          origen={origen}
          destino={destino}
          ubicacion={ubicacion}
        />
      </MapView>

      <CabeceraMapa />

      <ControlesCapas
        zonas={mostrarZonas}
        onZonas={cambiarZonas}
        concentraciones={mostrarConcentracionDelitos}
        onConcentraciones={() =>
          setMostrarConcentracionDelitos((visible) => !visible)
        }
        delitos={mostrarDelitos}
        onDelitos={() =>
          setMostrarDelitos((visible) => !visible)
        }
        red={mostrarRed}
        onRed={() =>
          setMostrarRed((visible) => !visible)
        }
        comuna={comuna}
        zoom={zoom}
        cargandoUbicacion={cargandoUbicacion}
        onSolicitarUbicacion={solicitarUbicacion}
      />

      <ControlesMapa
        origen={origen}
        destino={destino}
        modoSeleccion={modoSeleccion}
        instruccionRuta={
          modoSeleccion === "origen"
            ? "Toca el mapa para marcar el origen."
            : modoSeleccion === "destino"
              ? "Toca el mapa para marcar el destino."
              : origen && !destino
                ? "Origen seleccionado. Elige un destino en el mapa o búscalo por dirección."
                : origen && destino
                  ? "Origen y destino seleccionados. Las alternativas se actualizan automáticamente."
                  : "Selecciona un origen en el mapa o utiliza tu ubicación actual."
        }
        onElegirOrigen={elegirOrigen}
        onElegirDestino={elegirDestino}
        onCambiarPuntos={limpiarRuta}
        comuna={comuna}
        onComuna={cambiarComuna}
        horario={horario}
        onHorario={setHorario}
        perfilRuta={perfilPrincipal}
        onPerfilRuta={setPerfilPrincipal}
        cargando={cargando || cargandoRed}
        error={error}
        estadoUbicacion={estadoUbicacion}
        cargandoUbicacion={cargandoUbicacion}
        onSolicitarUbicacion={solicitarUbicacion}
        zonaOrigenMensaje={
          zonaOrigenDetectada
            ? `Origen: zona ${zonaOrigenDetectada.zona.nivel} a ${Math.round(zonaOrigenDetectada.distanciaMetros)} m`
            : null
        }
        zonaDestinoMensaje={
          zonaDestinoDetectada
            ? `Destino: zona ${zonaDestinoDetectada.zona.nivel} a ${Math.round(zonaDestinoDetectada.distanciaMetros)} m`
            : null
        }
        onBuscarDireccion={buscarDireccion}
        onSeleccionarDireccion={seleccionarDireccion}
      >
        <PanelResultados
          origenCompleto={Boolean(origen && destino)}
          resultado={ruta}
          cargando={cargandoRuta}
          error={errorRuta}
          rutaSeleccionada={rutaSeleccionada}
          onSeleccionarRuta={setRutaSeleccionada}
        />
      </ControlesMapa>

      {cargando && (
        <View
          pointerEvents="none"
          style={styles.loading}
        >
          <ActivityIndicator
            size="small"
            color="#1d4ed8"
          />
        </View>
      )}

      {cargandoRuta && (
        <View
          pointerEvents="none"
          style={[styles.loading, { top: 196 }]}
        >
          <ActivityIndicator
            size="small"
            color="#16a34a"
          />
        </View>
      )}

      {seleccion && (
        <View style={styles.infoCardPosition}>
          <FichaElemento
            elemento={seleccion}
            cerrar={() => setSeleccion(null)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e5e7eb",
  },
  loading: {
    position: "absolute",
    right: 18,
    top: 145,
    padding: 8,
    backgroundColor: "white",
    borderRadius: 20,
    elevation: 3,
  },
  infoCardPosition: {
    position: "absolute",
    top: 148,
    left: 12,
    right: 12,
    zIndex: 25,
  },
  infoCard: {
    maxHeight: "36%",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  infoTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },
  close: {
    color: "#374151",
    fontSize: 26,
    lineHeight: 28,
  },
  infoLine: {
    color: "#374151",
    fontSize: 13,
    paddingVertical: 2,
  },
  infoLabel: {
    fontWeight: "700",
    color: "#111827",
  },
});