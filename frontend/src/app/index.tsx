import { useState } from "react";
import {
  StyleSheet,
  View,
} from "react-native";

import MapaRiesgo, {
  type PerfilRuta,
} from "../components/mapa/native/MapaRiesgo.native";

import PantallaInicio from "../components/mapa/PantallaInicio.native";

export default function HomeScreen() {
  const [perfilInicial, setPerfilInicial] =
    useState<PerfilRuta | null>(null);

  const omitirSeleccion = () => {
    setPerfilInicial("menor_riesgo");
  };

  if (perfilInicial === null) {
    return (
      <PantallaInicio
        onContinuar={setPerfilInicial}
        onOmitir={omitirSeleccion}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MapaRiesgo perfilInicial={perfilInicial} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});