const OpenAI = require("openai");

let clienteOpenAI = null;

/**
 * Configura timeout y reintentos.
 * Se utilizan valores predeterminados seguros si la
 * configuración del entorno no es válida.
 */
const obtenerConfiguracionCliente = () => {
  const timeoutConfigurado = Number(
    process.env.OPENAI_TIMEOUT_MS
  );

  const timeout =
    Number.isInteger(timeoutConfigurado) &&
    timeoutConfigurado >= 1000 &&
    timeoutConfigurado <= 60000
      ? timeoutConfigurado
      : 12000;

  const reintentosConfigurados = Number(
    process.env.OPENAI_MAX_RETRIES
  );

  const maxRetries =
    Number.isInteger(reintentosConfigurados) &&
    reintentosConfigurados >= 0 &&
    reintentosConfigurados <= 2
      ? reintentosConfigurados
      : 0;

  return {
    timeout,
    maxRetries,
  };
};

/**
 * Obtiene una instancia reutilizable del cliente.
 */
const obtenerClienteOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "La variable OPENAI_API_KEY no está configurada."
    );
  }

  if (!clienteOpenAI) {
    clienteOpenAI = new OpenAI({
      apiKey,
      ...obtenerConfiguracionCliente(),
    });
  }

  return clienteOpenAI;
};

/**
 * Convierte los errores de la API en mensajes controlados
 * para que el backend pueda identificar su causa.
 */
const normalizarErrorOpenAI = (error) => {
  const status = Number.isInteger(error?.status)
    ? error.status
    : null;

  let codigo = "OPENAI_UNKNOWN_ERROR";
  let mensaje =
    "No fue posible completar la solicitud a OpenAI.";

  if (
    error?.name === "APIConnectionTimeoutError" ||
    status === 408
  ) {
    codigo = "OPENAI_TIMEOUT";
    mensaje =
      "La solicitud a OpenAI excedió el tiempo máximo de espera.";
  } else if (status === 401) {
    codigo = "OPENAI_AUTHENTICATION_ERROR";
    mensaje =
      "OpenAI rechazó la autenticación. Verifica la clave de API.";
  } else if (status === 403) {
    codigo = "OPENAI_PERMISSION_ERROR";
    mensaje =
      "La clave de API no tiene permisos para realizar esta solicitud.";
  } else if (status === 429) {
    codigo = "OPENAI_RATE_LIMIT";
    mensaje =
      "OpenAI rechazó temporalmente la solicitud por límites de uso o cuota.";
  } else if (status === 400) {
    codigo = "OPENAI_BAD_REQUEST";
    mensaje =
      "OpenAI rechazó la solicitud. Verifica el modelo y los parámetros enviados.";
  } else if (status === 404) {
    codigo = "OPENAI_NOT_FOUND";
    mensaje =
      "No se encontró el recurso o modelo solicitado en OpenAI.";
  } else if (status !== null && status >= 500) {
    codigo = "OPENAI_SERVER_ERROR";
    mensaje =
      "El servicio de OpenAI presenta un problema temporal.";
  } else if (
    error?.name === "APIConnectionError" ||
    [
      "ECONNRESET",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
    ].includes(error?.code)
  ) {
    codigo = "OPENAI_CONNECTION_ERROR";
    mensaje =
      "No fue posible conectar con OpenAI. Verifica la conexión de red.";
  }

  const errorServicio = new Error(mensaje, {
    cause: error,
  });

  errorServicio.name = "OpenAIServiceError";
  errorServicio.code = codigo;

  if (status !== null) {
    errorServicio.status = status;
  }

  if (error?.requestID) {
    errorServicio.requestId = error.requestID;
  }

  return errorServicio;
};

/**
 * Envía una solicitud a la API Responses de OpenAI.
 */
const solicitarRespuestaOpenAI = async ({
  instrucciones,
  entrada,
  maxOutputTokens = 300,
}) => {
  const cliente = obtenerClienteOpenAI();

  try {
    return await cliente.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      instructions: instrucciones,
      input: entrada,
      max_output_tokens: maxOutputTokens,
    });
  } catch (error) {
    throw normalizarErrorOpenAI(error);
  }
};

module.exports = {
  solicitarRespuestaOpenAI,
  normalizarErrorOpenAI,
};