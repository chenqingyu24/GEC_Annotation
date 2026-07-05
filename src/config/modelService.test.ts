import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_API_BASE_URL } from "./modelService";

describe("model service config", () => {
  it("uses the alternate local backend port by default", () => {
    expect(DEFAULT_MODEL_API_BASE_URL).toBe("http://127.0.0.1:8003");
  });
});
