import { describe, expect, it } from "vitest";
import * as modelService from "./modelService";

describe("model providers", () => {
  it("maps built-in providers to API URLs and recommended models", () => {
    const getModelProvider = Reflect.get(modelService, "getModelProvider") as
      | ((providerId: string) => unknown)
      | undefined;

    expect(getModelProvider?.("deepseek")).toMatchObject({
      id: "deepseek",
      baseUrl: "https://api.deepseek.com",
      recommendedModels: expect.arrayContaining([
        expect.objectContaining({ id: "deepseek-v4-flash" }),
        expect.objectContaining({ id: "deepseek-v4-pro" })
      ])
    });
    expect(getModelProvider?.("qwen")).toMatchObject({
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    });
    expect(getModelProvider?.("other")).toMatchObject({ id: "other", baseUrl: "" });
  });

  it("merges recommended and refreshed model options without duplicates", () => {
    const mergeModelOptions = Reflect.get(modelService, "mergeModelOptions") as
      | ((recommended: unknown[], refreshed: unknown[]) => unknown)
      | undefined;

    expect(
      mergeModelOptions?.(
        [
          { id: "model-a", label: "Model A", provider: "deepseek", requires_api_key: true },
          { id: "model-b", label: "Model B", provider: "deepseek", requires_api_key: true }
        ],
        [
          { id: "model-b", label: "Account Model B", provider: "remote", requires_api_key: false },
          { id: "model-c", label: "Model C", provider: "remote", requires_api_key: false }
        ]
      )
    ).toEqual([
      { id: "model-a", label: "Model A", provider: "deepseek", requires_api_key: true },
      { id: "model-b", label: "Model B", provider: "deepseek", requires_api_key: true },
      { id: "model-c", label: "Model C", provider: "remote", requires_api_key: false }
    ]);
  });

  it("keeps recommended models selectable when refreshing an account model list fails", () => {
    const resolveModelRefresh = Reflect.get(modelService, "resolveModelRefresh") as
      | ((providerId: string, refreshedModels: unknown[] | null) => unknown)
      | undefined;

    expect(resolveModelRefresh?.("deepseek", null)).toMatchObject({
      modelListReady: true,
      models: expect.arrayContaining([
        expect.objectContaining({ id: "deepseek-v4-flash" }),
        expect.objectContaining({ id: "deepseek-v4-pro" })
      ])
    });
    expect(resolveModelRefresh?.("other", null)).toEqual({ models: [], modelListReady: false });
  });
});

describe("stored model preferences", () => {
  it("persists provider, model, and custom API URL without an API key", () => {
    const storage = new MemoryStorage();
    const loadPreferences = Reflect.get(modelService, "getStoredModelPreferences") as
      | ((storage: MemoryStorage) => unknown)
      | undefined;
    const savePreferences = Reflect.get(modelService, "setStoredModelPreferences") as
      | ((preferences: unknown, storage: MemoryStorage) => void)
      | undefined;

    expect(loadPreferences?.(storage)).toEqual({
      providerId: "deepseek",
      selectedModel: "",
      customBaseUrl: ""
    });

    savePreferences?.(
      {
        providerId: "other",
        selectedModel: "my-model",
        customBaseUrl: "https://models.example/v1"
      },
      storage
    );

    expect(loadPreferences?.(storage)).toEqual({
      providerId: "other",
      selectedModel: "my-model",
      customBaseUrl: "https://models.example/v1"
    });
    expect(storage.getItem("gec-model-config")).not.toContain("apiKey");
  });

  it("migrates the previous API URL preference to the other provider", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "gec-model-config",
      JSON.stringify({ baseUrl: "https://legacy.example/v1", selectedModel: "legacy-model" })
    );
    const loadPreferences = Reflect.get(modelService, "getStoredModelPreferences") as
      | ((storage: MemoryStorage) => unknown)
      | undefined;

    expect(loadPreferences?.(storage)).toEqual({
      providerId: "other",
      selectedModel: "legacy-model",
      customBaseUrl: "https://legacy.example/v1"
    });
  });
});

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
