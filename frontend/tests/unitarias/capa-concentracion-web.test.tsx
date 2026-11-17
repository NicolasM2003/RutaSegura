import React from "react";

jest.mock("react-leaflet", () => ({
  Circle: "Circle",
  CircleMarker: "CircleMarker",
  Marker: "Marker",
  Polyline: "Polyline",
  Popup: "Popup",
}));

jest.mock("leaflet", () => ({
  divIcon: (options: unknown) => ({ options }),
}));

import { CapaConcentracionDelitos } from "../../src/components/mapa/web/CapasMapa.web";

describe("CapaConcentracionDelitos web", () => {
  it("crea un único marcador circular con el contador integrado y sobre las zonas", () => {
    const layer = CapaConcentracionDelitos({
      delitos: [
        { id: 1, latitud: "-33.024", longitud: "-71.552", rango_horario: "20:00 - 23:59" },
        { id: 2, latitud: "-33.024", longitud: "-71.552", rango_horario: "20:00 - 23:59" },
      ],
      rangoHorario: "20:00 - 23:59",
    });
    const markers = React.Children.toArray(layer.props.children) as React.ReactElement<any>[];

    expect(markers).toHaveLength(1);
    expect(markers[0].props.position).toEqual([-33.024, -71.552]);
    expect(markers[0].props.zIndexOffset).toBe(1000);
    expect(markers[0].props.icon.options.html).toContain(">2</div>");
    expect(markers[0].props.children.type).toBe("Popup");
  });
});
