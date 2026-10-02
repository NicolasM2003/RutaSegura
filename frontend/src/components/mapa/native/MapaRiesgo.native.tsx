import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";
import ControlesMapa, { RANGOS_HORARIOS } from "./ControlesMapa.native";
import {
  CapaDelitos,
  CapaRedPeatonal,
  CapaPuntosRuta,
  CapaRuta,
  CapaZonasRiesgo,
  type Delito,
  type ElementoMapa,
  type SegmentoPeatonal,
  type PuntoRuta,
  type ZonaRiesgo,
} from "./CapasMapa.native";
import { API_BASE_URL } from "./api";
import { analizarPuntoSeleccionado, claveZonaRiesgo, type ZonaProxima } from "./zonas";
import { buscarDirecciones, type DestinoRuta, type ResultadoDireccion } from "../direccion";

const REGION_INICIAL: Region = {
  latitude: -33.0245,
  longitude: -71.5518,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const COMUNAS = ["Viña del Mar", "Concón", "Valparaíso"];

type Carga<T> = { data?: T[] };
type ResultadoRuta = {
  encontrada?: boolean;
  geometria?: unknown;
  distancia_metros?: number;
  nivel_riesgo?: string;
  puntaje_riesgo?: number;
  mensaje?: string;
  message?: string;
};

function normalizarGeometria(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point): Array<[number, number]> => {
    if (!Array.isArray(point) || point.length < 2) return [];
    // El backend entrega [latitud, longitud], igual que el flujo web.
    const lat = Number(point[0]);
    const lon = Number(point[1]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [[lat, lon]] : [];
  });
}

function enRango(value: number, center: number, delta: number) {
  return Math.abs(value - center) <= delta / 2 + delta * 0.08;
}

function estaEnVista(lat: number | string, lon: number | string, region: Region) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    enRango(latitude, region.latitude, region.latitudeDelta) &&
    enRango(longitude, region.longitude, region.longitudeDelta);
}

function zoomEstimado(region: Region) {
  // Estima el zoom por el ancho visible, equivalente a la escala de Leaflet.
  const anchoDp = Dimensions.get("window").width;
  return Math.round(Math.log2((360 * anchoDp) / (256 * Math.max(region.longitudeDelta, 0.00001))));
}

function bboxVisible(region: Region) {
  const sur = Math.max(-90, region.latitude - region.latitudeDelta / 2);
  const oeste = Math.max(-180, region.longitude - region.longitudeDelta / 2);
  const norte = Math.min(90, region.latitude + region.latitudeDelta / 2);
  const este = Math.min(180, region.longitude + region.longitudeDelta / 2);
  // El endpoint existente espera: sur,oeste,norte,este.
  return [sur, oeste, norte, este].map((value) => value.toFixed(6)).join(",");
}

function valor(value: unknown, fallback = "No informado") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function FichaElemento({ elemento, cerrar }: { elemento: ElementoMapa; cerrar: () => void }) {
  const fields: Array<[string, unknown]> = elemento.tipo === "zona"
    ? [["Nivel", elemento.datos.nivel], ["Comuna", elemento.datos.comuna], ["Cantidad de delitos", elemento.datos.cantidad_delitos], ["Puntaje final", elemento.datos.puntajeFinal]]
    : elemento.tipo === "delito"
      ? [["Fecha", elemento.datos.fecha], ["Rango horario", elemento.datos.rango_horario], ["Grupo del delito", elemento.datos.grupo_delito], ["Lugar", elemento.datos.lugar], ["Comuna", elemento.datos.comuna]]
      : [["Nombre", elemento.datos.nombre], ["Tipo", elemento.datos.tipo], ["Categoría peatonal", elemento.datos.categoria_peatonal], ["Comuna", elemento.datos.comuna], ["Superficie", elemento.datos.superficie], ["Longitud", elemento.datos.longitud_metros === undefined ? undefined : `${elemento.datos.longitud_metros} m`], ["Nodo inicio", elemento.datos.nodo_inicio], ["Nodo fin", elemento.datos.nodo_fin]];
  const title = elemento.tipo === "zona" ? "Zona de riesgo" : elemento.tipo === "delito" ? "Evento delictual" : "Segmento peatonal";
  return <View style={styles.infoCard}>
    <View style={styles.infoHeader}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar información" onPress={cerrar} hitSlop={10}>
        <Text style={styles.close}>×</Text>
      </Pressable>
    </View>
    {fields.map(([label, content]) => <Text key={label} style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}: </Text>{valor(content)}
    </Text>)}
  </View>;
}

export default function MapaRiesgo() {
  const mapRef = useRef<MapView>(null);
  const redAbort = useRef<AbortController | null>(null);
  const redConsultaKey = useRef<string | null>(null);
  const cargaId = useRef(0);
  const [region, setRegion] = useState(REGION_INICIAL);
  const [comuna, setComuna] = useState<string | null>(null);
  const [horario, setHorario] = useState("20:00 - 23:59");
  const [zonas, setZonas] = useState<ZonaRiesgo[]>([]);
  const [delitos, setDelitos] = useState<Delito[]>([]);
  const [segmentos, setSegmentos] = useState<SegmentoPeatonal[]>([]);
  const [mostrarZonas, setMostrarZonas] = useState(true);
  const [mostrarDelitos, setMostrarDelitos] = useState(false);
  const [mostrarRed, setMostrarRed] = useState(false);
  const [cargandoRed, setCargandoRed] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<ElementoMapa | null>(null);
  const [origen, setOrigen] = useState<PuntoRuta | null>(null);
  const [destino, setDestino] = useState<PuntoRuta | null>(null);
  const [ubicacion, setUbicacion] = useState<PuntoRuta | null>(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);
  const [estadoUbicacion, setEstadoUbicacion] = useState<string | null>(null);
  const [zonaOrigenDetectada, setZonaOrigenDetectada] = useState<ZonaProxima<ZonaRiesgo> | null | undefined>(undefined);
  const [zonaDestinoDetectada, setZonaDestinoDetectada] = useState<ZonaProxima<ZonaRiesgo> | null | undefined>(undefined);
  const [modoSeleccion, setModoSeleccion] = useState<"origen" | "destino" | null>(null);
  const [ruta, setRuta] = useState<ResultadoRuta | null>(null);
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
  const seleccionarElemento = useCallback((item: ElementoMapa) => setSeleccion(item), []);
  const cambiarZonas = useCallback(() => {
    setMostrarZonas((visible) => !visible);
    setSeleccion((actual) => actual?.tipo === "zona" ? null : actual);
  }, []);

  const limpiarRuta = useCallback(() => {
    cancelarRutaPendiente();
    setOrigen(null);
    setDestino(null);
    setRuta(null);
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
    setErrorRuta(null);
    setModoSeleccion("destino");
    setSeleccion(null);
    setZonaDestinoDetectada(undefined);
  }, [origen, cancelarRutaPendiente]);

  const solicitarUbicacion = useCallback(async () => {
    setCargandoUbicacion(true);
    setEstadoUbicacion(null);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== "granted") {
        setEstadoUbicacion("Permiso denegado. Puedes elegir el origen o destino tocando el mapa.");
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setEstadoUbicacion("Activa la ubicación del dispositivo o selecciona un punto manualmente en el mapa.");
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const punto = { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
      if (!Number.isFinite(punto.latitud) || !Number.isFinite(punto.longitud)) {
        setEstadoUbicacion("No se obtuvo una ubicación válida. Puedes seleccionar un punto manualmente.");
        return;
      }
      setUbicacion(punto);
      cancelarRutaPendiente();
      setOrigen(punto);
      setDestino(null);
      setZonaOrigenDetectada(analizarPuntoSeleccionado({ latitude: punto.latitud, longitude: punto.longitud }, zonas).zonaProxima);
      setZonaDestinoDetectada(undefined);
      setRuta(null);
      setErrorRuta(null);
      setModoSeleccion("destino");
      mapRef.current?.animateToRegion({
        latitude: punto.latitud,
        longitude: punto.longitud,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 800);
      setEstadoUbicacion("Ubicación actual establecida como origen. Elige o busca un destino.");
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "No fue posible obtener la ubicación.";
      setEstadoUbicacion(`${detail} Puedes seleccionar un punto manualmente en el mapa.`);
    } finally {
      setCargandoUbicacion(false);
    }
  }, [zonas, cancelarRutaPendiente]);

  const buscarDireccion = useCallback((consulta: string, tipo: DestinoRuta) => {
    if (tipo === "destino" && !origen) throw new Error("Establece primero un origen para buscar destinos cercanos.");
    const referencia = tipo === "destino" && origen ? origen : origen ?? ubicacion ?? { latitud: region.latitude, longitud: region.longitude };
    return buscarDirecciones(API_BASE_URL, consulta, referencia);
  }, [origen, ubicacion, region.latitude, region.longitude]);
  const seleccionarDireccion = useCallback((tipo: DestinoRuta, resultado: ResultadoDireccion) => {
    if (tipo === "destino" && !origen) {
      setEstadoUbicacion("Primero establece un origen para seleccionar el destino.");
      return;
    }
    cancelarRutaPendiente();
    const punto = { latitud: resultado.latitud, longitud: resultado.longitud };
    const { zonaProxima } = analizarPuntoSeleccionado({ latitude: punto.latitud, longitude: punto.longitud }, zonas);
    setSeleccion(null);
    setRuta(null);
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
    mapRef.current?.animateToRegion({ latitude: punto.latitud, longitude: punto.longitud, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
  }, [origen, zonas, cancelarRutaPendiente]);

  const seleccionarPuntoMapa = useCallback((event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (!modoSeleccion) return;
    cancelarRutaPendiente();
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const { punto, zonaProxima } = analizarPuntoSeleccionado({ latitude, longitude }, zonas);
    setSeleccion(null);
    setRuta(null);
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
  }, [modoSeleccion, zonas, cancelarRutaPendiente]);

  useEffect(() => {
    const id = ++rutaId.current;
    rutaAbort.current?.abort();
    rutaAbort.current = null;
    if (!origen || !destino) {
      setRuta(null);
      setErrorRuta(null);
      setCargandoRuta(false);
      return;
    }
    const controller = new AbortController();
    rutaAbort.current = controller;
    setRuta(null);
    const params = new URLSearchParams({
      origen_lat: String(origen.latitud),
      origen_lon: String(origen.longitud),
      destino_lat: String(destino.latitud),
      destino_lon: String(destino.longitud),
      rango_horario: horario,
    });
    setCargandoRuta(true);
    setErrorRuta(null);
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/rutas?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`No se pudo calcular la ruta (HTTP ${response.status}).`);
        const result = await response.json() as ResultadoRuta;
        if (id !== rutaId.current) return;
        setRuta({ ...result, geometria: normalizarGeometria(result.geometria) });
        if (result.encontrada === false) setErrorRuta(result.mensaje ?? result.message ?? "No se encontró una ruta para esos puntos.");
      } catch (reason) {
        if (controller.signal.aborted || id !== rutaId.current) return;
        setErrorRuta(reason instanceof Error ? reason.message : "No fue posible calcular la ruta.");
      } finally {
        if (id === rutaId.current) setCargandoRuta(false);
      }
    })();
    return () => {
      controller.abort();
      if (rutaAbort.current === controller) rutaAbort.current = null;
    };
  }, [origen, destino, horario]);

  useEffect(() => {
    if (ruta?.encontrada === false) return;
    const geometria = ruta?.geometria as Array<[number, number]> | undefined;
    if (!geometria || geometria.length < 2) return;
    const coordinates = geometria.map(([latitude, longitude]) => ({ latitude, longitude }));
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 260, right: 48, bottom: 190, left: 48 },
      animated: true,
    });
  }, [ruta]);

  useEffect(() => {
    if (!RANGOS_HORARIOS.includes(horario)) return;
    const id = ++cargaId.current;
    const controller = new AbortController();
    setCargando(true);
    setError(null);
    const query = `rango_horario=${encodeURIComponent(horario)}`;
    const cargar = async () => {
      try {
        const [respuestasZonas, respuestaDelitos] = await Promise.all([
          Promise.all(COMUNAS.map((nombre) => fetch(
            `${API_BASE_URL}/api/geografia?comuna=${encodeURIComponent(nombre)}&${query}`,
            { signal: controller.signal },
          ))),
          fetch(`${API_BASE_URL}/api/delitos?${query}`, { signal: controller.signal }),
        ]);
        const errorResponse = [...respuestasZonas, respuestaDelitos].find((res) => !res.ok);
        if (errorResponse) throw new Error(`Error del backend (HTTP ${errorResponse.status})`);
        const [resultadosZonas, resultadoDelitos] = await Promise.all([
          Promise.all(respuestasZonas.map((res) => res.json() as Promise<Carga<ZonaRiesgo>>)),
          respuestaDelitos.json() as Promise<Carga<Delito>>,
        ]);
        if (id !== cargaId.current) return;
        setZonas(resultadosZonas.flatMap((result, index) =>
          (result.data ?? []).map((zona) => ({ ...zona, comuna: COMUNAS[index] })),
        ));
        setDelitos(resultadoDelitos.data ?? []);
      } catch (reason) {
        if (controller.signal.aborted || id !== cargaId.current) return;
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar zonas y delitos.");
      } finally {
        if (id === cargaId.current) setCargando(false);
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
    // Descarta los segmentos del viewport anterior antes de solicitar el nuevo.
    setSegmentos([]);
    setCargandoRed(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ comuna, bbox });
        const response = await fetch(
          `${API_BASE_URL}/api/geografia/red-peatonal?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Error red peatonal (HTTP ${response.status})`);
        const result = await response.json() as Carga<SegmentoPeatonal>;
        if (!controller.signal.aborted) {
          setSegmentos(result.data ?? []);
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        setSegmentos([]);
        setError(reason instanceof Error ? reason.message : "No se pudo cargar la red peatonal.");
      } finally {
        if (!controller.signal.aborted) setCargandoRed(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bbox, comuna, mostrarRed, zoomSuficiente]);

  const cambiarComuna = useCallback((nombre: string | null) => {
    setSegmentos([]);
    setComuna(nombre);
    setSeleccion(null);
  }, []);

  const zonasVisibles = zonas.filter((zona) => estaEnVista(zona.latitud, zona.longitud, region));
  const delitosVisibles = mostrarDelitos && zoom >= 13
    ? delitos.filter((delito) => estaEnVista(delito.latitud, delito.longitud, region))
    : [];

  return <View style={styles.container}>
    <MapView
      key={`map-zonas-${mostrarZonas}`}
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
      onRegionChangeComplete={(nextRegion) => setRegion(nextRegion)}
    >
      {mostrarRed && comuna !== null && zoom >= 12 && <CapaRedPeatonal segmentos={segmentos} onSeleccionar={seleccionarElemento} />}
      {mostrarZonas && <CapaZonasRiesgo
        zonas={zonasVisibles}
        zoom={zoom}
        visible={mostrarZonas}
        onSeleccionar={seleccionarElemento}
        zonaOrigenSeleccionada={zonaOrigenDetectada ? claveZonaRiesgo(zonaOrigenDetectada.zona) : null}
        zonaDestinoSeleccionada={zonaDestinoDetectada ? claveZonaRiesgo(zonaDestinoDetectada.zona) : null}
        habilitarSeleccionZona={!modoSeleccion}
      />}
      {delitosVisibles.length > 0 && <CapaDelitos delitos={delitosVisibles} onSeleccionar={seleccionarElemento} />}
      <CapaRuta
        geometria={
          ruta?.encontrada !== false &&
          Array.isArray(ruta?.geometria)
            ? (ruta.geometria as Array<[number, number]>)
            : []
        }
      />
      <CapaPuntosRuta origen={origen} destino={destino} ubicacion={ubicacion} />
    </MapView>
    <ControlesMapa
      origen={origen}
      destino={destino}
      modoSeleccion={modoSeleccion}
      instruccionRuta={modoSeleccion === "origen" ? "Toca el mapa para marcar el origen." : modoSeleccion === "destino" ? "Toca el mapa para marcar el destino." : origen && !destino ? "Origen seleccionado. Elige destino y toca el mapa." : origen && destino ? "Origen y destino seleccionados." : "Elige origen para comenzar una ruta."}
      onElegirOrigen={elegirOrigen}
      onElegirDestino={elegirDestino}
      onCambiarPuntos={limpiarRuta}
      comuna={comuna}
      onComuna={cambiarComuna}
      horario={horario}
      onHorario={setHorario}
      zonas={mostrarZonas}
      onZonas={cambiarZonas}
      delitos={mostrarDelitos}
      onDelitos={() => setMostrarDelitos((visible) => !visible)}
      red={mostrarRed}
      onRed={() => setMostrarRed((visible) => !visible)}
      cargando={cargando || cargandoRed}
      error={error}
      zoom={zoom}
      onSolicitarUbicacion={solicitarUbicacion}
      cargandoUbicacion={cargandoUbicacion}
      estadoUbicacion={estadoUbicacion}
      onBuscarDireccion={buscarDireccion}
      onSeleccionarDireccion={seleccionarDireccion}
    />
    {cargando && <View pointerEvents="none" style={styles.loading}><ActivityIndicator size="small" color="#1d4ed8" /></View>}
    {cargandoRuta && <View pointerEvents="none" style={[styles.loading, { top: 202 }]}><ActivityIndicator size="small" color="#16a34a" /></View>}
    {seleccion && <FichaElemento elemento={seleccion} cerrar={() => setSeleccion(null)} />}
    {(zonaOrigenDetectada || zonaDestinoDetectada) && !seleccion && !cargandoRuta && <View style={[styles.zoneAssociationCard, (ruta || errorRuta) && styles.zoneAssociationAboveRoute]}>
      {zonaOrigenDetectada && <Text style={[styles.zoneAssociationLine, styles.originAssociation]}>
        {`Origen: zona ${zonaOrigenDetectada.zona.nivel} a ${Math.round(zonaOrigenDetectada.distanciaMetros)} m`}
      </Text>}
      {zonaDestinoDetectada && <Text style={[styles.zoneAssociationLine, styles.destinationAssociation]}>
        {`Destino: zona ${zonaDestinoDetectada.zona.nivel} a ${Math.round(zonaDestinoDetectada.distanciaMetros)} m`}
      </Text>}
    </View>}
    {(ruta || errorRuta || (origen && destino && cargandoRuta)) && !seleccion && <View style={styles.routeCard}>
      <Text style={styles.routeTitle}>Información de la ruta</Text>
      {cargandoRuta && <View style={styles.routeStatusRow}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text accessibilityLiveRegion="polite" style={[styles.routeLine, styles.routeLoading]}>Calculando ruta…</Text>
      </View>}
      {!cargandoRuta && errorRuta && <Text accessibilityLiveRegion="assertive" style={[styles.routeLine, styles.routeError]}>{errorRuta}</Text>}
      {!cargandoRuta && !errorRuta && ruta?.encontrada && <Text accessibilityLiveRegion="polite" style={[styles.routeLine, styles.routeSuccess]}>Ruta calculada correctamente.</Text>}
      {!cargandoRuta && !errorRuta && ruta?.encontrada === false && <Text accessibilityLiveRegion="assertive" style={[styles.routeLine, styles.routeError]}>No se pudo calcular la ruta.</Text>}
      {ruta?.distancia_metros !== undefined && <Text style={styles.routeLine}>Distancia: {ruta.distancia_metros >= 1000 ? `${(ruta.distancia_metros / 1000).toFixed(2)} km` : `${Math.round(ruta.distancia_metros)} m`}</Text>}
      {ruta?.nivel_riesgo && <Text style={styles.routeLine}>Nivel de riesgo: {ruta.nivel_riesgo}</Text>}
      {ruta?.puntaje_riesgo !== undefined && <Text style={styles.routeLine}>Puntaje de riesgo: {ruta.puntaje_riesgo}</Text>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e5e7eb" },
  loading: { position: "absolute", right: 18, top: 166, padding: 8, backgroundColor: "white", borderRadius: 20, elevation: 3 },
  infoCard: { position: "absolute", bottom: 22, left: 12, right: 12, maxHeight: "42%", backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, elevation: 8, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 8 },
  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  infoTitle: { color: "#111827", fontWeight: "700", fontSize: 16 },
  close: { color: "#374151", fontSize: 26, lineHeight: 28 },
  infoLine: { color: "#374151", fontSize: 13, paddingVertical: 2 },
  infoLabel: { fontWeight: "700", color: "#111827" },
  routeCard: { position: "absolute", bottom: 22, left: 12, right: 12, backgroundColor: "white", borderRadius: 14, padding: 14, elevation: 8, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 8 },
  routeTitle: { color: "#111827", fontWeight: "700", fontSize: 16, marginBottom: 5 },
  routeLine: { color: "#374151", fontSize: 13, paddingVertical: 2 },
  routeStatusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeLoading: { color: "#1d4ed8", fontWeight: "600" },
  routeSuccess: { color: "#15803d", fontWeight: "600" },
  routeError: { color: "#b91c1c" },
  zoneAssociationCard: { position: "absolute", bottom: 22, left: 12, right: 12, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, elevation: 6 },
  zoneAssociationAboveRoute: { bottom: 126 },
  zoneAssociationLine: { fontSize: 12, fontWeight: "700", paddingVertical: 2 },
  originAssociation: { color: "#1d4ed8" },
  destinationAssociation: { color: "#c2410c" },
});
