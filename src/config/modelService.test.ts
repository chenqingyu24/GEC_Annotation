import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_API_BASE_URL, resolveDefaultModelApiBaseUrl } from "./modelService";

describe("model service config", () => {
  it("uses the alternate local backend port by default", () => {
    expect(DEFAULT_MODEL_API_BASE_URL).toBe("http://127.0.0.1:8003");
  });

  it("uses same-origin API when production frontend is served by the local backend", () => {
    expect(
      resolveDefaultModelApiBaseUrl({
        configuredBaseUrl: "",
        isDev: false,
        location: {
          hostname: "localhost",
          origin: "http://localhost:8003"
        }
      })
    ).toBe("http://localhost:8003");
  });

  it("keeps the backend API URL when running the Vite dev server", () => {
    expect(
      resolveDefaultModelApiBaseUrl({
        configuredBaseUrl: "",
        isDev: true,
        location: {
          hostname: "localhost",
          origin: "http://localhost:5173"
        }
      })
    ).toBe("http://127.0.0.1:8003");
  });

  it("lets explicit model API configuration override runtime detection", () => {
    expect(
      resolveDefaultModelApiBaseUrl({
        configuredBaseUrl: " http://model-service.test ",
        isDev: false,
        location: {
          hostname: "localhost",
          origin: "http://localhost:8003"
        }
      })
    ).toBe("http://model-service.test");
  });
});
