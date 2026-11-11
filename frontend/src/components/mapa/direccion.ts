export type DestinoRuta = "origen" | "destino";

export type ResultadoDireccion = {
  latitud: number;
  longitud: number;
  etiqueta: string;
  distanciaMetros?: number;
};

export const RADIO_BUSQUEDA_DIRECCION_METROS = 4000;

export async function buscarDirecciones(
  apiBaseUrl: string,
  consulta: string,
  referencia: { latitud: number; longitud: number },
): Promise<ResultadoDireccion[]> {
  const parametros = new URLSearchParams({
    q: consulta.trim(),
    lat: String(referencia.latitud),
    lon: String(referencia.longitud),
    radio: String(RADIO_BUSQUEDA_DIRECCION_METROS),
  });
  const respuesta = await fetch(`${apiBaseUrl}/api/geografia/buscar-direccion?${parametros.toString()}`);
  const resultado = await respuesta.json() as { data?: ResultadoDireccion[]; error?: string };
  if (!respuesta.ok) throw new Error(resultado.error || "No fue posible buscar la dirección.");
  return resultado.data ?? [];
}
