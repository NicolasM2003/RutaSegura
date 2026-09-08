import { StyleSheet, Text, View } from "react-native";

export default function MapaRiesgo() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        RutaSegura
      </Text>

      <Text>
        Mapa móvil en desarrollo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
});