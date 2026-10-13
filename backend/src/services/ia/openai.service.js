const OpenAI = require("openai");

let clienteOpenAI = null;

/**
 * Obtiene el cliente de OpenAI.
 * Se inicializa solamente cuando se necesita realizar una solicitud.
 */
const obtenerClienteOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "La variable OPENAI_API_KEY no está configurada."
    );
  }

  if (!clienteOpenAI) {
    clienteOpenAI = new OpenAI({
      apiKey,
    });
  }

  return clienteOpenAI;
};

/**
 * Envía una solicitud a la API Responses de OpenAI.
 *
 * Recibe las instrucciones y la entrada preparadas por el backend.
 * No calcula rutas ni determina niveles de riesgo.
 *
 * El manejo específico de errores, los tiempos de espera y
 * la validación de la respuesta se implementarán en sus
 * respectivas tareas.
 */
const solicitarRespuestaOpenAI = async ({
  instrucciones,
  entrada,
  maxOutputTokens = 300,
}) => {
  const cliente = obtenerClienteOpenAI();

  const respuesta = await cliente.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    instructions: instrucciones,
    input: entrada,
    max_output_tokens: maxOutputTokens,
  });

  return respuesta;
};

module.exports = {
  solicitarRespuestaOpenAI,
};