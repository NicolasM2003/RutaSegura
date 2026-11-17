import { Fragment } from "react";
import {
  Circle,
  Marker,
  Polyline,
} from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";
import { claveZonaRiesgo } from "./zonas";
import { agruparConcentracionesDelitos, type DelitoConcentrado } from "../concentracion-delitos";

export type ZonaRiesgo = {
  id_zona?: string | number;
  latitud: number | string;
  longitud: number | string;
  nivel: string;
  metodo_agrupacion?: string;
  cantidad_delitos?: number;
  puntajeFinal?: number;
  comuna?: string;
  geometria_zona?: {
    radio_metros?: number;
    centros?: Array<{ latitud: number | string; longitud: number | string }>;
  };
};

export type Delito = {
  id: string | number;
  fecha?: string;
  rango_horario?: string;
  grupo_delito?: string;
  lugar?: string;
  comuna?: string;
  latitud: number | string;
  longitud: number | string;
};

export type ConcentracionDelitos = DelitoConcentrado<Delito>;

export type SegmentoPeatonal = {
  id_osm?: string | number;
  nombre?: string;
  tipo?: string;
  categoria_peatonal?: string;
  comuna?: string;
  superficie?: string;
  longitud_metros?: number;
  nodo_inicio?: string | number;
  nodo_fin?: string | number;
  geometria: Array<{
    latitud: number | string;
    longitud: number | string;
  }>;
};

export type ElementoMapa =
  | {
      tipo: "zona";
      datos: ZonaRiesgo;
    }
  | {
      tipo: "delito";
      datos: Delito;
    }
  | {
      tipo: "concentracion";
      datos: ConcentracionDelitos;
    }
  | {
      tipo: "segmento";
      datos: SegmentoPeatonal;
    };

export type PuntoRuta = {
  latitud: number;
  longitud: number;
};

export function CapaPuntosRuta({
  origen,
  destino,
  ubicacion,
}: {
  origen: PuntoRuta | null;
  destino: PuntoRuta | null;
  ubicacion?: PuntoRuta | null;
}) {
  return (
    <>
      {ubicacion && (
        <Marker
          coordinate={{ latitude: ubicacion.latitud, longitude: ubicacion.longitud }}
          pinColor="#0284c7"
          title="Mi ubicación"
          zIndex={100}
        />
      )}
      {origen && (
        <Marker
          coordinate={{ latitude: origen.latitud, longitude: origen.longitud }}
          pinColor="#2563eb"
          title="Origen"
          zIndex={101}
        />
      )}
      {destino && (
        <Marker
          coordinate={{ latitude: destino.latitud, longitude: destino.longitud }}
          pinColor="#dc2626"
          title="Destino"
          zIndex={102}
        />
      )}
    </>
  );
}

export function CapaRuta({
  geometria,
}: {
  geometria: Array<[number, number]>;
}) {
  const coordinates = geometria
    .map(([latitude, longitude]) => ({
      latitude,
      longitude,
    }))
    .filter(
      ({ latitude, longitude }) =>
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
    );

  return (
    <Polyline
      coordinates={
        coordinates.length >= 2
          ? coordinates
          : []
      }
      strokeColor="#16a34a"
      strokeWidth={6}
      zIndex={15}
      lineCap="round"
      lineJoin="round"
    />
  );
}

const coloresRiesgo: Record<string, string> = {
  Alto: "#dc2626",
  Medio: "#facc15",
  Bajo: "#16a34a",
};

export function radioZonaPorZoom(zoom: number) {
  if (zoom <= 10) return 45;
  if (zoom <= 11) return 50;
  if (zoom <= 12) return 55;
  if (zoom <= 13) return 65;
  if (zoom <= 14) return 68;
  return 72;
}

function opacidadZonaPorZoom(zoom: number) {
  if (zoom <= 10) return 0.06;
  if (zoom <= 11) return 0.08;
  if (zoom <= 12) return 0.11;
  if (zoom <= 13) return 0.15;
  if (zoom <= 14) return 0.20;
  return 0.26;
}

function coordenada(value: number | string) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function CapaZonasRiesgo({
  zonas,
  zoom,
  onSeleccionar,
  visible,
  zonaOrigenSeleccionada,
  zonaDestinoSeleccionada,
  habilitarSeleccionZona = true,
}: {
  zonas: ZonaRiesgo[];
  zoom: number;
  onSeleccionar: (item: ElementoMapa) => void;
  visible: boolean;
  zonaOrigenSeleccionada?: string | null;
  zonaDestinoSeleccionada?: string | null;
  habilitarSeleccionZona?: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <>
      {zonas.map((zona, index) => {
        const latitude = coordenada(zona.latitud);
        const longitude = coordenada(zona.longitud);

        if (
          latitude === null ||
          longitude === null
        ) {
          return null;
        }

        const color =
          coloresRiesgo[zona.nivel] ??
          "#9ca3af";

        const rgb =
          color
            .slice(1)
            .match(/.{2}/g)
            ?.map((value) =>
              Number.parseInt(value, 16)
            ) ?? [156, 163, 175];

        const key = `${zona.comuna ?? ""}-${zona.id_zona ?? index}`;
        const zoneKey = claveZonaRiesgo(zona);
        const esOrigen = zoneKey === zonaOrigenSeleccionada;
        const esDestino = zoneKey === zonaDestinoSeleccionada;
        const colorSeleccion = esOrigen && esDestino
          ? "#7c3aed"
          : esDestino
            ? "#f97316"
            : esOrigen
              ? "#2563eb"
              : color;
        const rgbSeleccion = colorSeleccion
          .slice(1)
          .match(/.{2}/g)
          ?.map((value) => Number.parseInt(value, 16)) ?? [37, 99, 235];

        const buffers = Array.isArray(zona.geometria_zona?.centros)
          ? zona.geometria_zona.centros
          : [{ latitud: latitude, longitud: longitude }];
        const radioMetros = Number(zona.geometria_zona?.radio_metros) || radioZonaPorZoom(zoom);

        return (
          <Fragment key={key}>
            {buffers.map((buffer, bufferIndex) => {
              const bufferLatitud = coordenada(buffer.latitud);
              const bufferLongitud = coordenada(buffer.longitud);
              if (bufferLatitud === null || bufferLongitud === null) return null;
              return (
                <Circle
                  key={`${key}-buffer-${bufferIndex}`}
                  center={{ latitude: bufferLatitud, longitude: bufferLongitud }}
                  radius={radioMetros}
                  strokeColor={colorSeleccion}
                  fillColor={esOrigen || esDestino
                    ? `rgba(${rgbSeleccion[0]}, ${rgbSeleccion[1]}, ${rgbSeleccion[2]}, 0.32)`
                    : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacidadZonaPorZoom(zoom)})`}
                  strokeWidth={esOrigen || esDestino ? 4 : zoom <= 11 ? 1 : 2}
                />
              );
            })}

            {habilitarSeleccionZona && <Marker
              coordinate={{
                latitude,
                longitude,
              }}
              anchor={{
                x: 0.5,
                y: 0.5,
              }}
              tracksViewChanges={false}
              opacity={0}
              zIndex={5}
              onPress={() =>
                onSeleccionar({
                  tipo: "zona",
                  datos: zona,
                })
              }
            >
              <View
                style={styles.zoneTouchTarget}
              />
            </Marker>}
          </Fragment>
        );
      })}
    </>
  );
}

export function CapaDelitos({
  delitos,
  onSeleccionar,
}: {
  delitos: Delito[];
  onSeleccionar: (item: ElementoMapa) => void;
}) {
  return (
    <>
      {delitos.map((delito) => {
        const latitude = coordenada(delito.latitud);
        const longitude = coordenada(delito.longitud);
        if (latitude === null || longitude === null) return null;
        return (
          <Marker
            key={delito.id}
            coordinate={{
              latitude,
              longitude,
            }}
            pinColor="#111827"
            tracksViewChanges={false}
            zIndex={40}
            onPress={() =>
              onSeleccionar({
                tipo: "delito",
                datos: delito,
              })
            }
            accessibilityLabel={`Delito ${delito.grupo_delito ?? "sin clasificar"}`}
          >
            <View style={styles.delitoMarker} />
          </Marker>
        );
      })}
    </>
  );
}

export function CapaConcentracionDelitos({
  delitos,
  onSeleccionar,
  rangoHorario,
}: {
  delitos: Delito[];
  onSeleccionar: (item: ElementoMapa) => void;
  rangoHorario?: string | null;
}) {
  const concentraciones = agruparConcentracionesDelitos(delitos, rangoHorario);
  const fondos: Record<string, string> = {
    "#16a34a": "rgba(22,163,74,0.76)",
    "#facc15": "rgba(250,204,21,0.82)",
    "#dc2626": "rgba(220,38,38,0.78)",
  };

  return (
    <>
      {concentraciones.map((concentracion) => (
        <Marker
          key={concentracion.id}
          coordinate={{ latitude: concentracion.latitud, longitude: concentracion.longitud }}
          tracksViewChanges={false}
          zIndex={100}
          onPress={() => onSeleccionar({ tipo: "concentracion", datos: concentracion })}
          accessibilityLabel={`Concentración de delitos: ${concentracion.cantidad_delitos} registros`}
        >
          <View style={[styles.concentracionMarker, { backgroundColor: fondos[concentracion.color] }]}>
            <Text style={[styles.concentracionCount, concentracion.cantidad_delitos >= 3 && styles.concentracionCountHigh]}>
              {concentracion.cantidad_delitos}
            </Text>
          </View>
        </Marker>
      ))}
    </>
  );
}

export function LeyendaConcentracionDelitos() {
  return (
    <View pointerEvents="none" style={styles.concentracionLegend}>
      <Text style={styles.concentracionLegendTitle}>Concentración de delitos</Text>
      {[
        ["#16a34a", "Verde: 1 delito."],
        ["#facc15", "Amarillo: 2 delitos."],
        ["#dc2626", "Rojo: 3 o más delitos."],
      ].map(([color, label]) => (
        <View key={label} style={styles.concentracionLegendRow}>
          <View style={[styles.concentracionLegendDot, { backgroundColor: color }]} />
          <Text style={styles.concentracionLegendText}>{label}</Text>
        </View>
      ))}
      <Text style={styles.concentracionLegendNote}>Coordenadas reportadas; no puntos físicos exactos.</Text>
    </View>
  );
}

export function CapaRedPeatonal({
  segmentos,
  onSeleccionar,
}: {
  segmentos: SegmentoPeatonal[];
  onSeleccionar: (item: ElementoMapa) => void;
}) {
  return (
    <>
      {segmentos.map((segmento, index) => {
        const coordinates = (
          segmento.geometria ?? []
        )
          .map((punto) => ({
            latitude: coordenada(
              punto.latitud
            ),
            longitude: coordenada(
              punto.longitud
            ),
          }))
          .filter(
            (
              punto
            ): punto is {
              latitude: number;
              longitude: number;
            } =>
              punto.latitude !== null &&
              punto.longitude !== null
          );

        if (coordinates.length < 2) {
          return null;
        }

        const exclusiva =
          segmento.categoria_peatonal ===
          "exclusiva";

        return (
          <Polyline
            key={
              segmento.id_osm ?? index
            }
            coordinates={coordinates}
            strokeColor={
              exclusiva
                ? "#2563eb"
                : "#64748b"
            }
            strokeWidth={
              exclusiva ? 3 : 2
            }
            lineCap="round"
            lineJoin="round"
            onPress={() =>
              onSeleccionar({
                tipo: "segmento",
                datos: segmento,
              })
            }
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  zoneTouchTarget: {
    width: 42,
    height: 42,
    backgroundColor: "transparent",
  },

  delitoMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#111827",
  },
  concentracionMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  concentracionCount: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  concentracionCountHigh: {
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 2,
  },
  concentracionLegend: {
    position: "absolute",
    right: 12,
    bottom: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    elevation: 4,
  },
  concentracionLegendTitle: {
    marginBottom: 4,
    color: "#111827",
    fontSize: 11,
    fontWeight: "700",
  },
  concentracionLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: 5,
  },
  concentracionLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderColor: "#fff",
    borderWidth: 1,
  },
  concentracionLegendText: {
    color: "#111827",
    fontSize: 10,
  },
  concentracionLegendNote: {
    marginTop: 2,
    maxWidth: 190,
    color: "#4b5563",
    fontSize: 9,
  },
});
