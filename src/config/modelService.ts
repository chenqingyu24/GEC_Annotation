import type { ModelOption, ModelProviderId } from "../types";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface ModelProvider {
  id: ModelProviderId;
  baseUrl: string;
  recommendedModels: ModelOption[];
}

export interface StoredModelPreferences {
  providerId: ModelProviderId;
  selectedModel: string;
  customBaseUrl: string;
}

export interface ModelRefreshResult {
  models: ModelOption[];
  modelListReady: boolean;
}

export const MODEL_CONFIG_STORAGE_KEY = "gec-model-config";
export const DEFAULT_MODEL_PROVIDER_ID: ModelProviderId = "deepseek";

const MODEL_PROVIDERS: Record<ModelProviderId, ModelProvider> = {
  deepseek: {
    id: "deepseek",
    baseUrl: "https://api.deepseek.com",
    recommendedModels: [
      createRecommendedModel("deepseek-v4-flash", "DeepSeek V4 Flash", "deepseek"),
      createRecommendedModel("deepseek-v4-pro", "DeepSeek V4 Pro", "deepseek")
    ]
  },
  openai: {
    id: "openai",
    baseUrl: "https://api.openai.com/v1",
    recommendedModels: [
      createRecommendedModel("gpt-4.1", "GPT-4.1", "openai"),
      createRecommendedModel("gpt-4.1-mini", "GPT-4.1 mini", "openai")
    ]
  },
  qwen: {
    id: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    recommendedModels: [
      createRecommendedModel("qwen-plus", "Qwen Plus", "qwen"),
      createRecommendedModel("qwen-flash", "Qwen Flash", "qwen")
    ]
  },
  minimax: {
    id: "minimax",
    baseUrl: "https://api.minimaxi.com/v1",
    recommendedModels: [
      createRecommendedModel("MiniMax-M2.7", "MiniMax M2.7", "minimax"),
      createRecommendedModel("MiniMax-M2.5", "MiniMax M2.5", "minimax")
    ]
  },
  glm: {
    id: "glm",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    recommendedModels: [
      createRecommendedModel("glm-5.2", "GLM-5.2", "glm"),
      createRecommendedModel("glm-4.7-flash", "GLM-4.7 Flash", "glm")
    ]
  },
  kimi: {
    id: "kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    recommendedModels: [
      createRecommendedModel("kimi-k2.6", "Kimi K2.6", "kimi"),
      createRecommendedModel("kimi-k2.5", "Kimi K2.5", "kimi")
    ]
  },
  claude: {
    id: "claude",
    baseUrl: "https://api.anthropic.com/v1",
    recommendedModels: [
      createRecommendedModel("claude-sonnet-4-6", "Claude Sonnet 4.6", "claude"),
      createRecommendedModel("claude-opus-4-8", "Claude Opus 4.8", "claude")
    ]
  },
  other: {
    id: "other",
    baseUrl: "",
    recommendedModels: []
  }
};

const EMPTY_MODEL_PREFERENCES: StoredModelPreferences = {
  providerId: DEFAULT_MODEL_PROVIDER_ID,
  selectedModel: "",
  customBaseUrl: ""
};

export function getModelProviders(): ModelProvider[] {
  return Object.values(MODEL_PROVIDERS).map(cloneProvider);
}

export function getModelProvider(providerId: ModelProviderId): ModelProvider {
  return cloneProvider(MODEL_PROVIDERS[providerId]);
}

export function resolveProviderBaseUrl(providerId: ModelProviderId, customBaseUrl: string): string {
  return providerId === "other" ? customBaseUrl.trim() : MODEL_PROVIDERS[providerId].baseUrl;
}

export function mergeModelOptions(
  recommendedModels: ModelOption[],
  refreshedModels: ModelOption[]
): ModelOption[] {
  const knownIds = new Set<string>();
  const mergedModels: ModelOption[] = [];

  for (const model of [...recommendedModels, ...refreshedModels]) {
    const id = model.id.trim();

    if (id === "" || knownIds.has(id)) {
      continue;
    }

    knownIds.add(id);
    mergedModels.push({ ...model, id });
  }

  return mergedModels;
}

export function resolveModelRefresh(
  providerId: ModelProviderId,
  refreshedModels: ModelOption[] | null
): ModelRefreshResult {
  const recommendedModels = getModelProvider(providerId).recommendedModels;
  const models = refreshedModels === null
    ? recommendedModels
    : mergeModelOptions(recommendedModels, refreshedModels);

  return {
    models,
    modelListReady: models.length > 0
  };
}

export function getStoredModelPreferences(
  storage: StorageLike | undefined = browserStorage()
): StoredModelPreferences {
  try {
    const rawValue = storage?.getItem(MODEL_CONFIG_STORAGE_KEY);

    if (!rawValue) {
      return { ...EMPTY_MODEL_PREFERENCES };
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (isStoredModelPreferences(parsedValue)) {
      return {
        providerId: parsedValue.providerId,
        selectedModel: parsedValue.selectedModel,
        customBaseUrl: parsedValue.customBaseUrl
      };
    }

    if (isLegacyModelPreferences(parsedValue)) {
      return {
        providerId: "other",
        selectedModel: parsedValue.selectedModel,
        customBaseUrl: parsedValue.baseUrl
      };
    }
  } catch {
    // Ignore malformed or unavailable storage.
  }

  return { ...EMPTY_MODEL_PREFERENCES };
}

export function setStoredModelPreferences(
  preferences: StoredModelPreferences,
  storage: StorageLike | undefined = browserStorage()
): void {
  try {
    storage?.setItem(
      MODEL_CONFIG_STORAGE_KEY,
      JSON.stringify({
        providerId: preferences.providerId,
        selectedModel: preferences.selectedModel,
        customBaseUrl: preferences.customBaseUrl
      })
    );
  } catch {
    // Ignore unavailable storage, for example private browsing or server rendering.
  }
}

function createRecommendedModel(id: string, label: string, provider: string): ModelOption {
  return { id, label, provider, requires_api_key: true };
}

function cloneProvider(provider: ModelProvider): ModelProvider {
  return {
    ...provider,
    recommendedModels: provider.recommendedModels.map((model) => ({ ...model }))
  };
}

function isStoredModelPreferences(value: unknown): value is StoredModelPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isModelProviderId(value.providerId) &&
    typeof value.selectedModel === "string" &&
    typeof value.customBaseUrl === "string"
  );
}

function isLegacyModelPreferences(value: unknown): value is { baseUrl: string; selectedModel: string } {
  return isRecord(value) && typeof value.baseUrl === "string" && typeof value.selectedModel === "string";
}

function isModelProviderId(value: unknown): value is ModelProviderId {
  return typeof value === "string" && value in MODEL_PROVIDERS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function browserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}
