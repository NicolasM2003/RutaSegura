import { StyleSheet, View } from "react-native";
import MapaRiesgo from "../components/mapa/MapaRiesgo";
import "leaflet/dist/leaflet.css";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <MapaRiesgo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});