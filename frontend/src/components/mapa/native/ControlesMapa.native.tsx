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
  infoMapa?: ReactNode;
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
  cargandoRuta: boolean;
  resultadoDisponible: boolean;
  error: string | null;
  estadoUbicacion: string | null;
  cargandoUbicacion: boolean;
  // Se conserva para compatibilidad con el padre; la acción vive en ControlesCapas.
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

type Selector = "comuna" | "horario" | "perfil" | null;

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
  cargandoRuta,
  resultadoDisponible,
  infoMapa,
  error,
  estadoUbicacion,
  cargandoUbicacion,
  zonaOrigenMensaje,
  zonaDestinoMensaje,
  onBuscarDireccion,
  onSeleccionarDireccion,
  children,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const modoResultados = Boolean(origen && destino);

const [expandido, setExpandido] = useState(false);
const alturaPanel = useRef(new Animated.Value(104)).current;

const [selector, setSelector] = useState<Selector>(null);
const [direccionAbierta, setDireccionAbierta] = useState(false);
const [destinoDireccion, setDestinoDireccion] =
  useState<DestinoRuta>("origen");

const [consultaDireccion, setConsultaDireccion] = useState("");
const [resultadosDireccion, setResultadosDireccion] =
  useState<ResultadoDireccion[]>([]);

const [buscandoDireccion, setBuscandoDireccion] = useState(false);
const [errorDireccion, setErrorDireccion] = useState<string | null>(null);

// Los accesos de ubicación y capas están arriba; solo reservamos el área del sistema.
const bottomDock = 0;

// Altura disponible para el planificador abierto.
const alturaPlanificador = Math.min(
  Math.max(height * 0.62, 350),
  Math.max(height - insets.top - bottomDock - 12, 350),
);

// La vista de resultados ocupa casi toda la pantalla.
// El panel de resultados ocupa aproximadamente el 62%
// de la pantalla, dejando más mapa visible en la parte superior.
const alturaMaximaResultados = Math.max(
  height - insets.top - insets.bottom - 18,
  300,
);

const alturaExpandida = modoResultados
  ? Math.min(
      Math.max(height * 0.46, 500),
      Math.max(height - insets.top - insets.bottom - 18, 350),
    )
  : alturaPlanificador;

// Al tener ambos puntos, mostrar automáticamente el resultado.
// También contempla respuestas de error.
useEffect(() => {
  if (!modoResultados) {
    setExpandido(false);
    return;
  }

  if (cargandoRuta || resultadoDisponible) {
    setExpandido(true);
  }
}, [modoResultados, cargandoRuta, resultadoDisponible]);

// Al seleccionar origen o destino, liberar el mapa automáticamente.
useEffect(() => {
  if (modoSeleccion !== null && !modoResultados) {
    setExpandido(false);
  }
}, [modoSeleccion, modoResultados]);

const bottomPanel =
  modoResultados && expandido
    ? 0
    : bottomDock;

useEffect(() => {
  Animated.spring(alturaPanel, {
    toValue: expandido ? alturaExpandida : 104,
    useNativeDriver: false,
    damping: 24,
    stiffness: 170,
    mass: 0.9,
  }).start();
}, [alturaPanel, alturaExpandida, expandido]);

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
      : selector === "perfil"
        ? PERFILES.map((perfil) => perfil.label)
        : RANGOS_HORARIOS;

  const seleccionado =
    selector === "comuna"
      ? comuna ?? "Sin filtro"
      : selector === "perfil"
        ? PERFILES.find((p) => p.value === perfilRuta)?.label ?? "Más segura"
        : horario;

  const elegirOpcion = (value: string) => {
    if (selector === "comuna") {
      onComuna(value === "Sin filtro" ? null : value);
    } else if (selector === "horario") {
      onHorario(value);
    } else if (selector === "perfil") {
      const perfil = PERFILES.find((p) => p.label === value);
      if (perfil) onPerfilRuta(perfil.value);
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

  const handleNuevaRuta = () => {
    setExpandido(false);
    setSelector(null);
    setDireccionAbierta(false);
    setConsultaDireccion("");
    setResultadosDireccion([]);
    setErrorDireccion(null);
    onCambiarPuntos();
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

  const estadoContraido = modoResultados
  ? cargandoRuta
    ? {
        eyebrow: "CALCULANDO",
        titulo: "Buscando tu ruta",
        descripcion: "Estamos comparando los recorridos disponibles.",
      }
    : {
        eyebrow: "TU RECORRIDO",
        titulo: "Tu ruta está lista",
        descripcion: "Toca para consultar el resultado y sus alternativas.",
      }
  : modoSeleccion === "origen"
    ? {
        eyebrow: "SELECCIONA EN EL MAPA",
        titulo: "Marca el origen",
        descripcion: "Toca el mapa para indicar dónde comienza tu recorrido.",
      }
    : modoSeleccion === "destino"
      ? {
          eyebrow: "SELECCIONA EN EL MAPA",
          titulo: "Marca el destino",
          descripcion: "Toca el mapa para completar tu recorrido.",
        }
      : origen
        ? {
            eyebrow: "PLANIFICADOR PEATONAL",
            titulo: "Origen seleccionado",
            descripcion: "Abre el planificador para cambiar los puntos.",
          }
        : {
            eyebrow: "PLANIFICADOR PEATONAL",
            titulo: "¿A dónde quieres ir?",
            descripcion: "Toca aquí para planificar tu recorrido.",
          };

  if (!expandido) {
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.collapsedContainer,
        {
          bottom: bottomDock,
        },
      ]}
    >
      {infoMapa && (
        <View style={styles.collapsedInfo}>
          {infoMapa}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir planificador de ruta"
        onPress={() => setExpandido(true)}
        style={styles.collapsedPlanner}
      >
        <View style={styles.collapsedCopy}>
          <Text numberOfLines={1} style={styles.eyebrow}>
            {estadoContraido.eyebrow}
          </Text>

          <Text numberOfLines={1} style={styles.collapsedTitle}>
            {estadoContraido.titulo}
          </Text>

          <Text numberOfLines={1} style={styles.collapsedSubtitle}>
            {estadoContraido.descripcion}
          </Text>
        </View>

        <Text style={styles.collapsedArrow}>⌃</Text>
              </Pressable>
            </View>
          );
        }

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: alturaPanel,
          bottom: bottomPanel,
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.dragArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expandido ? "Contraer panel" : "Expandir panel"
          }
          onPress={() => setExpandido(false)}
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
        {infoMapa && (
          <View style={styles.expandedMapInfo}>
            {infoMapa}
          </View>
        )}
        {!modoResultados && (
          <>
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

        {cargandoUbicacion && (
          <Text style={styles.statusText}>Obteniendo ubicación actual…</Text>
        )}

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

          <Pressable
            accessibilityRole="button"
            onPress={() => setSelector("perfil")}
            style={styles.profileSelected}
          >
            <View style={styles.profileSelectedIndicator}>
              <Text style={styles.profileSelectedCheck}>✓</Text>
            </View>

            <View style={styles.profileSelectedCopy}>
              <Text style={styles.profileSelectedLabel}>
                Ruta seleccionada
              </Text>

              <Text style={styles.profileSelectedValue}>
                {PERFILES.find((p) => p.value === perfilRuta)?.label ?? "Más segura"}
              </Text>
            </View>

            <Text style={styles.profileSelectedAction}>
              Cambiar⌄
            </Text>
          </Pressable>
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


          </>
        )}
        
        {modoResultados && (
          <>
            <View style={styles.resultModeHeader}>
              <View style={styles.resultModeCopy}>
                <Text style={styles.resultModeEyebrow}>RECORRIDO ACTUAL</Text>
                <Text style={styles.resultModeTitle}>Tu ruta</Text>
                <Text style={styles.resultModeSubtitle}>
                  {PERFILES.find((perfil) => perfil.value === perfilRuta)?.label ?? "Más segura"}
                  {" · "}Selecciona una alternativa para verla en el mapa.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Eliminar ruta y comenzar una nueva"
                onPress={handleNuevaRuta}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.resetButtonPressed,
                ]}
              >
                <Text style={styles.resetButtonGlyph}>↻</Text>
                <Text style={styles.resetButtonText}>Nueva ruta</Text>
              </Pressable>
            </View>

            {children}
          </>
        )}
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
                : selector === "perfil"
                  ? "Seleccionar preferencia de ruta"
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
    zIndex: 35,
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFEFA",
    elevation: 28,
    shadowColor: "#102F28",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
  },
  collapsedPlanner: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    padding: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3EAE4",
    backgroundColor: "#DFEBE4",
    elevation: 16,
    shadowColor: "#102F28",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  collapsedCopy: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  collapsedContainer: {
    position: "absolute",
    left: 10,
    right: 10,
    zIndex: 25,
    gap: 10,
  },
  collapsedInfo: {
    width: "100%",
  },
  expandedMapInfo: {
    width: "100%",
    marginBottom: 12,
  },
  collapsedTitle: {
    color: "#173F39",
    fontSize: 15,
    fontWeight: "900",
  },
  collapsedSubtitle: {
    color: "#83918A",
    fontSize: 11,
  },
  collapsedArrow: {
    color: "#008748",
    fontSize: 23,
    fontWeight: "900",
    paddingHorizontal: 10,
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
    paddingBottom: 18,
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
  profileSelected: {
    minHeight: 53,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8E0",
    borderRadius: 13,
  },
profileSelectedIndicator: {
  width: 30,
  height: 30,
  borderRadius: 10,
  backgroundColor: "#E4F2EB",
  alignItems: "center",
  justifyContent: "center",
},
profileSelectedCheck: {
  color: "#008748",
  fontSize: 16,
  fontWeight: "900",
},
profileSelectedCopy: {
  flex: 1,
  gap: 2,
},
profileSelectedLabel: {
  color: "#89968F",
  fontSize: 9,
  fontWeight: "700",
},

profileSelectedValue: {
  color: "#173F39",
  fontSize: 12,
  fontWeight: "900",
},

  profileSelectedAction: {
    color: "#008748",
    fontSize: 10,
    fontWeight: "800",
  },
  resultModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 3,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEEB",
  },
  resultModeCopy: {
    flex: 1,
    gap: 3,
  },
  resultModeEyebrow: {
    color: "#16836C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  resultModeTitle: {
    color: "#173F39",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },
  resultModeSubtitle: {
    color: "#819087",
    fontSize: 10,
    lineHeight: 15,
  },
  resetButton: {
    minHeight: 40,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    backgroundColor: "#FCEFEB",
    borderWidth: 1,
    borderColor: "#F3D6CF",
  },
  resetButtonPressed: {
    opacity: 0.72,
  },
  resetButtonGlyph: {
    color: "#B84C3D",
    fontSize: 16,
    fontWeight: "900",
  },
  resetButtonText: {
    color: "#B84C3D",
    fontSize: 10,
    fontWeight: "900",
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
