import { afterEach, describe, expect, it, vi } from "vitest";
import { checkGrammar, fetchModelList } from "./modelApi";

describe("modelApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads OpenAI-compatible model IDs from the configured API URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: "model-a" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchModelList({ baseUrl: " https://api.deepseek.com/ ", apiKey: "secret" })
    ).resolves.toEqual([
      { id: "model-a", label: "model-a", provider: "remote", requires_api_key: false }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/models",
      expect.objectContaining({ headers: { Authorization: "Bearer secret" } })
    );
  });

  it("sends an OpenAI-compatible chat completion request and parses fenced JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content:
                "```json\n{\"has_error\":true,\"error_type\":\"word order\",\"corrected_text\":\"corrected\",\"explanation\":\"explanation\"}\n```"
            }
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      checkGrammar(
        { baseUrl: "https://api.deepseek.com", apiKey: "secret" },
        { text: "input", model: "model-a" }
      )
    ).resolves.toEqual({
      has_error: true,
      error_type: "word order",
      corrected_text: "corrected",
      explanation: "explanation"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret"
        },
        body: expect.stringContaining('"model":"model-a"')
      })
    );
    const requestBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(requestBody).toContain('"stream":false');
    expect(requestBody).toContain("error_type");
    expect(requestBody).not.toContain("response_format");
  });

  it("reports API URL and CORS guidance when the browser cannot reach the service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchModelList({ baseUrl: "http://localhost:8000", apiKey: "" })).rejects.toThrow(
      "API URL"
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  } as Response;
}
