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

// ----------------------------------------------------
// FUNCIONES PARA COMPARAR ALTERNATIVAS
// ----------------------------------------------------

function esNumeroFinito(
  valor: number | undefined,
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isFinite(valor)
  );
}

function formatoDecimal(
  valor: number,
  decimales: number,
) {
  return valor
    .toFixed(decimales)
    .replace(".", ",");
}

function formatoDistanciaDiferencia(
  metros: number,
) {
  const valor = Math.abs(metros);

  return valor >= 1000
    ? `${formatoDecimal(valor / 1000, 2)} km`
    : `${Math.round(valor)} m`;
}

function formatoTiempoDiferencia(
  minutos: number,
) {
  const valor = Math.abs(minutos);

  if (valor > 0 && valor < 0.1) {
    return `${formatoDecimal(
      valor * 60,
      1,
    )} segundos`;
  }

  const texto = valor
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(".", ",");

  return `${texto} minutos`;
}

function unirConY(elementos: string[]) {
  if (elementos.length <= 1) {
    return elementos[0] ?? "";
  }

  return `${elementos
    .slice(0, -1)
    .join(", ")} y ${
    elementos[elementos.length - 1]
  }`;
}

/**
 * Construye una comparación de la ruta activa frente
 * a TODAS las demás alternativas.
 *
 * Utiliza directamente las métricas calculadas
 * por el backend. No depende de la IA.
 */
function generarExplicacionComparativa(
  rutaActual: RutaAlternativa | undefined,
  rutas: RutaAlternativa[],
): string | null {
  if (!rutaActual) {
    return null;
  }

  const otrasRutas = rutas.filter(
    (ruta) =>
      ruta.perfil_ruta !== rutaActual.perfil_ruta,
  );

  if (otrasRutas.length === 0) {
    return (
      "Solo hay una alternativa disponible, " +
      "por lo que no existen otras rutas con las " +
      "que compararla."
    );
  }

  return otrasRutas
    .map((otraRuta) => {
      const detalles: string[] = [];

      // Comparar distancia.
      if (
        esNumeroFinito(
          rutaActual.distancia_metros,
        ) &&
        esNumeroFinito(
          otraRuta.distancia_metros,
        )
      ) {
        const diferencia =
          rutaActual.distancia_metros -
          otraRuta.distancia_metros;

        if (Math.abs(diferencia) < 0.5) {
          detalles.push(
            "tiene prácticamente la misma distancia",
          );
        } else {
          detalles.push(
            `es ${formatoDistanciaDiferencia(
              diferencia,
            )} ${
              diferencia > 0
                ? "más larga"
                : "más corta"
            }`,
          );
        }
      }

      // Comparar tiempo.
      if (
        esNumeroFinito(
          rutaActual.tiempo_estimado_minutos,
        ) &&
        esNumeroFinito(
          otraRuta.tiempo_estimado_minutos,
        )
      ) {
        const diferencia =
          rutaActual.tiempo_estimado_minutos -
          otraRuta.tiempo_estimado_minutos;

        if (Math.abs(diferencia) < 0.0001) {
          detalles.push(
            "requiere el mismo tiempo",
          );
        } else {
          detalles.push(
            `requiere ${formatoTiempoDiferencia(
              diferencia,
            )} ${
              diferencia > 0
                ? "más"
                : "menos"
            }`,
          );
        }
      }

      // Comparar puntaje de riesgo.
      if (
        esNumeroFinito(
          rutaActual.puntaje_riesgo,
        ) &&
        esNumeroFinito(
          otraRuta.puntaje_riesgo,
        )
      ) {
        const diferencia =
          rutaActual.puntaje_riesgo -
          otraRuta.puntaje_riesgo;

        if (Math.abs(diferencia) < 0.005) {
          detalles.push(
            "presenta el mismo puntaje de riesgo",
          );
        } else {
          detalles.push(
            `presenta un puntaje de riesgo ${
              formatoDecimal(
                Math.abs(diferencia),
                2,
              )
            } puntos ${
              diferencia > 0
                ? "mayor"
                : "menor"
            }`,
          );
        }
      }

      if (detalles.length === 0) {
        return (
          `No hay métricas suficientes para ` +
          `compararla con ${nombrePerfil(otraRuta)}.`
        );
      }

      return (
        `Frente a ${nombrePerfil(otraRuta)}, ` +
        `esta alternativa ${unirConY(detalles)}.`
      );
    })
    .join("\n");
}

/**
 * Construye el motivo de recomendación.
 *
 * La alternativa recomendada sigue siendo la que
 * determinó el backend como de menor riesgo.
 */
function generarMotivoRecomendacion(
  rutaActual: RutaAlternativa | undefined,
  rutaRecomendada: RutaAlternativa | undefined,
): string | null {
  if (
    !rutaRecomendada ||
    !esNumeroFinito(
      rutaRecomendada.puntaje_riesgo,
    )
  ) {
    return null;
  }

  const puntajeRecomendado =
    rutaRecomendada.puntaje_riesgo;

  const prioridadSeguridad =
    "RutaSegura prioriza la seguridad peatonal por encima de reducir la distancia o el tiempo de recorrido.";

  if (
    !rutaActual ||
    !esNumeroFinito(rutaActual.puntaje_riesgo)
  ) {
    return (
      `RutaSegura recomienda ${nombrePerfil(
        rutaRecomendada,
      )}, con un puntaje de riesgo de ${
        formatoDecimal(
          puntajeRecomendado,
          2,
        )
      }. ${prioridadSeguridad}`
    );
  }

  // El usuario está visualizando la ruta recomendada.
  if (
    rutaActual.perfil_ruta ===
    rutaRecomendada.perfil_ruta
  ) {
    return (
      "Tu selección coincide con la alternativa " +
      "recomendada por RutaSegura. Presenta el menor " +
      `puntaje de riesgo disponible (${
        formatoDecimal(
          puntajeRecomendado,
          2,
        )
      }). ${prioridadSeguridad}`
    );
  }

  const diferencia =
    rutaActual.puntaje_riesgo -
    puntajeRecomendado;

  if (diferencia > 0.005) {
    return (
      `RutaSegura recomienda ${nombrePerfil(
        rutaRecomendada,
      )}, con un puntaje de riesgo de ${
        formatoDecimal(
          puntajeRecomendado,
          2,
        )
      }. Esto representa ${
        formatoDecimal(diferencia, 2)
      } puntos menos que ${
        nombrePerfil(rutaActual)
      }, cuya puntuación es ${
        formatoDecimal(
          rutaActual.puntaje_riesgo,
          2,
        )
      }. ${prioridadSeguridad}`
    );
  }

  if (diferencia < -0.005) {
    return (
      `Los datos muestran que ${
        nombrePerfil(rutaActual)
      } tiene un puntaje de riesgo inferior al de ` +
      "la alternativa recomendada. Es necesario " +
      "revisar la consistencia de estos datos."
    );
  }

  return (
    `RutaSegura recomienda ${nombrePerfil(
      rutaRecomendada,
    )}. Ambas alternativas presentan el mismo ` +
    `puntaje de riesgo (${
      formatoDecimal(
        puntajeRecomendado,
        2,
      )
    }). ${prioridadSeguridad}`
  );
}

// ----------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------

export default function PanelResultados({
  origenCompleto,
  resultado,
  cargando,
  error,
  rutaSeleccionada,
  onSeleccionarRuta,
}: Props) {
  const rutas = resultado?.rutas ?? [];
  const interpretacion =
    resultado?.interpretacion_ia;

  const [pasoCalculo, setPasoCalculo] =
    useState(0);

  const [mostrarAnalisis, setMostrarAnalisis] =
    useState(false);

  useEffect(() => {
    setMostrarAnalisis(false);
  }, [rutaSeleccionada]);

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
      detalle:
        "Buscando recorridos peatonales entre tus puntos.",
    },
    {
      titulo: "Comparando alternativas",
      detalle:
        "Revisando distancia, tiempo estimado y nivel de riesgo.",
    },
    {
      titulo: "Preparando tu recomendación",
      detalle: "En breve verás los resultados.",
    },
  ];

  // Identificar la alternativa que el usuario está visualizando.
  const rutaActiva =
    rutas.find(
      (ruta) =>
        ruta.perfil_ruta === rutaSeleccionada,
    ) ??
    rutas.find(
      (ruta) => ruta.es_ruta_principal,
    ) ??
    rutas[0];

  // Recuperar la comparación de IA como respaldo.
  const comparacionActiva =
    interpretacion?.comparaciones?.find(
      (item) =>
        item.perfil_ruta ===
        rutaActiva?.perfil_ruta,
    );

  // Identificar la ruta recomendada por el backend.
  // El frontend no vuelve a calcular cuál es la más segura.
  const rutaRecomendada =
    interpretacion?.disponible === true
      ? rutas.find(
          (ruta) =>
            ruta.perfil_ruta ===
            interpretacion.recomendacion?.perfil_ruta,
        )
      : undefined;

  // Comparar la alternativa activa con todas las restantes.
  const explicacionAlternativa =
    generarExplicacionComparativa(
      rutaActiva,
      rutas,
    ) ??
    comparacionActiva?.explicacion;

  // Actualizar el motivo según la ruta que se está mostrando.
  const motivoRecomendacion =
    generarMotivoRecomendacion(
      rutaActiva,
      rutaRecomendada,
    );

  const recomendadaPorIA =
    interpretacion?.disponible === true &&
    interpretacion.recomendacion?.perfil_ruta ===
      rutaActiva?.perfil_ruta;

  const tieneDetalleIA = Boolean(
    motivoRecomendacion ||
      interpretacion?.resumen_general ||
      explicacionAlternativa ||
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
                  {rutas.length === 1
                    ? "ruta"
                    : "rutas"}
                </Text>
              </View>
            </View>

            <View style={styles.routesRow}>
              {rutas.map((ruta) => {
                const color = colorPerfil(
                  ruta.perfil_ruta,
                );

                const seleccionada =
                  ruta.perfil_ruta ===
                  rutaActiva.perfil_ruta;

                return (
                  <Pressable
                    key={ruta.perfil_ruta}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${nombrePerfil(
                      ruta,
                    )} en el mapa`}
                    accessibilityState={{
                      selected: seleccionada,
                    }}
                    onPress={() => {
                      onSeleccionarRuta(
                        ruta.perfil_ruta,
                      );
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
                    <View
                      style={styles.routeOptionTitleRow}
                    >
                      <View
                        style={[
                          styles.routeDot,
                          {
                            backgroundColor: color,
                          },
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
                  {rutaActiva.nivel_riesgo ??
                    "No informado"}
                </Text>
              </View>
            </View>

            <View style={styles.selectedFooter}>
              <Text style={styles.selectedFooterText}>
                ✓ Ruta seleccionada en el mapa
              </Text>
            </View>
          </View>

          {/* ANÁLISIS DE RUTASEGURA DESPLEGABLE */}
          {interpretacion?.disponible === true &&
            tieneDetalleIA && (
              <View style={styles.aiCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    expanded: mostrarAnalisis,
                  }}
                  onPress={() =>
                    setMostrarAnalisis(
                      (actual) => !actual,
                    )
                  }
                  style={styles.aiHeader}
                >
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
                      Análisis de RutaSegura
                    </Text>
                  </View>

                  <Text style={styles.analysisArrow}>
                    {mostrarAnalisis ? "⌃" : "⌄"}
                  </Text>
                </Pressable>

                {mostrarAnalisis && (
                  <>
                    {/* EXPLICACIÓN DE LA ALTERNATIVA ACTIVA */}
                    {!!explicacionAlternativa && (
                      <View style={styles.comparison}>
                        <Text
                          style={styles.comparisonTitle}
                        >
                          Sobre esta alternativa
                        </Text>

                        <Text style={styles.aiBody}>
                          {explicacionAlternativa}
                        </Text>
                      </View>
                    )}

                    {/* RECOMENDACIÓN DE SEGURIDAD */}
                    {!!motivoRecomendacion && (
                      <View style={styles.comparison}>
                        <Text
                          style={styles.comparisonTitle}
                        >
                          Recomendación de RutaSegura
                        </Text>

                        <Text style={styles.aiBody}>
                          {motivoRecomendacion}
                        </Text>
                      </View>
                    )}

                    {/* RESUMEN GENERAL */}
                    {!!interpretacion.resumen_general && (
                      <Text style={styles.aiBody}>
                        {interpretacion.resumen_general}
                      </Text>
                    )}

                    {/* CONSIDERACIONES */}
                    {!!interpretacion.consideraciones
                      ?.length && (
                      <View style={styles.considerations}>
                        {interpretacion.consideraciones.map(
                          (item, index) => (
                            <Text
                              key={`${index}-${item}`}
                              style={
                                styles.considerationText
                              }
                            >
                              • {item}
                            </Text>
                          ),
                        )}
                      </View>
                    )}
                  </>
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

// ----------------------------------------------------
// ESTILOS
// ----------------------------------------------------

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

  analysisArrow: {
    color: "#16836C",
    fontSize: 19,
    fontWeight: "900",
    paddingHorizontal: 5,
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