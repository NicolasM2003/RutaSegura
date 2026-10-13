const {
  construirContextoRutasIA,
} = require("./contexto");

/**
 * Instrucciones para interpretar las rutas de RutaSegura.
 *
 * El backend calcula las rutas y sus métricas.
 * El modelo solamente interpreta los resultados recibidos.
 */
const INSTRUCCIONES_INTERPRETACION_RUTAS = `
Eres un asistente explicativo de RutaSegura.
Tu tarea es comparar rutas peatonales utilizando exclusivamente
los datos proporcionados por el backend.

REGLAS:
1. No calcules rutas ni modifiques las métricas recibidas.
2. No inventes distancias, tiempos, delitos, estadísticas o zonas.
3. Utiliza los niveles y puntajes de riesgo entregados por el backend.
4. No inventes umbrales ni escalas de riesgo que no estén definidos.
5. Compara las alternativas considerando distancia, tiempo,
   nivel de riesgo, puntaje y zonas de riesgo afectadas disponibles.
6. Explica las diferencias sin afirmar que una ruta es completamente segura.
7. Si falta información, indícalo sin inventarla.
8. Responde en español, de forma clara y concisa.
9. Cada ruta debe aparecer exactamente una vez en las comparaciones.
10. Utiliza el perfil_ruta exacto que aparece en los datos recibidos.

FORMATO DE RESPUESTA:
Devuelve únicamente un objeto JSON válido con esta estructura:
{
  "resumen_general": "Resumen de la comparación",
  "comparaciones": [
    {
      "perfil_ruta": "Identificador del perfil recibido",
      "explicacion": "Explicación de esta alternativa"
    }
  ],
  "consideraciones": [
    "Advertencia o limitación relevante"
  ]
}

El arreglo comparaciones debe incluir todas las rutas recibidas.
El arreglo consideraciones puede estar vacío si no hay observaciones.
No incluyas Markdown ni texto fuera del objeto JSON.
`;

/**
 * Construye la solicitud que utilizará el servicio de OpenAI.
 *
 * Recibe el resultado generado por calcularRutasAlternativas()
 * y prepara el contexto sin incluir geometrías ni segmentos
 * detallados que no son necesarios para la interpretación.
 */
const construirSolicitudInterpretacionRutas = ({
  comuna,
  origen,
  destino,
  resultado,
  rangoHorario,
  rango_horario,
}) => {
  if (
    !resultado ||
    !Array.isArray(resultado.rutas) ||
    resultado.rutas.length === 0
  ) {
    throw new TypeError(
      "Se requiere un resultado con al menos una ruta."
    );
  }

  const contextoRutas = construirContextoRutasIA({
  origen,
  destino,
  rutas: resultado.rutas,
  rangoHorario: rangoHorario ?? rango_horario,
});

const contexto = {
  comuna:
    typeof comuna === "string" && comuna.trim()
      ? comuna.trim()
      : null,

  ...contextoRutas,
};

  return {
    instrucciones: INSTRUCCIONES_INTERPRETACION_RUTAS,
    entrada: JSON.stringify(contexto),
    maxOutputTokens: 350,
  };
};

module.exports = {
  construirSolicitudInterpretacionRutas,
  INSTRUCCIONES_INTERPRETACION_RUTAS,
};