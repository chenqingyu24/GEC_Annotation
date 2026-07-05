import type { GrammarCheckRequest, GrammarCheckResult, ModelConfig, ModelOption } from "../types";

type ModelConnection = Pick<ModelConfig, "baseUrl" | "apiKey">;

export async function fetchModelList(config: ModelConnection): Promise<ModelOption[]> {
  const response = await requestModelService(`${normalizeBaseUrl(config.baseUrl)}/models`, {
    method: "GET",
    headers: buildHeaders(config.apiKey)
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(`模型服务请求失败 (${response.status})。`);
  }

  return parseModelList(data);
}

export async function checkGrammar(
  config: ModelConnection,
  request: GrammarCheckRequest
): Promise<GrammarCheckResult> {
  if (request.text.trim() === "") {
    throw new Error("选中文本不能为空。");
  }

  if (request.model.trim() === "") {
    throw new Error("请先选择模型。");
  }

  const response = await requestModelService(`${normalizeBaseUrl(config.baseUrl)}/grammar-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(config.apiKey)
    },
    body: JSON.stringify(request)
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(`模型服务请求失败 (${response.status})。`);
  }

  return parseGrammarCheckResult(data);
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim();

  if (trimmedBaseUrl === "") {
    throw new Error("服务地址不能为空。");
  }

  return trimmedBaseUrl.replace(/\/+$/, "");
}

async function requestModelService(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error("无法连接模型服务。请确认服务已启动、地址正确，并允许来自当前页面的 CORS 请求。");
  }
}

function buildHeaders(apiKey: string): Record<string, string> {
  const trimmedApiKey = apiKey.trim();

  if (trimmedApiKey === "") {
    return {};
  }

  return {
    Authorization: `Bearer ${trimmedApiKey}`
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("模型服务返回的不是有效 JSON。");
  }
}

function parseModelList(data: unknown): ModelOption[] {
  if (!isRecord(data)) {
    throw new Error("模型列表响应必须是 JSON 对象。");
  }

  if (Array.isArray(data.models)) {
    const models = data.models
      .map((model) => parseModelOption(model))
      .filter((model): model is ModelOption => model !== null);

    if (models.length > 0) {
      return models;
    }
  }

  if (Array.isArray(data.data)) {
    const models = data.data
      .map((item) => (isRecord(item) && typeof item.id === "string" ? item.id : ""))
      .filter((model) => model !== "")
      .map((model) => createModelOption(model, "remote", false));

    if (models.length > 0) {
      return models;
    }
  }

  throw new Error("模型列表响应需要包含 models 数组或 data[].id。");
}

function parseModelOption(value: unknown): ModelOption | null {
  if (typeof value === "string") {
    return createModelOption(value, "remote", false);
  }

  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim() === "") {
    return null;
  }

  return {
    id: value.id,
    label: typeof value.label === "string" && value.label.trim() !== "" ? value.label : value.id,
    provider: typeof value.provider === "string" && value.provider.trim() !== "" ? value.provider : "remote",
    requires_api_key: typeof value.requires_api_key === "boolean" ? value.requires_api_key : false
  };
}

function createModelOption(id: string, provider: string, requiresApiKey: boolean): ModelOption {
  return {
    id,
    label: id,
    provider,
    requires_api_key: requiresApiKey
  };
}

function parseGrammarCheckResult(data: unknown): GrammarCheckResult {
  if (!isRecord(data)) {
    throw new Error("语法分析响应必须是 JSON 对象。");
  }

  if (typeof data.has_error !== "boolean") {
    throw new Error("语法分析响应必须包含布尔字段 has_error。");
  }

  return {
    has_error: data.has_error,
    corrected_text: typeof data.corrected_text === "string" ? data.corrected_text : undefined,
    explanation: typeof data.explanation === "string" ? data.explanation : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
