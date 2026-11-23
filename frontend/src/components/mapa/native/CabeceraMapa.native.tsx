import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CabeceraMapa() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>RS</Text>
      </View>
      <View style={styles.brandCopy}>
        <Text style={styles.brandName}>
          <Text style={styles.brandRuta}>Ruta</Text>
          <Text style={styles.brandSegura}>Segura</Text>
        </Text>
        <Text style={styles.tagline}>
          Camina informado, desplázate seguro
        </Text>
      </View>
      <View style={styles.statusPill}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>PEATONAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 20,
    minHeight: 62,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#123F3A",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 8,
    shadowColor: "#0B2925",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#F3D45B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.82)",
  },
  brandMarkText: {
    color: "#123F3A",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  brandRuta: {
    color: "#FFFFFF",
  },
  brandSegura: {
    color: "#A7E3C6",
  },
  tagline: {
    color: "#C5DED7",
    fontSize: 9,
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#A7E3C6",
  },
  statusText: {
    color: "#E5F5EF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});