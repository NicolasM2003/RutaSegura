const {
  construirSolicitudInterpretacionRutas,
} = require("./solicitud-interpretacion.service");

const {
  solicitarRespuestaOpenAI,
} = require("./openai.service");

const {
  validarRespuestaModelo,
} = require("./validar-respuesta.service");

/**
 * Interpreta las rutas calculadas por RutaSegura.
 *
 * Prepara el contexto, solicita la interpretación al modelo
 * y valida la respuesta antes de devolverla.
 *
 * El segundo parámetro permite simular la solicitud a OpenAI
 * durante las pruebas, sin consumir créditos.
 */
const interpretarRutasAlternativas = async (
  datos,
  solicitarRespuesta = solicitarRespuestaOpenAI
) => {
  // Preparar el contexto. Esta operación no consume API.
  const solicitud =
    construirSolicitudInterpretacionRutas(datos);

  const rutas = datos?.resultado?.rutas;

  const perfilesEsperados = Array.isArray(rutas)
    ? rutas.map((ruta) => ruta?.perfil_ruta)
    : [];

  // Evitar llamadas facturables cuando los perfiles no
  // permiten comprobar la correspondencia de las respuestas.
  if (
    perfilesEsperados.length === 0 ||
    perfilesEsperados.some(
      (perfil) =>
        typeof perfil !== "string" ||
        !perfil.trim()
    ) ||
    new Set(perfilesEsperados).size !==
      perfilesEsperados.length
  ) {
    const error = new Error(
      "Las rutas deben tener perfiles válidos y únicos."
    );

    error.code = "IA_PERFILES_ESPERADOS_INVALIDOS";
    throw error;
  }

  // Solicitar la interpretación al servicio de OpenAI.
  const respuesta = await solicitarRespuesta(solicitud);

  // No devolver la respuesta hasta validar su estructura.
  return validarRespuestaModelo(
    respuesta,
    perfilesEsperados
  );
};

module.exports = {
  interpretarRutasAlternativas,
};