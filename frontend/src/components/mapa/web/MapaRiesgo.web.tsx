import {
  useEffect,
  useState,
} from "react";

export default function MapaRiesgo() {
  const [MapaCliente, setMapaCliente] =
    useState<React.ComponentType | null>(
      null
    );

  useEffect(() => {
    /*
     * Este import solamente se ejecuta
     * en el navegador.
     *
     * Evita que Leaflet se intente
     * ejecutar durante SSR.
     */
    import("./MapaRiesgoCliente")
      .then((mod) => {
        setMapaCliente(
          () => mod.default
        );
      })
      .catch((error) => {
        console.error(
          "Error cargando mapa web:",
          error
        );
      });
  }, []);

  if (!MapaCliente) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif",
          color: "#374151",
        }}
      >
        Cargando mapa...
      </div>
    );
  }

  return <MapaCliente />;
}