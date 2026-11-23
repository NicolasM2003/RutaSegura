
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
 * Convierte un valor a número finito.
 * Evita interpretar null o valores vacíos como cero.
 */
const obtenerNumeroFinito = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    (typeof valor === "string" && !valor.trim()) ||
    !["number", "string"].includes(typeof valor)
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
};

/**
 * Determina la alternativa de menor riesgo.
 *
 * Criterios:
 * 1. Menor puntaje de riesgo.
 * 2. Menor distancia cuando existe empate.
 * 3. Menor tiempo cuando persiste el empate.
 *
 * El modelo no decide cuál es la ruta más segura.
 */
const obtenerPerfilMasSeguro = (rutas) => {
  const rutasEvaluadas = rutas.map((ruta, indice) => {
    const puntaje = obtenerNumeroFinito(
      ruta?.puntaje_riesgo
    );

    if (puntaje === null) {
      const error = new Error(
        "No se puede determinar la ruta más segura porque falta un puntaje de riesgo válido."
      );

      error.code = "IA_PUNTAJES_RIESGO_INVALIDOS";
      throw error;
    }

    return {
      ruta,
      indice,
      puntaje,
      distancia:
        obtenerNumeroFinito(ruta.distancia_metros) ??
        Infinity,
      tiempo:
        obtenerNumeroFinito(
          ruta.tiempo_estimado_minutos
        ) ?? Infinity,
    };
  });

  rutasEvaluadas.sort(
    (a, b) =>
      a.puntaje - b.puntaje ||
      a.distancia - b.distancia ||
      a.tiempo - b.tiempo ||
      a.indice - b.indice
  );

  return rutasEvaluadas[0].ruta.perfil_ruta;
};

/**
 * Errores que permiten solicitar una segunda respuesta.
 *
 * El reintento se limita a un único intento adicional.
 */
const ERRORES_REINTENTABLES = new Set([
  "IA_RESPUESTA_VACIA",
  "IA_JSON_INVALIDO",
  "IA_ESTRUCTURA_INVALIDA",
  "IA_CAMPO_INVALIDO",
  "IA_COMPARACIONES_INVALIDAS",
  "IA_PERFIL_INVALIDO",
  "IA_PERFIL_RECOMENDADO_INVALIDO",
  "IA_RECOMENDACION_NO_ES_MAS_SEGURA",
  "IA_CONSIDERACIONES_INVALIDAS",
]);

/**
 * Valida una respuesta de OpenAI.
 */
const validarRespuesta = (
  respuesta,
  perfilesEsperados,
  perfilMasSeguro
) => {
  return validarRespuestaModelo(
    respuesta,
    perfilesEsperados,
    perfilMasSeguro
  );
};

/**
 * Interpreta las rutas calculadas por RutaSegura.
 *
 * El backend determina cuál alternativa tiene menor riesgo.
 * OpenAI interpreta las diferencias y explica las ventajas
 * y desventajas de cada alternativa.
 */
const interpretarRutasAlternativas = async (
  datos,
  solicitarRespuesta = solicitarRespuestaOpenAI
) => {
  const rutas = datos?.resultado?.rutas;

  const perfilesEsperados = Array.isArray(rutas)
    ? rutas.map((ruta) => ruta?.perfil_ruta)
    : [];

  // Verificar perfiles antes de realizar cualquier solicitud.
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

  // Determinar la ruta de menor riesgo utilizando
  // exclusivamente los datos calculados por el backend.
  const perfilMasSeguro =
    obtenerPerfilMasSeguro(rutas);

  // La preferencia corresponde al perfil principal
  // solicitado al generar las alternativas.
  const perfilSeleccionado =
    datos?.perfilSeleccionado ??
    datos?.resultado?.perfil_principal ??
    null;

  // Preparar el contexto para OpenAI.
  const solicitud =
    construirSolicitudInterpretacionRutas({
      ...datos,
      perfilSeleccionado,
      perfilMasSeguro,
    });

  // Primera solicitud.
  const respuesta = await solicitarRespuesta(
    solicitud
  );

  try {
    return validarRespuesta(
      respuesta,
      perfilesEsperados,
      perfilMasSeguro
    );
  } catch (errorValidacion) {
    // No repetir solicitudes por errores que no dependen
    // de la estructura de la respuesta del modelo.
    if (
      !ERRORES_REINTENTABLES.has(
        errorValidacion?.code
      )
    ) {
      throw errorValidacion;
    }

    console.warn(
      "IA - Respuesta incompleta o inválida. Se realizará un reintento.",
      {
        codigo: errorValidacion.code,
        perfilesEsperados,
      }
    );

    // Construir una instrucción correctiva.
    const instruccionesReintento = `
${solicitud.instrucciones}

CORRECCIÓN OBLIGATORIA:

La respuesta anterior no cumplió la validación.

Debes generar nuevamente el objeto JSON completo.

La lista exacta de perfiles que debes incluir es:

${perfilesEsperados.map((perfil) => `- ${perfil}`).join("\n")}

El arreglo comparaciones debe tener exactamente
${perfilesEsperados.length} elemento(s).

Incluye todos los perfiles, sin repetir ninguno.

No omitas la ruta más segura ni la ruta seleccionada
por el usuario.

Mantén la recomendación en perfil_mas_seguro.

Genera las explicaciones de manera breve y utiliza
exclusivamente las métricas recibidas.

Devuelve únicamente el JSON solicitado.
`;

    const solicitudReintento = {
      ...solicitud,
      instrucciones: instruccionesReintento,
      maxOutputTokens: 1600,
    };

    // Segunda y última solicitud.
    const respuestaReintento = await solicitarRespuesta(
      solicitudReintento
    );

    // La segunda respuesta también debe superar
    // exactamente las mismas validaciones.
    return validarRespuesta(
      respuestaReintento,
      perfilesEsperados,
      perfilMasSeguro
    );
  }
};

module.exports = {
  interpretarRutasAlternativas,
  obtenerPerfilMasSeguro,
};
