import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export const RANGOS_HORARIOS = [
  "00:00 - 03:59", "04:00 - 07:59", "08:00 - 11:59",
  "12:00 - 15:59", "16:00 - 19:59", "20:00 - 23:59",
];

const COMUNAS = ["Viña del Mar", "Valparaíso", "Concón"];

type Props = {
  origen: { latitud: number; longitud: number } | null;
  destino: { latitud: number; longitud: number } | null;
  modoSeleccion: "origen" | "destino" | null;
  instruccionRuta: string;
  onElegirOrigen: () => void;
  onElegirDestino: () => void;
  onCambiarPuntos: () => void;
  comuna: string | null;
  onComuna: (value: string | null) => void;
  horario: string;
  onHorario: (value: string) => void;
  zonas: boolean;
  onZonas: () => void;
  delitos: boolean;
  onDelitos: () => void;
  red: boolean;
  onRed: () => void;
  cargando: boolean;
  error: string | null;
  zoom: number;
};

export default function ControlesMapa({
  origen, destino, modoSeleccion, instruccionRuta,
  onElegirOrigen, onElegirDestino, onCambiarPuntos,
  comuna, onComuna, horario, onHorario, zonas, onZonas,
  delitos, onDelitos, red, onRed, cargando, error, zoom,
}: Props) {
  const [selector, setSelector] = useState<"comuna" | "horario" | null>(null);
  const opciones = selector === "comuna" ? ["Seleccionar comuna", ...COMUNAS] : RANGOS_HORARIOS;
  const seleccionado = selector === "comuna" ? comuna : horario;
  const elegir = (value: string) => {
    if (selector === "comuna") onComuna(value === "Seleccionar comuna" ? null : value);
    else onHorario(value);
    setSelector(null);
  };
  const chip = (label: string, active: boolean, onPress: () => void, activeColor: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
    >
      <Text style={[styles.chipText, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );

  return <View pointerEvents="box-none" style={styles.overlay}>
    <View style={styles.panel}>
      <View style={styles.row}>
        {chip(comuna ? `Comuna: ${comuna}` : "Seleccionar comuna", !!comuna, () => setSelector("comuna"), "#1d4ed8")}
        {chip(horario, true, () => setSelector("horario"), "#1d4ed8")}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chip("Zonas", zonas, onZonas, "#dc2626")}
        {chip("Delitos", delitos, onDelitos, "#111827")}
        {chip("Red peatonal", red, onRed, "#2563eb")}
      </ScrollView>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: modoSeleccion === "origen" }}
          onPress={onElegirOrigen}
          style={[styles.routeChip, (origen || modoSeleccion === "origen") && styles.originChip]}
        >
          <Text style={[styles.chipText, (origen || modoSeleccion === "origen") && styles.activeText]}>
            {origen ? "Origen listo" : "Elegir origen"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: modoSeleccion === "destino", disabled: !origen }}
          disabled={!origen}
          onPress={onElegirDestino}
          style={[styles.routeChip, destino && styles.destinationChip, !origen && styles.disabledChip]}
        >
          <Text style={[styles.chipText, destino && styles.activeText, !origen && styles.disabledText]}>
            {destino ? "Destino listo" : "Elegir destino"}
          </Text>
        </Pressable>
        {(origen || destino) && (
          <Pressable accessibilityRole="button" onPress={onCambiarPuntos} style={styles.resetChip}>
            <Text style={styles.resetText}>Cambiar</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.routeHint}>{instruccionRuta}</Text>
      {(cargando || error || (red && !comuna) || (red && zoom < 12) || (delitos && zoom < 13)) &&
        <Text style={[styles.status, !!error && styles.error]}>
          {error ?? (red && !comuna ? "Selecciona una comuna para cargar la red peatonal" : red && zoom < 12 ? "Acerca el mapa para cargar la red peatonal" : cargando ? "Actualizando capas…" : "Acerca el mapa (zoom 13) para ver delitos")}
        </Text>}
    </View>
    <Modal visible={selector !== null} transparent animationType="fade" onRequestClose={() => setSelector(null)}>
      <Pressable style={styles.backdrop} onPress={() => setSelector(null)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{selector === "comuna" ? "Seleccionar comuna" : "Filtrar por horario"}</Text>
          {opciones.map((opcion) => <Pressable
            key={opcion}
            accessibilityRole="button"
            accessibilityState={{ selected: seleccionado === opcion }}
            style={[styles.option, seleccionado === opcion && styles.selectedOption]}
            onPress={() => elegir(opcion)}
          >
            <Text style={styles.optionText}>{opcion}</Text>
            {seleccionado === opcion && <Text style={styles.check}>✓</Text>}
          </Pressable>)}
        </View>
      </Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 48, left: 10, right: 10, zIndex: 10 },
  panel: { backgroundColor: "rgba(255,255,255,0.96)", padding: 8, borderRadius: 12, elevation: 5, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 5 },
  chip: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  routeChip: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  originChip: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  destinationChip: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  disabledChip: { opacity: 0.55 },
  disabledText: { color: "#6b7280" },
  resetChip: { paddingHorizontal: 8, paddingVertical: 8 },
  resetText: { color: "#1d4ed8", fontSize: 12, fontWeight: "700" },
  chipText: { color: "#1f2937", fontSize: 12, fontWeight: "700" },
  activeText: { color: "#fff" },
  status: { paddingHorizontal: 4, paddingTop: 3, fontSize: 11, color: "#374151" },
  routeHint: { paddingHorizontal: 4, paddingBottom: 4, fontSize: 11, color: "#4b5563" },
  error: { color: "#b91c1c" },
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.35)" },
  modal: { backgroundColor: "white", borderRadius: 14, padding: 16, elevation: 12 },
  modalTitle: { color: "#111827", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  option: { paddingVertical: 13, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  selectedOption: { backgroundColor: "#eff6ff" },
  optionText: { color: "#111827", fontSize: 15 },
  check: { color: "#1d4ed8", fontWeight: "700" },
});
