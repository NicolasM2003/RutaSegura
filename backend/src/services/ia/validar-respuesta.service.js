
/**
 * Valida la respuesta generada por el modelo de IA.
 *
 * La recomendación y las comparaciones deben corresponder
 * exclusivamente a los perfiles de ruta recibidos.
 *
 * Además, comprueba que la recomendación coincida con
 * la alternativa de menor riesgo determinada por el backend.
 */

const crearErrorValidacion = (codigo, mensaje) => {
  const error = new Error(mensaje);
  error.name = "RespuestaModeloInvalidaError";
  error.code = codigo;
  return error;
};

const validarTexto = (valor, campo, longitudMaxima) => {
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

  const recibidas = Object.keys(valor).sort();
  const esperadas = [...clavesEsperadas].sort();

  if (JSON.stringify(recibidas) !== JSON.stringify(esperadas)) {
    throw crearErrorValidacion(
      "IA_ESTRUCTURA_INVALIDA",
      `El campo ${campo} no cumple la estructura esperada.`
    );
  }
};

const validarRespuestaModelo = (
  respuesta,
  perfilesEsperados,
  perfilMasSeguro = null
) => {
  if (
    !Array.isArray(perfilesEsperados) ||
    perfilesEsperados.length === 0 ||
    perfilesEsperados.some(
      (perfil) => typeof perfil !== "string" || !perfil.trim()
    ) ||
    new Set(perfilesEsperados).size !== perfilesEsperados.length
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
    "recomendacion",
    "comparaciones",
    "consideraciones",
  ]);

  const resumenGeneral = validarTexto(
    datos.resumen_general,
    "resumen_general",
    600
  );

  const perfilesPermitidos = new Set(perfilesEsperados);

  // Validar el perfil de menor riesgo determinado por el backend.
  if (perfilMasSeguro !== null) {
    if (
      typeof perfilMasSeguro !== "string" ||
      !perfilMasSeguro.trim() ||
      !perfilesPermitidos.has(perfilMasSeguro)
    ) {
      throw crearErrorValidacion(
        "IA_PERFIL_MAS_SEGURO_INVALIDO",
        "El perfil de menor riesgo no corresponde a una ruta existente."
      );
    }
  }

  validarObjeto(datos.recomendacion, "recomendacion", [
    "perfil_ruta",
    "motivo",
  ]);

  const perfilRecomendado = validarTexto(
    datos.recomendacion.perfil_ruta,
    "recomendacion.perfil_ruta",
    100
  );

  if (!perfilesPermitidos.has(perfilRecomendado)) {
    throw crearErrorValidacion(
      "IA_PERFIL_RECOMENDADO_INVALIDO",
      "La recomendación no corresponde a una ruta existente."
    );
  }

  // Garantizar que la IA recomiende la alternativa de menor riesgo.
  if (
    perfilMasSeguro !== null &&
    perfilRecomendado !== perfilMasSeguro
  ) {
    throw crearErrorValidacion(
      "IA_RECOMENDACION_NO_ES_MAS_SEGURA",
      "La recomendación de la IA no coincide con la alternativa de menor riesgo."
    );
  }

  const motivoRecomendacion = validarTexto(
    datos.recomendacion.motivo,
    "recomendacion.motivo",
    500
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

  const perfilesRecibidos = new Set();

  const comparaciones = datos.comparaciones.map(
    (comparacion, indice) => {
      validarObjeto(comparacion, `comparaciones[${indice}]`, [
        "perfil_ruta",
        "explicacion",
      ]);

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
    recomendacion: {
      perfil_ruta: perfilRecomendado,
      motivo: motivoRecomendacion,
    },
    comparaciones,
    consideraciones,
  };
};

module.exports = {
  validarRespuestaModelo,
};