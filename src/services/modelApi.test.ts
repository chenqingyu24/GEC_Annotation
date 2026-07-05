import { afterEach, describe, expect, it, vi } from "vitest";
import { BROWSER_DEMO_API_BASE_URL } from "../config/modelService";
import { checkGrammar, fetchModelList } from "./modelApi";

describe("modelApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses model list from a generic models response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          models: [
            { id: "gec-a", label: "GEC A", provider: "local", requires_api_key: false },
            { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", provider: "deepseek", requires_api_key: true }
          ]
        })
      )
    );

    await expect(fetchModelList({ baseUrl: "http://localhost:8000", apiKey: "" })).resolves.toEqual([
      { id: "gec-a", label: "GEC A", provider: "local", requires_api_key: false },
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", provider: "deepseek", requires_api_key: true }
    ]);
  });

  it("parses legacy and OpenAI-compatible model lists into display options", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: "qwen" }, { id: "deepseek" }] }))
    );

    await expect(fetchModelList({ baseUrl: "http://localhost:8000/", apiKey: "secret" })).resolves.toEqual([
      { id: "qwen", label: "qwen", provider: "remote", requires_api_key: false },
      { id: "deepseek", label: "deepseek", provider: "remote", requires_api_key: false }
    ]);
  });

  it("sends grammar check text, model, and optional authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        has_error: true,
        corrected_text: "我昨天去了学校。",
        explanation: "缺少动态助词。"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkGrammar(
      { baseUrl: "http://localhost:8000", apiKey: "secret" },
      { text: "我昨天去学校。", model: "gec-a" }
    );

    expect(result).toEqual({
      has_error: true,
      corrected_text: "我昨天去了学校。",
      explanation: "缺少动态助词。"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/grammar-check",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret"
        },
        body: JSON.stringify({ text: "我昨天去学校。", model: "gec-a" })
      })
    );
  });

  it("throws readable errors for HTTP failures and invalid grammar responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "bad" }, 500)));

    await expect(
      checkGrammar(
        { baseUrl: "http://localhost:8000", apiKey: "" },
        { text: "我昨天去学校。", model: "gec-a" }
      )
    ).rejects.toThrow("模型服务请求失败");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ corrected_text: "ok" })));

    await expect(
      checkGrammar(
        { baseUrl: "http://localhost:8000", apiKey: "" },
        { text: "我昨天去学校。", model: "gec-a" }
      )
    ).rejects.toThrow("has_error");
  });

  it("throws a readable error when the browser cannot reach the model service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchModelList({ baseUrl: "http://localhost:8000", apiKey: "" })).rejects.toThrow(
      "无法连接模型服务"
    );
  });

  it("returns the browser demo model list without a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchModelList({ baseUrl: BROWSER_DEMO_API_BASE_URL, apiKey: "" })).resolves.toEqual([
      { id: "rule-based-demo", label: "本地规则演示", provider: "local", requires_api_key: false }
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks grammar with the browser demo model without a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      checkGrammar(
        { baseUrl: BROWSER_DEMO_API_BASE_URL, apiKey: "" },
        { text: "我昨天去学校。", model: "rule-based-demo" }
      )
    ).resolves.toEqual({
      has_error: true,
      corrected_text: "我昨天去了学校。",
      explanation: expect.stringContaining("了")
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  } as Response;
}
