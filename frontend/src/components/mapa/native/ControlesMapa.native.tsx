import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { DestinoRuta, ResultadoDireccion } from "../direccion";

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
  onSolicitarUbicacion: () => void;
  cargandoUbicacion: boolean;
  estadoUbicacion: string | null;
  onBuscarDireccion: (consulta: string, destino: DestinoRuta) => Promise<ResultadoDireccion[]>;
  onSeleccionarDireccion: (destino: DestinoRuta, resultado: ResultadoDireccion) => void;
};

export default function ControlesMapa({
  origen, destino, modoSeleccion, instruccionRuta,
  onElegirOrigen, onElegirDestino, onCambiarPuntos,
  comuna, onComuna, horario, onHorario, zonas, onZonas,
  delitos, onDelitos, red, onRed, cargando, error, zoom,
  onSolicitarUbicacion, cargandoUbicacion, estadoUbicacion,
  onBuscarDireccion, onSeleccionarDireccion,
}: Props) {
  const [selector, setSelector] = useState<"comuna" | "horario" | null>(null);
  const [direccionAbierta, setDireccionAbierta] = useState(false);
  const [destinoDireccion, setDestinoDireccion] = useState<DestinoRuta>("origen");
  const [consultaDireccion, setConsultaDireccion] = useState("");
  const [resultadosDireccion, setResultadosDireccion] = useState<ResultadoDireccion[]>([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState<string | null>(null);
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
        <Pressable accessibilityRole="button" onPress={() => { setDireccionAbierta(true); setErrorDireccion(null); }} style={styles.routeChip}>
          <Text style={styles.chipText}>Por dirección</Text>
        </Pressable>
      </View>
      <View style={[styles.row, { justifyContent: "flex-end" }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Obtener y centrar mi ubicación"
          accessibilityState={{ disabled: cargandoUbicacion }}
          disabled={cargandoUbicacion}
          onPress={onSolicitarUbicacion}
          style={[styles.locationChip, cargandoUbicacion && styles.disabledChip]}
        >
          <Text style={styles.locationText}>{cargandoUbicacion ? "Obteniendo…" : "Mi ubicación"}</Text>
        </Pressable>
      </View>
      <Text style={styles.routeHint}>{instruccionRuta}</Text>
      {!!estadoUbicacion && <Text accessibilityLiveRegion="polite" style={styles.status}>{estadoUbicacion}</Text>}
      {(cargando || error || (red && zoom < 12) || (delitos && zoom < 13)) &&
        <Text style={[styles.status, !!error && styles.error]}>
          {error ?? (cargando ? "Actualizando capas…" : red && zoom < 12 ? "Acerca el mapa para cargar la red peatonal" : "Acerca el mapa (zoom 13) para ver delitos")}
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
    <Modal visible={direccionAbierta} transparent animationType="fade" onRequestClose={() => setDireccionAbierta(false)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Ubicación de la ruta</Text>
          <View style={styles.row}>
            {(["origen", "destino"] as DestinoRuta[]).map((punto) => <Pressable key={punto}
              accessibilityRole="button" accessibilityState={{ selected: destinoDireccion === punto }}
              onPress={() => setDestinoDireccion(punto)} style={[styles.targetChip, destinoDireccion === punto && styles.originChip]}>
              <Text style={[styles.chipText, destinoDireccion === punto && styles.activeText]}>{punto === "origen" ? "Origen" : "Destino"}</Text>
            </Pressable>)}
          </View>
          <TextInput value={consultaDireccion} onChangeText={setConsultaDireccion} placeholder="Calle, número y comuna"
            accessibilityLabel="Dirección para buscar" returnKeyType="search" onSubmitEditing={async () => {
              setBuscandoDireccion(true); setErrorDireccion(null); setResultadosDireccion([]);
              try { const resultados = await onBuscarDireccion(consultaDireccion, destinoDireccion); setResultadosDireccion(resultados); if (!resultados.length) setErrorDireccion("No se encontraron direcciones dentro de 4 km del punto de referencia."); }
              catch (reason) { setErrorDireccion(reason instanceof Error ? reason.message : "No fue posible buscar la dirección."); }
              finally { setBuscandoDireccion(false); }
            }} style={styles.addressInput} />
          <Pressable accessibilityRole="button" disabled={buscandoDireccion || consultaDireccion.trim().length < 3}
            onPress={async () => {
              setBuscandoDireccion(true); setErrorDireccion(null); setResultadosDireccion([]);
              try { const resultados = await onBuscarDireccion(consultaDireccion, destinoDireccion); setResultadosDireccion(resultados); if (!resultados.length) setErrorDireccion("No se encontraron direcciones dentro de 4 km del punto de referencia."); }
              catch (reason) { setErrorDireccion(reason instanceof Error ? reason.message : "No fue posible buscar la dirección."); }
              finally { setBuscandoDireccion(false); }
            }} style={[styles.searchButton, (buscandoDireccion || consultaDireccion.trim().length < 3) && styles.disabledChip]}>
            <Text style={styles.searchButtonText}>{buscandoDireccion ? "Buscando…" : "Buscar dirección"}</Text>
          </Pressable>
          {!!errorDireccion && <Text style={styles.error}>{errorDireccion}</Text>}
          <ScrollView style={styles.addressResults} keyboardShouldPersistTaps="handled">
            {resultadosDireccion.map((resultado, index) => <Pressable key={`${resultado.latitud}-${resultado.longitud}-${index}`}
              accessibilityRole="button" onPress={() => { onSeleccionarDireccion(destinoDireccion, resultado); setDireccionAbierta(false); setResultadosDireccion([]); }} style={styles.option}>
              <Text style={styles.optionText}>{resultado.etiqueta}{resultado.distanciaMetros !== undefined ? ` · ${resultado.distanciaMetros >= 1000 ? `${(resultado.distanciaMetros / 1000).toFixed(1)} km` : `${resultado.distanciaMetros} m`} del punto de referencia` : ""}</Text>
            </Pressable>)}
          </ScrollView>
          <Text style={styles.attribution}>Resultados de búsqueda: © OpenStreetMap contributors</Text>
          <Pressable accessibilityRole="button" onPress={() => setDireccionAbierta(false)} style={styles.cancelButton}><Text style={styles.resetText}>Cerrar</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 48, left: 10, right: 10, zIndex: 10 },
  panel: { backgroundColor: "rgba(255,255,255,0.96)", padding: 8, borderRadius: 12, elevation: 5, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 5 },
  chip: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  routeChip: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  targetChip: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  originChip: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  destinationChip: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  disabledChip: { opacity: 0.55 },
  disabledText: { color: "#6b7280" },
  resetChip: { paddingHorizontal: 8, paddingVertical: 8 },
  resetText: { color: "#1d4ed8", fontSize: 12, fontWeight: "700" },
  locationChip: { borderWidth: 1, borderColor: "#bae6fd", backgroundColor: "#f0f9ff", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
  locationText: { color: "#075985", fontSize: 12, fontWeight: "700" },
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
  addressInput: { color: "#111827", backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, marginVertical: 6 },
  searchButton: { backgroundColor: "#1d4ed8", borderRadius: 8, alignItems: "center", padding: 12, marginBottom: 6 },
  searchButtonText: { color: "#fff", fontWeight: "700" },
  addressResults: { maxHeight: 220 },
  attribution: { color: "#6b7280", fontSize: 10, marginTop: 6 },
  cancelButton: { alignSelf: "flex-end", padding: 10 },
  optionText: { color: "#111827", fontSize: 15 },
  check: { color: "#1d4ed8", fontWeight: "700" },
});
