import type { GrammarCheckRequest, GrammarCheckResult, ModelConfig, ModelOption } from "../types";

type ModelConnection = Pick<ModelConfig, "baseUrl" | "apiKey">;

const GRAMMAR_SYSTEM_PROMPT =
  "你是中文语法错误检测与纠错模型。只返回 JSON，不要输出 Markdown、解释性前后缀或代码块。" +
  "JSON 必须包含布尔字段 has_error；当 has_error 为 true 时，必须包含简短中文字段 error_type。" +
  "如有修改建议，可包含 corrected_text；可包含 explanation。";

export async function fetchModelList(config: ModelConnection): Promise<ModelOption[]> {
  const response = await requestModelApi(`${normalizeApiUrl(config.baseUrl)}/models`, {
    method: "GET",
    headers: buildHeaders(config.apiKey)
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}).`);
  }

  return parseModelList(data);
}

export async function checkGrammar(
  config: ModelConnection,
  request: GrammarCheckRequest
): Promise<GrammarCheckResult> {
  if (request.text.trim() === "") {
    throw new Error("Selected text cannot be empty.");
  }

  if (request.model.trim() === "") {
    throw new Error("Select or enter a model ID first.");
  }

  const response = await requestModelApi(`${normalizeApiUrl(config.baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(config.apiKey)
    },
    body: JSON.stringify({
      model: request.model.trim(),
      messages: [
        { role: "system", content: GRAMMAR_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please check this sentence for Chinese grammar errors and provide a correction when needed:\n${request.text.trim()}`
        }
      ],
      stream: false
    })
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}).`);
  }

  return parseChatCompletion(data);
}

function normalizeApiUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim();

  if (trimmedBaseUrl === "") {
    throw new Error("API URL cannot be empty.");
  }

  return trimmedBaseUrl.replace(/\/+$/, "");
}

async function requestModelApi(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "Unable to reach the API URL. Check the URL, network connection, and whether the service allows browser CORS requests."
    );
  }
}

function buildHeaders(apiKey: string): Record<string, string> {
  const trimmedApiKey = apiKey.trim();

  return trimmedApiKey === "" ? {} : { Authorization: `Bearer ${trimmedApiKey}` };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("The API response is not valid JSON.");
  }
}

function parseModelList(data: unknown): ModelOption[] {
  if (!isRecord(data)) {
    throw new Error("The model list response must be a JSON object.");
  }

  if (Array.isArray(data.data)) {
    const models = data.data
      .map((item) => (isRecord(item) && typeof item.id === "string" ? item.id.trim() : ""))
      .filter((id) => id !== "")
      .map((id) => createModelOption(id));

    if (models.length > 0) {
      return models;
    }
  }

  if (Array.isArray(data.models)) {
    const models = data.models
      .map((model) => parseModelOption(model))
      .filter((model): model is ModelOption => model !== null);

    if (models.length > 0) {
      return models;
    }
  }

  throw new Error("The model list response must contain data[].id.");
}

function parseModelOption(value: unknown): ModelOption | null {
  if (typeof value === "string" && value.trim() !== "") {
    return createModelOption(value.trim());
  }

  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim() === "") {
    return null;
  }

  return {
    id: value.id.trim(),
    label: typeof value.label === "string" && value.label.trim() !== "" ? value.label : value.id,
    provider: typeof value.provider === "string" && value.provider.trim() !== "" ? value.provider : "remote",
    requires_api_key: typeof value.requires_api_key === "boolean" ? value.requires_api_key : false
  };
}

function createModelOption(id: string): ModelOption {
  return {
    id,
    label: id,
    provider: "remote",
    requires_api_key: false
  };
}

function parseChatCompletion(data: unknown): GrammarCheckResult {
  if (!isRecord(data) || !Array.isArray(data.choices) || data.choices.length === 0) {
    throw new Error("The chat completion response must contain choices[0].message.content.");
  }

  const firstChoice = data.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message) || typeof firstChoice.message.content !== "string") {
    throw new Error("The chat completion response must contain choices[0].message.content.");
  }

  return parseGrammarCheckResult(parseJsonContent(firstChoice.message.content));
}

function parseJsonContent(content: string): unknown {
  const fencedJson = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(content.trim());
  const jsonContent = (fencedJson?.[1] ?? content).trim();

  try {
    return JSON.parse(jsonContent);
  } catch {
    throw new Error("The model response content is not valid JSON.");
  }
}

function parseGrammarCheckResult(data: unknown): GrammarCheckResult {
  if (!isRecord(data)) {
    throw new Error("The grammar analysis response must be a JSON object.");
  }

  if (typeof data.has_error !== "boolean") {
    throw new Error("The grammar analysis response must include boolean has_error.");
  }

  return {
    has_error: data.has_error,
    error_type: typeof data.error_type === "string" ? data.error_type : undefined,
    corrected_text: typeof data.corrected_text === "string" ? data.corrected_text : undefined,
    explanation: typeof data.explanation === "string" ? data.explanation : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
