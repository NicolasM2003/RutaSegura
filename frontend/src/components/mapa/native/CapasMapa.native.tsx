import { Fragment } from "react";
import {
  Circle,
  Marker,
  Polyline,
} from "react-native-maps";
import { StyleSheet, View } from "react-native";

export type ZonaRiesgo = {
  id_zona?: string | number;
  latitud: number | string;
  longitud: number | string;
  nivel: string;
  cantidad_delitos?: number;
  puntajeFinal?: number;
  comuna?: string;
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
}: {
  origen: PuntoRuta | null;
  destino: PuntoRuta | null;
}) {
  return (
    <>
      {origen && (
        <Marker
          coordinate={{ latitude: origen.latitud, longitude: origen.longitud }}
          pinColor="#2563eb"
          title="Origen"
          zIndex={20}
        />
      )}
      {destino && (
        <Marker
          coordinate={{ latitude: destino.latitud, longitude: destino.longitud }}
          pinColor="#dc2626"
          title="Destino"
          zIndex={21}
        />
      )}
    </>
  );
}

export function CapaRuta({ geometria }: { geometria: Array<[number, number]> }) {
  if (geometria.length < 2) return null;

  return (
    <Polyline
      coordinates={geometria.map(([latitude, longitude]) => ({ latitude, longitude }))}
      strokeColor="#16a34a"
      strokeWidth={6}
      zIndex={15}
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
}: {
  zonas: ZonaRiesgo[];
  zoom: number;
  onSeleccionar: (item: ElementoMapa) => void;
  visible: boolean;
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

        return (
          <Fragment key={key}>
            <Circle
              center={{
                latitude,
                longitude,
              }}
              radius={radioZonaPorZoom(zoom)}
              strokeColor={color}
              fillColor={`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacidadZonaPorZoom(zoom)})`}
              strokeWidth={zoom <= 11 ? 1 : 2}
            />

            <Marker
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
            </Marker>
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
        const latitude = coordenada(
          delito.latitud
        );

        const longitude = coordenada(
          delito.longitud
        );

        if (
          latitude === null ||
          longitude === null
        ) {
          return null;
        }

        return (
          <Marker
            key={delito.id}
            coordinate={{
              latitude,
              longitude,
            }}
            pinColor="#111827"
            tracksViewChanges={false}
            onPress={() =>
              onSeleccionar({
                tipo: "delito",
                datos: delito,
              })
            }
            accessibilityLabel={`Delito ${
              delito.grupo_delito ??
              "sin clasificar"
            }`}
          >
            <View style={styles.delitoMarker} />
          </Marker>
        );
      })}
    </>
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
});
