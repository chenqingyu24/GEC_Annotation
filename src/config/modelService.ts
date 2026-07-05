interface ModelApiBaseUrlOptions {
  configuredBaseUrl?: string;
  isDev?: boolean;
  location?: Pick<Location, "hostname" | "origin">;
}

const LOCAL_BACKEND_API_BASE_URL = "http://127.0.0.1:8003";

export const DEFAULT_MODEL_API_BASE_URL = resolveDefaultModelApiBaseUrl();

export function resolveDefaultModelApiBaseUrl({
  configuredBaseUrl = import.meta.env.VITE_MODEL_API_BASE_URL ?? "",
  isDev = import.meta.env.DEV,
  location = typeof window === "undefined" ? undefined : window.location
}: ModelApiBaseUrlOptions = {}): string {
  const trimmedConfiguredBaseUrl = configuredBaseUrl.trim();

  if (trimmedConfiguredBaseUrl !== "") {
    return trimmedConfiguredBaseUrl;
  }

  if (!isDev && location && isLocalHostname(location.hostname)) {
    return location.origin;
  }

  return LOCAL_BACKEND_API_BASE_URL;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
