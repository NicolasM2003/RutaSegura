export type DelitoConcentrado<T extends {
  latitud: number | string;
  longitud: number | string;
  rango_horario?: string | null;
}> = {
  id: string;
  latitud: number;
  longitud: number;
  rango_horario: string | null;
  cantidad_delitos: number;
  color: "#16a34a" | "#facc15" | "#dc2626";
  delitos: T[];
};

/** Agrupa para visualización solo coordenadas numéricamente idénticas. */
export function agruparConcentracionesDelitos<
  T extends {
    latitud: number | string;
    longitud: number | string;
    rango_horario?: string | null;
  },
>(delitos: T[], rangoHorario?: string | null): DelitoConcentrado<T>[] {
  const grupos = new Map<string, DelitoConcentrado<T>>();

  for (const delito of delitos) {
    if (
      delito.latitud === null || delito.latitud === undefined || delito.latitud === "" ||
      delito.longitud === null || delito.longitud === undefined || delito.longitud === ""
    ) continue;
    const latitud = Number(delito.latitud);
    const longitud = Number(delito.longitud);
    const rango = delito.rango_horario ?? null;
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) continue;
    if (rangoHorario && rango !== rangoHorario) continue;

    // Include the range in the key so an unfiltered input never merges time slots.
    const clave = JSON.stringify([latitud, longitud, rango]);
    const existente = grupos.get(clave);
    if (existente) {
      existente.delitos.push(delito);
      existente.cantidad_delitos += 1;
      existente.color = colorConcentracion(existente.cantidad_delitos);
      continue;
    }

    grupos.set(clave, {
      id: clave,
      latitud,
      longitud,
      rango_horario: rango,
      cantidad_delitos: 1,
      color: colorConcentracion(1),
      delitos: [delito],
    });
  }

  return [...grupos.values()];
}

function colorConcentracion(cantidad: number): DelitoConcentrado<never>["color"] {
  if (cantidad === 1) return "#16a34a";
  if (cantidad === 2) return "#facc15";
  return "#dc2626";
}
