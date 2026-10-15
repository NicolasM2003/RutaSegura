/**
 * Valida la respuesta generada por el modelo de IA.
 *
 * Comprueba el JSON, los campos obligatorios y que cada
 * comparación corresponda a un perfil de ruta esperado.
 */

const crearErrorValidacion = (codigo, mensaje) => {
  const error = new Error(mensaje);
  error.name = "RespuestaModeloInvalidaError";
  error.code = codigo;

  return error;
};

const validarTexto = (
  valor,
  campo,
  longitudMaxima
) => {
  if (
    typeof valor !== "string" ||
    !valor.trim() ||
    valor.trim().length > longitudMaxima
  ) {
    throw crearErrorValidacion(
      "IA_CAMPO_INVALIDO",
      `El campo ${campo} es inválido.`
    );
  }

  return valor.trim();
};

const validarObjeto = (valor, campo, clavesEsperadas) => {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    throw crearErrorValidacion(
      "IA_ESTRUCTURA_INVALIDA",
      `El campo ${campo} debe ser un objeto válido.`
    );
  }

  const clavesRecibidas = Object.keys(valor).sort();
  const clavesOrdenadas = [...clavesEsperadas].sort();

  if (
    JSON.stringify(clavesRecibidas) !==
    JSON.stringify(clavesOrdenadas)
  ) {
    throw crearErrorValidacion(
      "IA_ESTRUCTURA_INVALIDA",
      `El campo ${campo} no cumple la estructura esperada.`
    );
  }
};

/**
 * @param {{ output_text?: string }} respuesta Respuesta del SDK.
 * @param {string[]} perfilesEsperados Perfiles presentes en el contexto enviado.
 * @returns {{ resumen_general: string, comparaciones: Array, consideraciones: string[] }}
 */
const validarRespuestaModelo = (
  respuesta,
  perfilesEsperados
) => {
  if (
    !Array.isArray(perfilesEsperados) ||
    perfilesEsperados.length === 0 ||
    perfilesEsperados.some(
      (perfil) =>
        typeof perfil !== "string" ||
        !perfil.trim()
    ) ||
    new Set(perfilesEsperados).size !==
      perfilesEsperados.length
  ) {
    throw crearErrorValidacion(
      "IA_PERFILES_ESPERADOS_INVALIDOS",
      "Los perfiles esperados no son válidos."
    );
  }

  if (
    !respuesta ||
    typeof respuesta.output_text !== "string" ||
    !respuesta.output_text.trim()
  ) {
    throw crearErrorValidacion(
      "IA_RESPUESTA_VACIA",
      "El modelo no devolvió una respuesta de texto."
    );
  }

  let datos;

  try {
    datos = JSON.parse(respuesta.output_text);
  } catch {
    throw crearErrorValidacion(
      "IA_JSON_INVALIDO",
      "El modelo no devolvió un JSON válido."
    );
  }

  validarObjeto(datos, "respuesta", [
    "resumen_general",
    "comparaciones",
    "consideraciones",
  ]);

  const resumenGeneral = validarTexto(
    datos.resumen_general,
    "resumen_general",
    600
  );

  if (
    !Array.isArray(datos.comparaciones) ||
    datos.comparaciones.length !== perfilesEsperados.length
  ) {
    throw crearErrorValidacion(
      "IA_COMPARACIONES_INVALIDAS",
      "Debe existir una comparación por cada ruta esperada."
    );
  }

  const perfilesPermitidos = new Set(perfilesEsperados);
  const perfilesRecibidos = new Set();

  const comparaciones = datos.comparaciones.map(
    (comparacion, indice) => {
      validarObjeto(
        comparacion,
        `comparaciones[${indice}]`,
        ["perfil_ruta", "explicacion"]
      );

      const perfil = validarTexto(
        comparacion.perfil_ruta,
        `comparaciones[${indice}].perfil_ruta`,
        100
      );

      if (
        !perfilesPermitidos.has(perfil) ||
        perfilesRecibidos.has(perfil)
      ) {
        throw crearErrorValidacion(
          "IA_PERFIL_INVALIDO",
          `El perfil ${perfil} no existe o está duplicado.`
        );
      }

      perfilesRecibidos.add(perfil);

      return {
        perfil_ruta: perfil,
        explicacion: validarTexto(
          comparacion.explicacion,
          `comparaciones[${indice}].explicacion`,
          500
        ),
      };
    }
  );

  if (
    !Array.isArray(datos.consideraciones) ||
    datos.consideraciones.length > 5
  ) {
    throw crearErrorValidacion(
      "IA_CONSIDERACIONES_INVALIDAS",
      "El arreglo de consideraciones no es válido."
    );
  }

  const consideraciones = datos.consideraciones.map(
    (consideracion, indice) =>
      validarTexto(
        consideracion,
        `consideraciones[${indice}]`,
        250
      )
  );

  return {
    resumen_general: resumenGeneral,
    comparaciones,
    consideraciones,
  };
};

module.exports = {
  validarRespuestaModelo,
};