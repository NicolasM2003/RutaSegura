import { useEffect, useState } from "react";
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
  if (ruta.nombre_perfil_ruta) {
    return ruta.nombre_perfil_ruta;
  }

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
    return "—";
  }

  return distanciaMetros >= 1000
    ? `${(distanciaMetros / 1000).toFixed(1)} km`
    : `${Math.round(distanciaMetros)} m`;
}

function tiempo(minutos?: number) {
  if (
    minutos === undefined ||
    !Number.isFinite(minutos)
  ) {
    return "—";
  }

  return `${Math.round(minutos)} min`;
}

function puntaje(ruta: RutaAlternativa) {
  return ruta.puntaje_riesgo !== undefined &&
    Number.isFinite(ruta.puntaje_riesgo)
    ? ruta.puntaje_riesgo.toFixed(2)
    : "—";
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

  const [pasoCalculo, setPasoCalculo] = useState(0);

  useEffect(() => {
    if (!cargando) {
      setPasoCalculo(0);
      return;
    }

    setPasoCalculo(0);

    const segundoPaso = setTimeout(
      () => setPasoCalculo(1),
      1100,
    );

    const tercerPaso = setTimeout(
      () => setPasoCalculo(2),
      2600,
    );

    return () => {
      clearTimeout(segundoPaso);
      clearTimeout(tercerPaso);
    };
  }, [cargando]);

  const estadosCalculo = [
    {
      titulo: "Calculando rutas seguras",
      detalle: "Buscando recorridos peatonales entre tus puntos.",
    },
    {
      titulo: "Comparando alternativas",
      detalle: "Revisando distancia, tiempo estimado y nivel de riesgo.",
    },
    {
      titulo: "Preparando tu recomendación",
      detalle: "En breve verás los resultados.",
    },
  ];

  // Identificar la ruta seleccionada.
  const rutaActiva =
    rutas.find(
      (ruta) => ruta.perfil_ruta === rutaSeleccionada,
    ) ??
    rutas.find((ruta) => ruta.es_ruta_principal) ??
    rutas[0];

  const comparacionActual =
    interpretacion?.comparaciones?.find(
      (item) =>
        item.perfil_ruta === rutaActiva?.perfil_ruta,
    );

  const recomendadaPorIA =
    interpretacion?.disponible === true &&
    interpretacion.recomendacion?.perfil_ruta ===
      rutaActiva?.perfil_ruta;

  const tieneDetalleIA = Boolean(
    interpretacion?.recomendacion?.motivo ||
      interpretacion?.resumen_general ||
      comparacionActual?.explicacion ||
      interpretacion?.consideraciones?.length,
  );

  return (
    <View style={styles.container}>
      {/* ESTADO SIN RUTA */}
      {!origenCompleto && !cargando && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Tu recorrido aparecerá aquí
          </Text>

          <Text style={styles.emptyBody}>
            Selecciona un origen y un destino para calcular
            alternativas peatonales.
          </Text>
        </View>
      )}

      {/* CARGANDO */}
      {cargando && (
        <View style={styles.statusCard}>
          <ActivityIndicator
            color="#17846D"
            size="small"
          />

          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              {estadosCalculo[pasoCalculo].titulo}
            </Text>

            <Text style={styles.statusBody}>
              {estadosCalculo[pasoCalculo].detalle}
            </Text>
          </View>
        </View>
      )}

      {/* ERROR */}
      {!!error && !cargando && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            No pudimos calcular las rutas
          </Text>

          <Text style={styles.errorBody}>
            {error}
          </Text>
        </View>
      )}

      {/* RESULTADOS */}
      {!cargando && rutaActiva && (
        <>
          {/* SELECTOR DE ALTERNATIVAS */}
          <View style={styles.selectorSection}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>
                ELIGE UNA ALTERNATIVA
              </Text>

              <View style={styles.countPill}>
                <Text style={styles.countText}>
                  {rutas.length}{" "}
                  {rutas.length === 1 ? "ruta" : "rutas"}
                </Text>
              </View>
            </View>

            <View style={styles.routesRow}>
              {rutas.map((ruta) => {
                const color = colorPerfil(ruta.perfil_ruta);

                const seleccionada =
                  ruta.perfil_ruta ===
                  rutaActiva.perfil_ruta;

                return (
                  <Pressable
                    key={ruta.perfil_ruta}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${nombrePerfil(ruta)} en el mapa`}
                    accessibilityState={{
                      selected: seleccionada,
                    }}
                    onPress={() => {
                      onSeleccionarRuta(ruta.perfil_ruta);
                    }}
                    style={({ pressed }) => [
                      styles.routeOption,
                      seleccionada &&
                        styles.routeOptionSelected,
                      {
                        borderColor: seleccionada
                          ? color
                          : "#E1E9E4",
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.routeOptionTitleRow}>
                      <View
                        style={[
                          styles.routeDot,
                          { backgroundColor: color },
                        ]}
                      />

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.routeOptionTitle,
                          seleccionada &&
                            styles.routeOptionTitleSelected,
                        ]}
                      >
                        {nombrePerfil(ruta)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.routeOptionScore,
                        seleccionada && { color },
                      ]}
                    >
                      Riesgo {puntaje(ruta)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* RESUMEN DE LA RUTA ACTIVA */}
          <View
            style={[
              styles.selectedCard,
              {
                borderLeftColor: colorPerfil(
                  rutaActiva.perfil_ruta,
                ),
              },
            ]}
          >
            <View style={styles.selectedHeader}>
              <View style={styles.selectedCopy}>
                <Text style={styles.selectedEyebrow}>
                  RUTA MOSTRADA EN EL MAPA
                </Text>

                <Text style={styles.selectedTitle}>
                  {nombrePerfil(rutaActiva)}
                </Text>

                <View style={styles.badgesRow}>
                  {rutaActiva.es_ruta_principal && (
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
              </View>

              <View style={styles.scoreBox}>
                <Text
                  style={[
                    styles.scoreValue,
                    {
                      color: colorPerfil(
                        rutaActiva.perfil_ruta,
                      ),
                    },
                  ]}
                >
                  {puntaje(rutaActiva)}
                </Text>

                <Text style={styles.scoreLabel}>
                  puntaje de riesgo
                </Text>
              </View>
            </View>

            {/* MÉTRICAS */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>
                  TIEMPO
                </Text>

                <Text style={styles.metricValue}>
                  {tiempo(
                    rutaActiva.tiempo_estimado_minutos,
                  )}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>
                  DISTANCIA
                </Text>

                <Text style={styles.metricValue}>
                  {distancia(
                    rutaActiva.distancia_metros,
                  )}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>
                  NIVEL DE RIESGO
                </Text>

                <Text style={styles.metricValue}>
                  {rutaActiva.nivel_riesgo ?? "No informado"}
                </Text>
              </View>
            </View>

            <View style={styles.selectedFooter}>
              <Text style={styles.selectedFooterText}>
                ✓ Ruta seleccionada en el mapa
              </Text>
            </View>
          </View>

          {/* RECOMENDACIÓN DE RUTASEGURA: SIEMPRE VISIBLE */}
          {interpretacion?.disponible === true &&
            tieneDetalleIA && (
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <View style={styles.aiIcon}>
                    <Text style={styles.aiIconText}>
                      ✦
                    </Text>
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

                {!!comparacionActual?.explicacion && (
                  <View style={styles.comparison}>
                    <Text style={styles.comparisonTitle}>
                      Sobre esta alternativa
                    </Text>

                    <Text style={styles.aiBody}>
                      {comparacionActual.explicacion}
                    </Text>
                  </View>
                )}

                {!!interpretacion.consideraciones?.length && (
                  <View style={styles.considerations}>
                    {interpretacion.consideraciones.map(
                      (item, index) => (
                        <Text
                          key={`${index}-${item}`}
                          style={styles.considerationText}
                        >
                          • {item}
                        </Text>
                      ),
                    )}
                  </View>
                )}
              </View>
            )}

          {/* IA NO DISPONIBLE */}
          {interpretacion?.disponible === false && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                {interpretacion.mensaje ??
                  "El análisis inteligente no está disponible. Puedes consultar las rutas igualmente."}
              </Text>
            </View>
          )}

          {/* MENSAJE DEL BACKEND */}
          {!!resultado?.mensaje && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                {resultado.mensaje}
              </Text>
            </View>
          )}
        </>
      )}

      {/* SIN ALTERNATIVAS */}
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
              Prueba con otros puntos o revisa los filtros
              seleccionados.
            </Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8EEEB",
    gap: 9,
  },

  selectorSection: {
    gap: 8,
  },

  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectorTitle: {
    color: "#16836C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  countPill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "#E8F3EF",
  },

  countText: {
    color: "#147B61",
    fontSize: 9,
    fontWeight: "800",
  },

  routesRow: {
    flexDirection: "row",
    gap: 7,
  },

  routeOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 53,
    paddingHorizontal: 7,
    paddingVertical: 7,
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 11,
    backgroundColor: "#F8FAF8",
  },

  routeOptionSelected: {
    backgroundColor: "#EDF7F1",
    borderWidth: 1.5,
  },

  routeOptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  routeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  routeOptionTitle: {
    flex: 1,
    color: "#52665C",
    fontSize: 9,
    fontWeight: "800",
  },

  routeOptionTitleSelected: {
    color: "#173F35",
  },

  routeOptionScore: {
    color: "#84918A",
    fontSize: 8,
    fontWeight: "700",
  },

  selectedCard: {
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#DCE8E0",
    backgroundColor: "#F7FAF7",
    gap: 10,
  },

  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  selectedCopy: {
    flex: 1,
    gap: 3,
  },

  selectedEyebrow: {
    color: "#84948B",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  selectedTitle: {
    color: "#24463D",
    fontSize: 15,
    fontWeight: "900",
  },

  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },

  primaryBadge: {
    overflow: "hidden",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "#E3F3EB",
    color: "#187553",
    fontSize: 8,
    fontWeight: "800",
  },

  aiBadge: {
    overflow: "hidden",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "#EAE6F7",
    color: "#6E58A2",
    fontSize: 8,
    fontWeight: "800",
  },

  scoreBox: {
    minWidth: 57,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#E1E9E4",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  scoreValue: {
    fontSize: 21,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },

  scoreLabel: {
    color: "#87938E",
    fontSize: 8,
    textAlign: "center",
  },

  metricsRow: {
    flexDirection: "row",
    gap: 6,
  },

  metricBox: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 7,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#EDF3EF",
    gap: 3,
  },

  metricLabel: {
    color: "#87958D",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  metricValue: {
    color: "#345448",
    fontSize: 10,
    fontWeight: "800",
  },

  selectedFooter: {
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#E2EBE5",
  },

  selectedFooterText: {
    color: "#17846D",
    fontSize: 9,
    fontWeight: "800",
  },

  aiCard: {
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#F0F7F4",
    borderWidth: 1,
    borderColor: "#D7E9E1",
    gap: 7,
  },

  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  aiIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D7EEE4",
  },

  aiIconText: {
    color: "#147B61",
    fontSize: 17,
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
    letterSpacing: 0.8,
  },

  aiTitle: {
    color: "#24463D",
    fontSize: 12,
    fontWeight: "800",
  },

  aiBody: {
    color: "#5B7068",
    fontSize: 10,
    lineHeight: 15,
  },

  comparison: {
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#DDEAE3",
    gap: 4,
  },

  comparisonTitle: {
    color: "#3E6859",
    fontSize: 9,
    fontWeight: "900",
  },

  considerations: {
    gap: 4,
  },

  considerationText: {
    color: "#5B7068",
    fontSize: 10,
    lineHeight: 14,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 13,
    padding: 12,
    backgroundColor: "#EAF5F0",
  },

  statusCopy: {
    flex: 1,
    gap: 3,
  },

  statusTitle: {
    color: "#176A57",
    fontWeight: "800",
    fontSize: 11,
  },

  statusBody: {
    color: "#648078",
    fontSize: 10,
  },

  errorCard: {
    borderRadius: 12,
    padding: 11,
    backgroundColor: "#FFF1EF",
    borderWidth: 1,
    borderColor: "#F5CBC5",
    gap: 4,
  },

  errorTitle: {
    color: "#A43F34",
    fontWeight: "800",
    fontSize: 11,
  },

  errorBody: {
    color: "#88564F",
    fontSize: 10,
    lineHeight: 15,
  },

  noticeCard: {
    borderRadius: 11,
    padding: 9,
    backgroundColor: "#FFF8E9",
    borderWidth: 1,
    borderColor: "#F1E0B9",
  },

  noticeText: {
    color: "#8B6728",
    fontSize: 10,
    lineHeight: 14,
  },

  emptyState: {
    borderRadius: 13,
    padding: 12,
    backgroundColor: "#F5F8F6",
    gap: 4,
  },

  emptyTitle: {
    color: "#24463D",
    fontWeight: "800",
    fontSize: 12,
  },

  emptyBody: {
    color: "#72817B",
    fontSize: 10,
    lineHeight: 15,
  },

  pressed: {
    opacity: 0.75,
  },
});