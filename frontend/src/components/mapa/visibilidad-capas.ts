export type EstadoVisibilidadCapas = {
  delitosIndividuales: boolean;
  concentracionDelitos: boolean;
  zonasRiesgo: boolean;
};

export function obtenerVisibilidadCapas(
  estado: EstadoVisibilidadCapas,
  zoom: number,
) {
  const zoomPermiteDelitos = zoom >= 13;
  return {
    delitosIndividuales: estado.delitosIndividuales && zoomPermiteDelitos,
    concentracionDelitos: estado.concentracionDelitos && zoomPermiteDelitos,
    zonasRiesgo: estado.zonasRiesgo,
  };
}
