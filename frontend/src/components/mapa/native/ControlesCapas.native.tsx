import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  zonas: boolean;
  onZonas: () => void;
  concentraciones: boolean;
  onConcentraciones: () => void;
  delitos: boolean;
  onDelitos: () => void;
  red: boolean;
  onRed: () => void;
  comuna: string | null;
  zoom: number;
  cargandoUbicacion: boolean;
  onSolicitarUbicacion: () => void;
};

type CapaProps = {
  titulo: string;
  descripcion: string;
  valor: boolean;
  onCambiar: () => void;
};

function OpcionCapa({
  titulo,
  descripcion,
  valor,
  onCambiar,
}: CapaProps) {
  return (
    <View style={styles.layerRow}>
      <View style={styles.layerCopy}>
        <Text style={styles.layerTitle}>{titulo}</Text>
        <Text style={styles.layerDescription}>{descripcion}</Text>
      </View>

      <Switch
        value={valor}
        onValueChange={onCambiar}
        trackColor={{ false: "#D7DFDC", true: "#9BD8C2" }}
        thumbColor={valor ? "#147B61" : "#F7F9F8"}
      />
    </View>
  );
}

export default function ControlesCapas({
  zonas,
  onZonas,
  concentraciones,
  onConcentraciones,
  delitos,
  onDelitos,
  red,
  onRed,
  comuna,
  zoom,
  cargandoUbicacion,
  onSolicitarUbicacion,
}: Props) {
  const insets = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* BARRA INFERIOR */}
      <View
  style={[
    styles.floatingActions,
    { top: insets.top + 78 },
  ]}
>
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Usar mi ubicación actual"
    disabled={cargandoUbicacion}
    onPress={onSolicitarUbicacion}
    style={({ pressed }) => [
      styles.floatingButton,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.locationGlyph}>
      {cargandoUbicacion ? "…" : "◎"}
    </Text>
  </Pressable>

  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Configurar capas del mapa"
    onPress={() => setAbierto(true)}
    style={({ pressed }) => [
      styles.floatingButton,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.layersGlyph}>▱</Text>
  </Pressable>
</View>

      {/* MODAL DE CAPAS */}
      <Modal
        visible={abierto}
        transparent
        animationType="fade"
        onRequestClose={() => setAbierto(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setAbierto(false)}
        >
          <Pressable
            style={styles.modal}
            onPress={() => undefined}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  PERSONALIZA EL MAPA
                </Text>

                <Text style={styles.modalTitle}>
                  Capas de información
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar capas"
                onPress={() => setAbierto(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <OpcionCapa
              titulo="Zonas de riesgo"
              descripcion="Áreas identificadas según el nivel de riesgo"
              valor={zonas}
              onCambiar={onZonas}
            />

            <OpcionCapa
              titulo="Concentración de delitos"
              descripcion="Agrupaciones por coordenadas reportadas"
              valor={concentraciones}
              onCambiar={onConcentraciones}
            />

            <OpcionCapa
              titulo="Delitos individuales"
              descripcion="Registros individuales en el mapa"
              valor={delitos}
              onCambiar={onDelitos}
            />

            <OpcionCapa
              titulo="Red peatonal"
              descripcion="Tramos de circulación peatonal disponibles"
              valor={red}
              onCambiar={onRed}
            />

            {red && (!comuna || zoom < 12) && (
              <Text style={styles.notice}>
                {!comuna
                  ? "Selecciona una comuna para cargar la red peatonal."
                  : "Acerca el mapa para visualizar la red peatonal."}
              </Text>
            )}

            {delitos && zoom < 13 && (
              <Text style={styles.notice}>
                Acerca el mapa hasta el nivel 13 para ver los delitos individuales.
              </Text>
            )}

            <View style={styles.legend}>
              <Text style={styles.legendTitle}>
                Concentración de delitos
              </Text>

              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: "#16A34A" }]} />
                <Text style={styles.legendText}>1 delito: verde</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: "#FACC15" }]} />
                <Text style={styles.legendText}>2 delitos: amarillo</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: "#DC2626" }]} />
                <Text style={styles.legendText}>3 o más delitos: rojo</Text>
              </View>

              <Text style={styles.legendNote}>
                La cantidad de registros define el color; el puntaje de riesgo se calcula por separado.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setAbierto(false)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Listo</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingActions: {
  position: "absolute",
  right: 13,
  zIndex: 30,
  flexDirection: "column",
  alignItems: "center",
  gap: 9,
},
floatingButton: {
  width: 46,
  height: 46,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#DCE8E0",
  elevation: 8,
  shadowColor: "#173D35",
  shadowOpacity: 0.14,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 3 },
},
  dockButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: "#F1F6F2",
  },
  dockLabel: {
    color: "#174B41",
    fontSize: 11,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  locationGlyph: {
    color: "#174B41",
    fontSize: 22,
    fontWeight: "700",
  },
  layersGlyph: {
    color: "#174B41",
    fontSize: 24,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(8,24,21,0.42)",
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#FFFFFF",
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalEyebrow: {
    color: "#16836C",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  modalTitle: {
    marginTop: 3,
    color: "#173D35",
    fontSize: 20,
    fontWeight: "800",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F3F1",
  },
  closeText: {
    color: "#52655F",
    fontSize: 25,
    lineHeight: 27,
  },
  layerRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6ECE9",
    gap: 12,
  },
  layerCopy: {
    flex: 1,
    gap: 3,
  },
  layerTitle: {
    color: "#203D35",
    fontSize: 14,
    fontWeight: "700",
  },
  layerDescription: {
    color: "#73837D",
    fontSize: 11,
    lineHeight: 15,
  },
  notice: {
    color: "#976221",
    backgroundColor: "#FFF7E6",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
  },
  legend: {
    backgroundColor: "#F5F8F6",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },
  legendTitle: {
    color: "#203D35",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: "#52655F",
    fontSize: 11,
  },
  legendNote: {
    marginTop: 3,
    color: "#7A8983",
    fontSize: 10,
    lineHeight: 14,
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#174B41",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});