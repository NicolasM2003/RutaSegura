import React from "react";

jest.mock("react-native-maps", () => ({
  Circle: "Circle",
  Marker: "Marker",
  Polyline: "Polyline",
}));

import { CapaConcentracionDelitos } from "../../src/components/mapa/native/CapasMapa.native";

const delitos = [
  { id: 1, latitud: "-33.024", longitud: "-71.552", rango_horario: "20:00 - 23:59" },
  { id: 2, latitud: "-33.024", longitud: "-71.552", rango_horario: "20:00 - 23:59" },
  { id: 3, latitud: "-33.025", longitud: "-71.552", rango_horario: "16:00 - 19:59" },
];

describe("CapaConcentracionDelitos native", () => {
  it("renderiza un marcador por coordenada y horario, con contador integrado", () => {
    const layer = CapaConcentracionDelitos({
      delitos,
      rangoHorario: "20:00 - 23:59",
      onSeleccionar: jest.fn(),
    });
    const markers = React.Children.toArray(layer.props.children) as React.ReactElement<any>[];

    expect(markers).toHaveLength(1);
    expect(markers[0].props.accessibilityLabel).toBe("Concentración de delitos: 2 registros");
    expect(markers[0].props.zIndex).toBe(100);
    const badge = markers[0].props.children as React.ReactElement<any>;
    expect(badge.props.children.props.children).toBe(2);
    expect(badge.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ backgroundColor: "rgba(250,204,21,0.82)" }),
    ]));
  });

  it("seleccionar el círculo entrega el grupo y sus registros originales", () => {
    const onSeleccionar = jest.fn();
    const layer = CapaConcentracionDelitos({
      delitos,
      rangoHorario: "20:00 - 23:59",
      onSeleccionar,
    });
    const [marker] = React.Children.toArray(layer.props.children) as React.ReactElement<any>[];

    marker.props.onPress();

    expect(onSeleccionar).toHaveBeenCalledWith(expect.objectContaining({
      tipo: "concentracion",
      datos: expect.objectContaining({
        cantidad_delitos: 2,
        delitos: [delitos[0], delitos[1]],
      }),
    }));
  });
});
