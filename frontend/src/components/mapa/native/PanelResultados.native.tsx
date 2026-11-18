import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type RutaAlternativa = {
  perfil_ruta: string;
  nombre_perfil_ruta?: string;
  es_ruta_principal?: boolean;
  distancia_metros?: number;
  tiempo_estimado_minutos?: number;
  nivel_riesgo?: string;
  puntaje_riesgo?: number;
};

type InterpretacionIA = {
  disponible: boolean;
  resumen_general?: string;
  recomendacion?: {
    perfil_ruta: string;
    motivo: string;
  };
  comparaciones?: Array<{
    perfil_ruta: string;
    explicacion: string;
  }>;
  consideraciones?: string[];
  mensaje?: string;
};

type ResultadoRuta = {
  cantidad_rutas?: number;
  mensaje?: string;
  rutas?: RutaAlternativa[];
  interpretacion_ia?: InterpretacionIA;
};

type Props = {
  origenCompleto: boolean;
  resultado: ResultadoRuta | null;
  cargando: boolean;
  error: string | null;
  rutaSeleccionada: string | null;
  onSeleccionarRuta: (perfil: string) => void;
};

function colorPerfil(perfil: string) {
  switch (perfil) {
    case "menor_riesgo":
      return "#17846D";
    case "equilibrada":
      return "#3976AE";
    case "mas_rapida":
      return "#9166B8";
    default:
      return "#64748B";
  }
}

function nombrePerfil(ruta: RutaAlternativa) {
  if (ruta.nombre_perfil_ruta) return ruta.nombre_perfil_ruta;
  switch (ruta.perfil_ruta) {
    case "menor_riesgo":
      return "Más segura";
    case "equilibrada":
      return "Equilibrada";
    case "mas_rapida":
      return "Más rápida";
    default:
      return "Ruta alternativa";
  }
}

function distancia(distanciaMetros?: number) {
  if (
    distanciaMetros === undefined ||
    !Number.isFinite(distanciaMetros)
  ) {
    return "Distancia no disponible";
  }

  return distanciaMetros >= 1000
    ? `${(distanciaMetros / 1000).toFixed(1)} km`
    : `${Math.round(distanciaMetros)} m`;
}

export default function PanelResultados({
  origenCompleto,
  resultado,
  cargando,
  error,
  rutaSeleccionada,
  onSeleccionarRuta,
}: Props) {
  const rutas = resultado?.rutas ?? [];
  const interpretacion = resultado?.interpretacion_ia;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>TU RECORRIDO</Text>
          <Text style={styles.title}>Alternativas de ruta</Text>
        </View>

        {rutas.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {rutas.length} {rutas.length === 1 ? "ruta" : "rutas"}
            </Text>
          </View>
        )}
      </View>

      {!origenCompleto && !cargando && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Tu recorrido aparecerá aquí
          </Text>
          <Text style={styles.emptyBody}>
            Selecciona un origen y un destino para calcular alternativas peatonales.
          </Text>
        </View>
      )}

      {cargando && (
        <View style={styles.statusCard}>
          <ActivityIndicator color="#17846D" size="small" />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              Calculando rutas seguras
            </Text>
            <Text style={styles.statusBody}>
              Estamos comparando los recorridos disponibles.
            </Text>
          </View>
        </View>
      )}

      {!!error && !cargando && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            No pudimos calcular las rutas
          </Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      )}

      {!!resultado?.mensaje && rutas.length > 0 && !cargando && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>{resultado.mensaje}</Text>
        </View>
      )}

      {interpretacion?.disponible === true && !cargando && (
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Text style={styles.aiIconText}>✦</Text>
            </View>
            <View style={styles.aiHeaderCopy}>
              <Text style={styles.aiEyebrow}>
                ANÁLISIS INTELIGENTE
              </Text>
              <Text style={styles.aiTitle}>
                Recomendación de RutaSegura
              </Text>
            </View>
          </View>

          {!!interpretacion.recomendacion?.motivo && (
            <Text style={styles.aiBody}>
              {interpretacion.recomendacion.motivo}
            </Text>
          )}

          {!!interpretacion.resumen_general && (
            <Text style={styles.aiBody}>
              {interpretacion.resumen_general}
            </Text>
          )}

          {!!interpretacion.consideraciones?.length && (
            <View style={styles.considerations}>
              {interpretacion.consideraciones.map((item, index) => (
                <Text
                  key={`${index}-${item}`}
                  style={styles.considerationText}
                >
                  • {item}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {interpretacion?.disponible === false && !cargando && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            {interpretacion.mensaje ??
              "El análisis inteligente no está disponible. Puedes consultar las rutas igualmente."}
          </Text>
        </View>
      )}

      {rutas.map((ruta) => {
        const color = colorPerfil(ruta.perfil_ruta);
        const seleccionada =
          rutaSeleccionada === ruta.perfil_ruta;

        const recomendadaPorIA =
          interpretacion?.disponible === true &&
          interpretacion.recomendacion?.perfil_ruta ===
            ruta.perfil_ruta;

        const comparacion = interpretacion?.comparaciones?.find(
          (item) => item.perfil_ruta === ruta.perfil_ruta,
        );

        return (
          <Pressable
            key={ruta.perfil_ruta}
            accessibilityRole="button"
            accessibilityLabel={`Seleccionar ${nombrePerfil(ruta)}`}
            accessibilityState={{ selected: seleccionada }}
            onPress={() => onSeleccionarRuta(ruta.perfil_ruta)}
            style={({ pressed }) => [
              styles.routeCard,
              seleccionada && styles.routeCardSelected,
              { borderLeftColor: color },
              pressed && styles.routeCardPressed,
            ]}
          >
            <View style={styles.routeMain}>
              <View style={styles.routeCopy}>
                <View style={styles.routeTitleRow}>
                  <Text style={styles.routeTitle}>
                    {nombrePerfil(ruta)}
                  </Text>

                  {ruta.es_ruta_principal && (
                    <Text style={styles.primaryBadge}>
                      Principal
                    </Text>
                  )}

                  {recomendadaPorIA && (
                    <Text style={styles.aiBadge}>
                      Recomendada por IA
                    </Text>
                  )}
                </View>

                <Text style={styles.routeMeta}>
                  {ruta.tiempo_estimado_minutos !== undefined &&
                  Number.isFinite(ruta.tiempo_estimado_minutos)
                    ? `${Math.round(ruta.tiempo_estimado_minutos)} min`
                    : "Tiempo no disponible"}
                  {"  ·  "}
                  {distancia(ruta.distancia_metros)}
                </Text>

                <Text style={styles.riskText}>
                  Riesgo: {ruta.nivel_riesgo ?? "No informado"}
                </Text>
              </View>

              <View style={styles.scoreBox}>
                <Text style={[styles.scoreValue, { color }]}>
                  {ruta.puntaje_riesgo !== undefined &&
                  Number.isFinite(ruta.puntaje_riesgo)
                    ? ruta.puntaje_riesgo.toFixed(2)
                    : "—"}
                </Text>
                <Text style={styles.scoreLabel}>
                  puntaje de riesgo
                </Text>
              </View>
            </View>

            {seleccionada && (
              <Text style={[styles.selectedText, { color }]}>
                ✓ Ruta seleccionada en el mapa
              </Text>
            )}

            {!!comparacion?.explicacion && (
              <View style={styles.comparison}>
                <Text style={styles.comparisonTitle}>
                  Sobre esta alternativa
                </Text>
                <Text style={styles.comparisonBody}>
                  {comparacion.explicacion}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {!cargando &&
        !error &&
        origenCompleto &&
        resultado &&
        rutas.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No encontramos alternativas
            </Text>
            <Text style={styles.emptyBody}>
              Prueba con otros puntos o revisa los filtros seleccionados.
            </Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8EEEB",
    gap: 10,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  headingCopy: {
    gap: 2,
  },
  eyebrow: {
    color: "#16836C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "#173D35",
    fontSize: 18,
    fontWeight: "800",
  },
  countPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E8F3EF",
  },
  countText: {
    color: "#147B61",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyState: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#F5F8F6",
    gap: 4,
  },
  emptyTitle: {
    color: "#24463D",
    fontWeight: "800",
    fontSize: 13,
  },
  emptyBody: {
    color: "#72817B",
    fontSize: 11,
    lineHeight: 16,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 15,
    padding: 13,
    backgroundColor: "#EAF5F0",
  },
  statusCopy: {
    flex: 1,
    gap: 3,
  },
  statusTitle: {
    color: "#176A57",
    fontWeight: "800",
    fontSize: 12,
  },
  statusBody: {
    color: "#648078",
    fontSize: 11,
  },
  errorCard: {
    borderRadius: 14,
    padding: 13,
    backgroundColor: "#FFF1EF",
    borderWidth: 1,
    borderColor: "#F5CBC5",
    gap: 4,
  },
  errorTitle: {
    color: "#A43F34",
    fontWeight: "800",
    fontSize: 12,
  },
  errorBody: {
    color: "#88564F",
    fontSize: 11,
    lineHeight: 16,
  },
  noticeCard: {
    borderRadius: 12,
    padding: 11,
    backgroundColor: "#FFF8E9",
    borderWidth: 1,
    borderColor: "#F1E0B9",
  },
  noticeText: {
    color: "#8B6728",
    fontSize: 11,
    lineHeight: 16,
  },
  aiCard: {
    borderRadius: 16,
    padding: 13,
    backgroundColor: "#F0F7F4",
    borderWidth: 1,
    borderColor: "#D7E9E1",
    gap: 8,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D7EEE4",
  },
  aiIconText: {
    color: "#147B61",
    fontSize: 18,
    fontWeight: "900",
  },
  aiHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  aiEyebrow: {
    color: "#16836C",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  aiTitle: {
    color: "#24463D",
    fontSize: 13,
    fontWeight: "800",
  },
  aiBody: {
    color: "#5B7068",
    fontSize: 11,
    lineHeight: 16,
  },
  considerations: {
    gap: 4,
  },
  considerationText: {
    color: "#5B7068",
    fontSize: 11,
    lineHeight: 15,
  },
  routeCard: {
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#E4EBE7",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  routeCardSelected: {
    backgroundColor: "#F5FAF7",
    borderTopColor: "#BBDACB",
    borderRightColor: "#BBDACB",
    borderBottomColor: "#BBDACB",
  },
  routeCardPressed: {
    opacity: 0.78,
  },
  routeMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeCopy: {
    flex: 1,
    gap: 4,
  },
  routeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  routeTitle: {
    color: "#29443B",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryBadge: {
    overflow: "hidden",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "#E3F3EB",
    color: "#187553",
    fontSize: 9,
    fontWeight: "800",
  },
  aiBadge: {
    overflow: "hidden",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "#EAE6F7",
    color: "#6E58A2",
    fontSize: 9,
    fontWeight: "800",
  },
  routeMeta: {
    color: "#667C73",
    fontSize: 11,
    fontWeight: "600",
  },
  riskText: {
    color: "#84928B",
    fontSize: 10,
  },
  scoreBox: {
    minWidth: 67,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#E8EEEB",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  scoreLabel: {
    color: "#87938E",
    fontSize: 8,
    textAlign: "center",
  },
  selectedText: {
    fontSize: 10,
    fontWeight: "800",
  },
  comparison: {
    borderTopWidth: 1,
    borderTopColor: "#E6ECE9",
    paddingTop: 8,
    gap: 3,
  },
  comparisonTitle: {
    color: "#4A665C",
    fontSize: 10,
    fontWeight: "800",
  },
  comparisonBody: {
    color: "#6B7E75",
    fontSize: 10,
    lineHeight: 15,
  },
});