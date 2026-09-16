import {
  StyleSheet,
  View,
} from "react-native";

import MapaRiesgo from "../components/mapa/native/MapaRiesgo.native";

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