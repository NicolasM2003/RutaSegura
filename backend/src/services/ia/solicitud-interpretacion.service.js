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
110. Debes recomendar exactamente una de las rutas recibidas.

11. El perfil recomendado debe coincidir exactamente con un
perfil_ruta de los datos recibidos.

12. RutaSegura prioriza la seguridad peatonal. Para recomendar,
considera primero el puntaje de riesgo y después la distancia
y el tiempo de recorrido.

13. Un puntaje de riesgo menor representa un riesgo relativo
menor entre las alternativas comparadas. No confundas el nivel
de riesgo categórico con el puntaje numérico: dos rutas con
nivel "Medio" pueden tener puntajes distintos.

14. Si una ruta tiene un puntaje de riesgo menor y las otras
alternativas solo ofrecen mejoras marginales en distancia o
tiempo, recomienda la de menor riesgo.

15. Si recomiendas una alternativa con mayor puntaje de riesgo,
justifica claramente por qué su reducción de distancia o tiempo
compensa esa diferencia. No inventes umbrales numéricos.

16. En las explicaciones, utiliza los valores concretos
disponibles para comparar las alternativas. No describas un
puntaje como favorable sin indicar respecto de qué ruta.

17. No elijas automáticamente la ruta más corta ni afirmes
que una ruta es completamente segura.

18. Si las alternativas presentan diferencias mínimas o los
datos no permiten una conclusión clara, indícalo y explica
las limitaciones de la recomendación.
FORMATO DE RESPUESTA:
Devuelve únicamente un objeto JSON válido con esta estructura:
{
  "resumen_general": "Resumen de la comparación entre alternativas.",
  "recomendacion": {
    "perfil_ruta": "identificador exacto de una ruta recibida",
    "motivo": "Motivo de la recomendación basado en las métricas."
  },
  "comparaciones": [
    {
      "perfil_ruta": "identificador de una ruta recibida",
      "explicacion": "Explicación de las ventajas y desventajas."
    }
  ],
  "consideraciones": [
    "Limitación o advertencia relevante."
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
    maxOutputTokens: 600,
  };
};

module.exports = {
  construirSolicitudInterpretacionRutas,
  INSTRUCCIONES_INTERPRETACION_RUTAS,
};