const mockResponsesCreate = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    responses: {
      create: mockResponsesCreate,
    },
  }))
);

const OpenAI = require("openai");

const {
  solicitarRespuestaOpenAI,
} = require("../../src/services/ia/openai.service");

describe("solicitarRespuestaOpenAI", () => {
  beforeEach(() => {
    mockResponsesCreate.mockReset();

    process.env.OPENAI_API_KEY = "test-api-key";
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    process.env.OPENAI_TIMEOUT_MS = "12000";
    process.env.OPENAI_MAX_RETRIES = "0";
  });

  test("debe configurar el timeout y desactivar los reintentos", async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: "Respuesta de prueba",
    });

    await solicitarRespuestaOpenAI({
      instrucciones: "Interpreta las rutas.",
      entrada: "Datos de prueba",
    });

    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      timeout: 12000,
      maxRetries: 0,
    });
  });

  test("debe identificar un timeout", async () => {
    const error = Object.assign(
      new Error("Request timed out"),
      {
        name: "APIConnectionTimeoutError",
      }
    );

    mockResponsesCreate.mockRejectedValue(error);

    await expect(
      solicitarRespuestaOpenAI({
        instrucciones: "Instrucciones",
        entrada: "Datos",
      })
    ).rejects.toMatchObject({
      name: "OpenAIServiceError",
      code: "OPENAI_TIMEOUT",
      message:
        "La solicitud a OpenAI excedió el tiempo máximo de espera.",
    });
  });

  test("debe identificar un error de autenticación", async () => {
    mockResponsesCreate.mockRejectedValue(
      Object.assign(new Error("Unauthorized"), {
        status: 401,
        requestID: "req_test_401",
      })
    );

    await expect(
      solicitarRespuestaOpenAI({
        instrucciones: "Instrucciones",
        entrada: "Datos",
      })
    ).rejects.toMatchObject({
      code: "OPENAI_AUTHENTICATION_ERROR",
      status: 401,
      requestId: "req_test_401",
    });
  });

  test("debe identificar un límite de uso o cuota", async () => {
    mockResponsesCreate.mockRejectedValue(
      Object.assign(new Error("Rate limit"), {
        status: 429,
      })
    );

    await expect(
      solicitarRespuestaOpenAI({
        instrucciones: "Instrucciones",
        entrada: "Datos",
      })
    ).rejects.toMatchObject({
      code: "OPENAI_RATE_LIMIT",
      status: 429,
    });
  });

  test("debe identificar un error temporal del servidor", async () => {
    mockResponsesCreate.mockRejectedValue(
      Object.assign(new Error("Internal server error"), {
        status: 500,
      })
    );

    await expect(
      solicitarRespuestaOpenAI({
        instrucciones: "Instrucciones",
        entrada: "Datos",
      })
    ).rejects.toMatchObject({
      code: "OPENAI_SERVER_ERROR",
      status: 500,
    });
  });
});