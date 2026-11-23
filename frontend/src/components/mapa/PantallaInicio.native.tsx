import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PerfilRuta } from "../mapa/native/MapaRiesgo.native";

type Props = {
  onContinuar: (perfil: PerfilRuta) => void;
  onOmitir: () => void;
};

const OPCIONES = [
  {
    id: "menor_riesgo" as const,
    icono: "🛡️",
    titulo: "Más segura",
    etiqueta: "PRIORIDAD: SEGURIDAD",
    descripcion:
      "Prioriza sectores de menor riesgo, aunque el recorrido pueda ser un poco más largo.",
    color: "#16866D",
  },
  {
    id: "equilibrada" as const,
    icono: "⚖️",
    titulo: "Equilibrada",
    etiqueta: "SEGURIDAD + DISTANCIA",
    descripcion:
      "Combina seguridad y distancia para encontrar un punto medio entre protección y rapidez.",
    color: "#3978C5",
  },
  {
    id: "mas_rapida" as const,
    icono: "⚡",
    titulo: "Más rápida",
    etiqueta: "PRIORIDAD: TIEMPO",
    descripcion:
      "Prioriza recorridos más directos y cortos, aunque puedan atravesar sectores de mayor riesgo.",
    color: "#D69A28",
  },
];

export default function PantallaInicio({
  onContinuar,
  onOmitir,
}: Props) {
  const insets = useSafeAreaInsets();
  const [seleccion, setSeleccion] = useState<PerfilRuta | null>(null);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Identidad de RutaSegura */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              source={require("../../assets/images/logo-rutasegura-icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.brand}>
            <Text style={styles.brandName}>
              <Text style={styles.brandRuta}>Ruta</Text>
              <Text style={styles.brandSegura}>Segura</Text>
            </Text>
            <Text style={styles.slogan}>
              Camina informado, desplázate seguro
            </Text>
          </View>

          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>PEATONAL</Text>
          </View>
        </View>

        {/* Presentación */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>PLANIFICA TU RECORRIDO</Text>

          <Text style={styles.title}>
            ¿Qué tipo de ruta prefieres?
          </Text>

          <Text style={styles.subtitle}>
            Cada recorrido es diferente. Elige qué quieres priorizar
            y encontraremos una ruta acorde a tus preferencias.
          </Text>
        </View>

        {/* Opciones */}
        <View style={styles.options}>
          {OPCIONES.map((opcion) => {
            const activa = seleccion === opcion.id;

            return (
              <Pressable
                key={opcion.id}
                onPress={() => setSeleccion(opcion.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activa }}
                style={[
                  styles.option,
                  activa && styles.optionSelected,
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${opcion.color}18` },
                  ]}
                >
                  <Text style={styles.icon}>{opcion.icono}</Text>
                </View>

                <View style={styles.optionContent}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>
                      {opcion.titulo}
                    </Text>

                    {opcion.id === "menor_riesgo" && (
                      <View style={styles.recommended}>
                        <Text style={styles.recommendedText}>
                          RECOMENDADA
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.optionLabel,
                      { color: opcion.color },
                    ]}
                  >
                    {opcion.etiqueta}
                  </Text>

                  <Text style={styles.optionDescription}>
                    {opcion.descripcion}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    activa && styles.radioSelected,
                  ]}
                >
                  {activa && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.infoText}>
          Podrás seleccionar cualquiera de las otras rutas despues de que se calcule la escogida por ti.
        </Text>
      </ScrollView>

      {/* Acciones */}
      <View style={styles.footer}>
        <Pressable
          disabled={!seleccion}
          onPress={() => {
            if (seleccion) onContinuar(seleccion);
          }}
          style={[
            styles.continueButton,
            seleccion
              ? styles.continueEnabled
              : styles.continueDisabled,
          ]}
        >
          <Text style={styles.continueText}>
            Continuar
          </Text>
          <Text style={styles.continueArrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={onOmitir}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>
            Omitir por ahora
          </Text>
        </Pressable>

        <Text style={styles.skipDescription}>
          Al omitir, utilizaremos la opción Más segura.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF1EC",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    elevation: 3,
    shadowColor: "#173B66",
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
  },
  logoImage: {
    width: 43,
    height: 43,
    borderRadius: 13,
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F3D45B",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#123F3A",
    fontSize: 15,
    fontWeight: "900",
  },
  brand: {
    flex: 1,
    gap: 3,
  },
  brandName: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  brandRuta: {
    color: "#173B66",
  },
  brandSegura: {
    color: "#D64545",
  },
  slogan: {
    color: "#52677E",
    fontSize: 11,
    fontWeight: "500",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "EDF3F8",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D64545",
  },
  badgeText: {
    color: "#264968",
    fontSize: 8,
    fontWeight: "800",
  },
  intro: {
    marginTop: 32,
    marginBottom: 25,
  },
  eyebrow: {
    color: "#D47A57",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 9,
  },
  title: {
    color: "#123F3A",
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  subtitle: {
    marginTop: 10,
    color: "#71837A",
    fontSize: 14,
    lineHeight: 22,
  },
  options: {
    gap: 13,
  },
  option: {
  flexDirection: "row",
  alignItems: "center",
  gap: 13,
  padding: 15,
  minHeight: 105,
  backgroundColor: "#FFFFFF",
  borderRadius: 19,
  borderWidth: 1.3,
  borderColor: "#E5EAE4",
  elevation: 1,
  shadowColor: "#123F3A",
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
},

optionSelected: {
  borderColor: "#16866D",
  backgroundColor: "#FFFFFF",
  borderWidth: 2,
  elevation: 3,
  shadowOpacity: 0.10,
},
  iconContainer: {
  width: 49,
  height: 49,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
},

icon: {
  fontSize: 26,
},
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  optionTitle: {
    color: "#193F38",
    fontSize: 16,
    fontWeight: "900",
  },
  recommended: {
    backgroundColor: "#F8E9AA",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  recommendedText: {
    color: "#785D0D",
    fontSize: 7,
    fontWeight: "900",
  },
  optionLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  optionDescription: {
    color: "#74857D",
    fontSize: 11,
    lineHeight: 16,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#B7C5BC",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#16866D",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#16866D",
  },
  infoText: {
    textAlign: "center",
    color: "#71837A",
    fontSize: 11,
    marginTop: 20,
    lineHeight: 17,
    backgroundColor: "#EDF2ED",
    padding: 11,
    borderRadius: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#E9ECE5",
  },
  continueButton: {
    minHeight: 53,
    backgroundColor: "#123F3A",
    borderRadius: 15,
    paddingHorizontal: 19,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  continueEnabled: {
  backgroundColor: "#123F3A",
  elevation: 4,
  shadowColor: "#123F3A",
  shadowOpacity: 0.18,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 3 },
},
  continueDisabled: {
    backgroundColor: "#AABAB2",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  continueArrow: {
    color: "#F3D45B",
    fontSize: 21,
    fontWeight: "900",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 7,
  },
  skipText: {
    color: "#397C6B",
    fontSize: 13,
    fontWeight: "800",
  },
  skipDescription: {
    color: "#89968F",
    fontSize: 9,
    textAlign: "center",
  },
});
