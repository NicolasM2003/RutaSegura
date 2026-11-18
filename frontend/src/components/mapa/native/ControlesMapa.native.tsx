import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DestinoRuta, ResultadoDireccion } from "../direccion";

export const RANGOS_HORARIOS = [
  "00:00 - 03:59",
  "04:00 - 07:59",
  "08:00 - 11:59",
  "12:00 - 15:59",
  "16:00 - 19:59",
  "20:00 - 23:59",
];

const COMUNAS = ["Viña del Mar", "Valparaíso", "Concón"];

const PERFILES = [
  { value: "menor_riesgo", label: "Más segura" },
  { value: "equilibrada", label: "Equilibrada" },
  { value: "mas_rapida", label: "Más rápida" },
];

type Punto = {
  latitud: number;
  longitud: number;
};

type Props = {
  origen: Punto | null;
  destino: Punto | null;
  modoSeleccion: "origen" | "destino" | null;
  instruccionRuta: string;
  onElegirOrigen: () => void;
  onElegirDestino: () => void;
  onCambiarPuntos: () => void;
  comuna: string | null;
  onComuna: (value: string | null) => void;
  horario: string;
  onHorario: (value: string) => void;
  perfilRuta: string;
  onPerfilRuta: (value: string) => void;
  cargando: boolean;
  error: string | null;
  estadoUbicacion: string | null;
  cargandoUbicacion: boolean;
  onSolicitarUbicacion: () => void;
  zonaOrigenMensaje?: string | null;
  zonaDestinoMensaje?: string | null;
  onBuscarDireccion: (
    consulta: string,
    destino: DestinoRuta,
  ) => Promise<ResultadoDireccion[]>;
  onSeleccionarDireccion: (
    destino: DestinoRuta,
    resultado: ResultadoDireccion,
  ) => void;
  children?: ReactNode;
};

type Selector = "comuna" | "horario" | null;

export default function ControlesMapa({
  origen,
  destino,
  modoSeleccion,
  instruccionRuta,
  onElegirOrigen,
  onElegirDestino,
  onCambiarPuntos,
  comuna,
  onComuna,
  horario,
  onHorario,
  perfilRuta,
  onPerfilRuta,
  cargando,
  error,
  estadoUbicacion,
  cargandoUbicacion,
  onSolicitarUbicacion,
  zonaOrigenMensaje,
  zonaDestinoMensaje,
  onBuscarDireccion,
  onSeleccionarDireccion,
  children,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const alturaReducida = Math.min(Math.max(height * 0.59, 405), 570);
  const alturaExpandida = Math.min(
    Math.max(height * 0.84, alturaReducida),
    760,
  );

  const [expandido, setExpandido] = useState(false);
  const alturaPanel = useRef(new Animated.Value(alturaReducida)).current;

  const [selector, setSelector] = useState<Selector>(null);
  const [direccionAbierta, setDireccionAbierta] = useState(false);
  const [destinoDireccion, setDestinoDireccion] =
    useState<DestinoRuta>("origen");

  const [consultaDireccion, setConsultaDireccion] = useState("");
  const [resultadosDireccion, setResultadosDireccion] =
    useState<ResultadoDireccion[]>([]);

  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState<string | null>(null);

  useEffect(() => {
    Animated.spring(alturaPanel, {
      toValue: expandido ? alturaExpandida : alturaReducida,
      useNativeDriver: false,
      damping: 24,
      stiffness: 170,
      mass: 0.9,
    }).start();
  }, [alturaPanel, alturaExpandida, alturaReducida, expandido]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,

        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 6,

        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy < -35) setExpandido(true);
          if (gesture.dy > 35) setExpandido(false);
        },
      }),
    [],
  );

  const opciones =
    selector === "comuna"
      ? ["Sin filtro", ...COMUNAS]
      : RANGOS_HORARIOS;

  const seleccionado =
    selector === "comuna"
      ? comuna ?? "Sin filtro"
      : horario;

  const elegirOpcion = (value: string) => {
    if (selector === "comuna") {
      onComuna(value === "Sin filtro" ? null : value);
    } else if (selector === "horario") {
      onHorario(value);
    }

    setSelector(null);
  };

  const ejecutarBusquedaDireccion = async () => {
    if (consultaDireccion.trim().length < 3 || buscandoDireccion) {
      return;
    }

    setBuscandoDireccion(true);
    setErrorDireccion(null);
    setResultadosDireccion([]);

    try {
      const resultados = await onBuscarDireccion(
        consultaDireccion.trim(),
        destinoDireccion,
      );

      setResultadosDireccion(resultados);

      if (!resultados.length) {
        setErrorDireccion(
          "No se encontraron direcciones dentro de 4 km del punto de referencia.",
        );
      }
    } catch (reason) {
      setErrorDireccion(
        reason instanceof Error
          ? reason.message
          : "No fue posible buscar la dirección.",
      );
    } finally {
      setBuscandoDireccion(false);
    }
  };

  const abrirBusqueda = (tipo: DestinoRuta) => {
    setDestinoDireccion(tipo);
    setConsultaDireccion("");
    setResultadosDireccion([]);
    setErrorDireccion(null);
    setDireccionAbierta(true);
  };

  const filtro = (
    label: string,
    value: string,
    onPress: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.filterButton}
    >
      <Text style={styles.filterLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.filterValue}>
        {value}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: alturaPanel,
          bottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.dragArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expandido ? "Contraer panel" : "Expandir panel"
          }
          onPress={() => setExpandido((value) => !value)}
          style={styles.dragPressable}
        >
          <View style={styles.dragHandle} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>
              PLANIFICADOR PEATONAL
            </Text>

            <Text style={styles.title}>
              Tu ruta, más segura.
            </Text>

            <Text style={styles.subtitle}>
              Elige tu destino y encuentra un camino acorde a tus preferencias.
            </Text>
          </View>

          {(origen || destino) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar origen y destino"
              onPress={onCambiarPuntos}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.pointsCard}>
          <View style={styles.pointRow}>
            <View style={styles.pointRail}>
              <View style={styles.originDot} />
              <View style={styles.railLine} />
              <View style={styles.destinationDot} />
            </View>

            <View style={styles.pointActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: modoSeleccion === "origen",
                }}
                onPress={onElegirOrigen}
                style={[
                  styles.pointInput,
                  modoSeleccion === "origen" &&
                    styles.pointInputActive,
                ]}
              >
                <View style={styles.pointInputCopy}>
                  <Text style={styles.pointLabel}>ORIGEN</Text>

                  <Text
                    style={styles.pointValue}
                    numberOfLines={1}
                  >
                    {origen
                      ? "Punto de origen seleccionado"
                      : "Seleccionar en el mapa"}
                  </Text>
                </View>

                <Text style={styles.pointActionGlyph}>⌖</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: modoSeleccion === "destino",
                  disabled: !origen,
                }}
                disabled={!origen}
                onPress={onElegirDestino}
                style={[
                  styles.pointInput,
                  modoSeleccion === "destino" &&
                    styles.pointInputActive,
                  !origen && styles.pointInputDisabled,
                ]}
              >
                <View style={styles.pointInputCopy}>
                  <Text style={styles.pointLabel}>DESTINO</Text>

                  <Text
                    style={styles.pointValue}
                    numberOfLines={1}
                  >
                    {destino
                      ? "Punto de destino seleccionado"
                      : origen
                        ? "Seleccionar en el mapa"
                        : "Primero selecciona un origen"}
                  </Text>
                </View>

                <Text style={styles.pointActionGlyph}>⌖</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.secondaryActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                abrirBusqueda(origen ? "destino" : "origen")
              }
              style={styles.addressButton}
            >
              <Text style={styles.addressButtonGlyph}>⌕</Text>
              <Text style={styles.addressButtonText}>
                Buscar por dirección
              </Text>
            </Pressable>
          </View>
        </View>

        {(zonaOrigenMensaje || zonaDestinoMensaje) && (
          <View style={styles.zoneNotice}>
            {!!zonaOrigenMensaje && (
              <Text style={styles.zoneNoticeText}>
                {zonaOrigenMensaje}
              </Text>
            )}

            {!!zonaDestinoMensaje && (
              <Text style={styles.zoneNoticeText}>
                {zonaDestinoMensaje}
              </Text>
            )}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          disabled={cargandoUbicacion}
          onPress={onSolicitarUbicacion}
          style={[
            styles.locationAction,
            cargandoUbicacion && styles.pointInputDisabled,
          ]}
        >
          <Text style={styles.locationGlyph}>◎</Text>

          <Text style={styles.locationActionText}>
            {cargandoUbicacion
              ? "Obteniendo ubicación…"
              : "Usar mi ubicación actual"}
          </Text>

          <Text style={styles.locationArrow}>→</Text>
        </Pressable>

        <View style={styles.preferencesHeader}>
          <Text style={styles.preferencesTitle}>
            Preferencias
          </Text>

          <Text style={styles.preferencesHint}>
            Ajusta el contexto del recorrido
          </Text>
        </View>

        <View style={styles.filtersRow}>
          {filtro("COMUNA", comuna ?? "Todas", () =>
            setSelector("comuna")
          )}

          {filtro("HORARIO", horario, () =>
            setSelector("horario")
          )}
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.filterLabel}>
            PREFERENCIA DE RUTA
          </Text>

          <View style={styles.profileOptions}>
            {PERFILES.map((perfil) => {
              const activo = perfilRuta === perfil.value;

              return (
                <Pressable
                  key={perfil.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  onPress={() => onPerfilRuta(perfil.value)}
                  style={[
                    styles.profileButton,
                    activo && styles.profileButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.profileButtonText,
                      activo && styles.profileButtonTextActive,
                    ]}
                  >
                    {perfil.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!!instruccionRuta && (
          <Text style={styles.instruction}>
            {modoSeleccion === "origen" ||
            modoSeleccion === "destino"
              ? "◉ "
              : ""}
            {instruccionRuta}
          </Text>
        )}

        {!!estadoUbicacion && (
          <Text style={styles.statusText}>
            {estadoUbicacion}
          </Text>
        )}

        {!!error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        {cargando && (
          <Text style={styles.statusText}>
            Actualizando información del mapa…
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: !origen || !destino,
          }}
          disabled={!origen || !destino}
          onPress={() => setExpandido(true)}
          style={[
            styles.primaryButton,
            (!origen || !destino) &&
              styles.primaryButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonGlyph}>✦</Text>

          <Text style={styles.primaryButtonText}>
            {origen && destino
              ? "Ver rutas seguras"
              : "Selecciona origen y destino"}
          </Text>

          <Text style={styles.primaryButtonArrow}>→</Text>
        </Pressable>

        {children}
      </ScrollView>

      <Modal
        visible={selector !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelector(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setSelector(null)}
        >
          <Pressable
            style={styles.modal}
            onPress={() => undefined}
          >
            <Text style={styles.modalTitle}>
              {selector === "comuna"
                ? "Seleccionar comuna"
                : "Filtrar por horario"}
            </Text>

            {opciones.map((opcion) => (
              <Pressable
                key={opcion}
                accessibilityRole="button"
                accessibilityState={{
                  selected: seleccionado === opcion,
                }}
                style={[
                  styles.option,
                  seleccionado === opcion &&
                    styles.selectedOption,
                ]}
                onPress={() => elegirOpcion(opcion)}
              >
                <Text style={styles.optionText}>
                  {opcion}
                </Text>

                {seleccionado === opcion && (
                  <Text style={styles.check}>✓</Text>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={direccionAbierta}
        transparent
        animationType="fade"
        onRequestClose={() => setDireccionAbierta(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalEyebrow}>
              BUSCAR UBICACIÓN
            </Text>

            <Text style={styles.modalTitle}>
              ¿Qué punto quieres buscar?
            </Text>

            <View style={styles.targetRow}>
              {(["origen", "destino"] as DestinoRuta[]).map(
                (punto) => (
                  <Pressable
                    key={punto}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: destinoDireccion === punto,
                    }}
                    onPress={() => setDestinoDireccion(punto)}
                    style={[
                      styles.targetButton,
                      destinoDireccion === punto &&
                        styles.targetButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.targetButtonText,
                        destinoDireccion === punto &&
                          styles.targetButtonTextActive,
                      ]}
                    >
                      {punto === "origen" ? "Origen" : "Destino"}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <TextInput
              value={consultaDireccion}
              onChangeText={setConsultaDireccion}
              placeholder="Calle, número y comuna"
              placeholderTextColor="#94A39C"
              accessibilityLabel="Dirección para buscar"
              returnKeyType="search"
              onSubmitEditing={ejecutarBusquedaDireccion}
              style={styles.addressInput}
            />

            <Pressable
              accessibilityRole="button"
              disabled={
                buscandoDireccion ||
                consultaDireccion.trim().length < 3
              }
              onPress={ejecutarBusquedaDireccion}
              style={[
                styles.searchButton,
                (buscandoDireccion ||
                  consultaDireccion.trim().length < 3) &&
                  styles.searchButtonDisabled,
              ]}
            >
              <Text style={styles.searchButtonText}>
                {buscandoDireccion
                  ? "Buscando…"
                  : "Buscar dirección"}
              </Text>
            </Pressable>

            {!!errorDireccion && (
              <Text style={styles.errorText}>
                {errorDireccion}
              </Text>
            )}

            <ScrollView
              style={styles.addressResults}
              keyboardShouldPersistTaps="handled"
            >
              {resultadosDireccion.map((resultado, index) => (
                <Pressable
                  key={`${resultado.latitud}-${resultado.longitud}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    onSeleccionarDireccion(
                      destinoDireccion,
                      resultado,
                    );
                    setDireccionAbierta(false);
                    setResultadosDireccion([]);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>
                    {resultado.etiqueta}
                    {resultado.distanciaMetros !== undefined
                      ? ` · ${
                          resultado.distanciaMetros >= 1000
                            ? `${(
                                resultado.distanciaMetros / 1000
                              ).toFixed(1)} km`
                            : `${resultado.distanciaMetros} m`
                        } del punto de referencia`
                      : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.attribution}>
              Resultados de búsqueda: © OpenStreetMap contributors
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setDireccionAbierta(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 7,
    right: 7,
    zIndex: 15,
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFEFA",
    elevation: 18,
    shadowColor: "#102F28",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
  },
  dragArea: {
    height: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  dragPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#D5D4CB",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 17,
    paddingTop: 4,
    paddingBottom: 26,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  headingCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: "#E56B4D",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "#173F39",
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
  },
  subtitle: {
    maxWidth: 300,
    color: "#83918A",
    fontSize: 11,
    lineHeight: 16,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0E9",
  },
  clearButtonText: {
    color: "#72817B",
    fontSize: 24,
    lineHeight: 26,
  },
  pointsCard: {
    padding: 12,
    borderRadius: 17,
    backgroundColor: "#F7F7F1",
    borderWidth: 1,
    borderColor: "#ECEDE5",
  },
  pointRow: {
    flexDirection: "row",
    gap: 10,
  },
  pointRail: {
    width: 12,
    alignItems: "center",
    paddingTop: 23,
    paddingBottom: 22,
  },
  originDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#159477",
    backgroundColor: "#FFFFFF",
  },
  railLine: {
    width: 1,
    flex: 1,
    minHeight: 38,
    backgroundColor: "#D0D9D3",
  },
  destinationDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ED7356",
    backgroundColor: "#FFFFFF",
  },
  pointActions: {
    flex: 1,
    gap: 8,
  },
  pointInput: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E5DF",
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  pointInputActive: {
    borderColor: "#4F9E88",
    backgroundColor: "#F3FAF6",
  },
  pointInputDisabled: {
    opacity: 0.58,
  },
  pointInputCopy: {
    flex: 1,
    gap: 4,
  },
  pointLabel: {
    color: "#89958E",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  pointValue: {
    color: "#314B42",
    fontSize: 12,
    fontWeight: "600",
  },
  pointActionGlyph: {
    color: "#6C8D7F",
    fontSize: 22,
    fontWeight: "700",
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  addressButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#EAF3EF",
  },
  addressButtonGlyph: {
    color: "#237B67",
    fontSize: 17,
    fontWeight: "800",
  },
  addressButtonText: {
    color: "#237B67",
    fontSize: 10,
    fontWeight: "800",
  },
  zoneNotice: {
    marginTop: 9,
    padding: 9,
    borderRadius: 11,
    backgroundColor: "#FFF7E9",
    gap: 3,
  },
  zoneNoticeText: {
    color: "#92672D",
    fontSize: 10,
    lineHeight: 14,
  },
  locationAction: {
    minHeight: 42,
    marginTop: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#E7F3EE",
    borderWidth: 1,
    borderColor: "#D0E7DC",
  },
  locationGlyph: {
    color: "#177A65",
    fontSize: 20,
    fontWeight: "800",
  },
  locationActionText: {
    flex: 1,
    color: "#227E68",
    fontSize: 11,
    fontWeight: "800",
  },
  locationArrow: {
    color: "#227E68",
    fontSize: 19,
    fontWeight: "700",
  },
  preferencesHeader: {
    marginTop: 17,
    marginBottom: 8,
    gap: 2,
  },
  preferencesTitle: {
    color: "#344D43",
    fontSize: 12,
    fontWeight: "900",
  },
  preferencesHint: {
    color: "#97A29C",
    fontSize: 9,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "#F5F6F1",
    borderWidth: 1,
    borderColor: "#E8EBE4",
    gap: 4,
  },
  filterLabel: {
    color: "#93A099",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  filterValue: {
    color: "#455E53",
    fontSize: 10,
    fontWeight: "700",
  },
  profileSection: {
    marginTop: 11,
    gap: 7,
  },
  profileOptions: {
    flexDirection: "row",
    gap: 6,
  },
  profileButton: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F0F1EB",
    borderWidth: 1,
    borderColor: "#EBECE5",
  },
  profileButtonActive: {
    backgroundColor: "#F4D65D",
    borderColor: "#F4D65D",
  },
  profileButtonText: {
    color: "#67786F",
    fontSize: 10,
    fontWeight: "700",
  },
  profileButtonTextActive: {
    color: "#4B4A30",
    fontWeight: "900",
  },
  instruction: {
    marginTop: 10,
    color: "#8A9690",
    fontSize: 10,
    lineHeight: 14,
  },
  statusText: {
    marginTop: 6,
    color: "#648276",
    fontSize: 10,
    lineHeight: 15,
  },
  errorText: {
    marginTop: 6,
    color: "#B84C3D",
    fontSize: 10,
    lineHeight: 15,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 14,
    backgroundColor: "#174B41",
    elevation: 4,
    shadowColor: "#143F36",
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryButtonDisabled: {
    backgroundColor: "#A8B8B0",
    elevation: 0,
  },
  primaryButtonGlyph: {
    color: "#D8EBCF",
    fontSize: 17,
    fontWeight: "800",
  },
  primaryButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  primaryButtonArrow: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(12,30,25,0.42)",
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFFEFA",
    elevation: 16,
  },
  modalEyebrow: {
    color: "#16836C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalTitle: {
    color: "#173F39",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  option: {
    minHeight: 47,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4EAE5",
  },
  selectedOption: {
    backgroundColor: "#EDF6F1",
  },
  optionText: {
    flex: 1,
    color: "#344E43",
    fontSize: 13,
  },
  check: {
    color: "#16836C",
    fontWeight: "900",
    fontSize: 17,
  },
  targetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 9,
  },
  targetButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DCE5DE",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  targetButtonActive: {
    backgroundColor: "#174B41",
    borderColor: "#174B41",
  },
  targetButtonText: {
    color: "#4B6558",
    fontWeight: "700",
    fontSize: 12,
  },
  targetButtonTextActive: {
    color: "#FFFFFF",
  },
  addressInput: {
    minHeight: 46,
    color: "#263F35",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5DE",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
  },
  searchButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#174B41",
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  addressResults: {
    maxHeight: 220,
    marginTop: 6,
  },
  attribution: {
    marginTop: 6,
    color: "#8A9991",
    fontSize: 9,
  },
  cancelButton: {
    alignSelf: "flex-end",
    padding: 10,
  },
  cancelText: {
    color: "#177A65",
    fontSize: 12,
    fontWeight: "800",
  },
});