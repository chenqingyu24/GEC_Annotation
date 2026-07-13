import { useEffect, useState } from "react";
import type { GrammarCheckResult, ModelConfig, ModelProviderId } from "../types";
import { checkGrammar, fetchModelList } from "../services/modelApi";
import {
  getModelProvider,
  getModelProviders,
  getStoredModelPreferences,
  resolveModelRefresh,
  resolveProviderBaseUrl,
  setStoredModelPreferences
} from "../config/modelService";
import { useI18n } from "../i18n";

interface ModelAnalysisPanelProps {
  initialInputText?: string;
  initialSelectedText?: string;
  initialResult?: GrammarCheckResult | null;
}

export function ModelAnalysisPanel({
  initialInputText = "",
  initialSelectedText = "",
  initialResult = null
}: ModelAnalysisPanelProps) {
  const { messages: m } = useI18n();
  const {
    config,
    updateConfig,
    refreshModels,
    loadingModels,
    message,
    setMessage,
    error,
    setError
  } = useModelConfig();
  const [inputText, setInputText] = useState(initialInputText);
  const [selectedText, setSelectedText] = useState(initialSelectedText);
  const [result, setResult] = useState<GrammarCheckResult | null>(initialResult);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    const selectionText = readSelectedText();
    const text = resolveAnalysisText(selectionText, inputText);

    setError("");
    setMessage("");
    setResult(null);
    setSelectedText(text);

    if (selectionText.trim() !== "") {
      setInputText(text);
    }

    if (text === "") {
      setError(m.enterOrSelectText);
      return;
    }

    if (config.apiKey.trim() === "") {
      setError(m.fillApiKey);
      return;
    }

    if (config.baseUrl.trim() === "") {
      setError(m.fillServiceUrl);
      return;
    }

    if (config.selectedModel.trim() === "") {
      setError(m.selectModelFirst);
      return;
    }

    setAnalyzing(true);

    try {
      const nextResult = await checkGrammar(config, {
        text,
        model: config.selectedModel
      });
      setResult(nextResult);
    } catch (analysisError) {
      setError(messageFromError(analysisError));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section className="panel result-panel model-analysis-panel" aria-labelledby="model-analysis-title">
      <div className="panel-header">
        <h2 id="model-analysis-title">{m.modelAnalysis}</h2>
      </div>

      <ModelConfigFields
        config={config}
        onConfigChange={updateConfig}
        onRefreshModels={refreshModels}
        loadingModels={loadingModels}
        refreshDisabled={analyzing}
      />

      <label className="field model-text-field">
        <span className="field-label">{m.textToAnalyze}</span>
        <textarea
          rows={3}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder={m.textToAnalyzePlaceholder}
        />
      </label>

      <div className="button-row model-action-row">
        <button
          className="primary-button"
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? m.analyzing : m.analyzeWithModel}
        </button>
      </div>

      <div className="status-stack" aria-live="polite">
        {message ? <div className="status-message info-message">{message}</div> : null}
        {error ? <div className="status-message error-message">{error}</div> : null}
      </div>

      {selectedText ? (
        <div className="model-selected-text">
          <span className="field-label">{m.selectedText}</span>
          <p>{selectedText}</p>
        </div>
      ) : null}

      {result ? <ModelResult result={result} /> : null}
    </section>
  );
}

function ModelResult({ result }: { result: GrammarCheckResult }) {
  const { messages: m } = useI18n();

  return (
    <div className="model-result">
      <div className={result.has_error ? "model-verdict error-verdict" : "model-verdict ok-verdict"}>
        {result.has_error ? m.grammarError : m.noGrammarError}
      </div>

      {result.has_error ? (
        <div className="model-result-block">
          <span className="field-label">{m.analysisErrorType}</span>
          <p>{result.error_type?.trim() || m.analysisUncategorized}</p>
        </div>
      ) : null}

      {result.corrected_text ? (
        <div className="model-result-block">
          <span className="field-label">{m.correctedText}</span>
          <p>{result.corrected_text}</p>
        </div>
      ) : null}

      {result.explanation ? (
        <div className="model-result-block">
          <span className="field-label">{m.explanation}</span>
          <p>{result.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}

export interface UseModelConfigResult {
  config: ModelConfig;
  updateConfig: <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => void;
  refreshModels: () => Promise<void>;
  loadingModels: boolean;
  message: string;
  setMessage: (message: string) => void;
  error: string;
  setError: (error: string) => void;
}

export function useModelConfig(): UseModelConfigResult {
  const { messages: m } = useI18n();
  const [config, setConfig] = useState<ModelConfig>(() => {
    const preferences = getStoredModelPreferences();
    const provider = getModelProvider(preferences.providerId);

    return {
      providerId: preferences.providerId,
      baseUrl: resolveProviderBaseUrl(preferences.providerId, preferences.customBaseUrl),
      customBaseUrl: preferences.customBaseUrl,
      apiKey: "",
      selectedModel: preferences.selectedModel,
      models: provider.recommendedModels,
      modelListReady: false
    };
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setStoredModelPreferences({
      providerId: config.providerId,
      selectedModel: config.selectedModel,
      customBaseUrl: config.customBaseUrl
    });
  }, [config.customBaseUrl, config.providerId, config.selectedModel]);

  const updateConfig = <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => {
    setConfig((currentConfig) => {
      if (key === "providerId") {
        const providerId = value as ModelProviderId;
        const provider = getModelProvider(providerId);

        return {
          ...currentConfig,
          providerId,
          baseUrl: resolveProviderBaseUrl(providerId, currentConfig.customBaseUrl),
          selectedModel: "",
          models: provider.recommendedModels,
          modelListReady: false
        };
      }

      if (key === "customBaseUrl") {
        const customBaseUrl = value as string;

        if (currentConfig.providerId !== "other") {
          return { ...currentConfig, customBaseUrl };
        }

        return {
          ...currentConfig,
          customBaseUrl,
          baseUrl: resolveProviderBaseUrl("other", customBaseUrl),
          selectedModel: "",
          models: [],
          modelListReady: false
        };
      }

      if (key === "apiKey") {
        return { ...currentConfig, apiKey: value as string };
      }

      if (key === "selectedModel") {
        return { ...currentConfig, selectedModel: value as string };
      }

      return currentConfig;
    });
  };

  const refreshModels = async () => {
    setError("");
    setMessage("");

    if (!canRefreshModelList(config)) {
      setError(config.apiKey.trim() === "" ? m.fillApiKey : m.fillServiceUrl);
      return;
    }

    const providerId = config.providerId;
    setLoadingModels(true);

    try {
      const refreshedModels = await fetchModelList(config);
      const refreshResult = resolveModelRefresh(providerId, refreshedModels);

      setConfig((currentConfig) =>
        currentConfig.providerId === providerId
          ? {
              ...currentConfig,
              models: refreshResult.models,
              selectedModel: "",
              modelListReady: refreshResult.modelListReady
            }
          : currentConfig
      );
      setMessage(m.modelsLoaded(refreshResult.models.length));
    } catch (refreshError) {
      const refreshResult = resolveModelRefresh(providerId, null);

      setConfig((currentConfig) =>
        currentConfig.providerId === providerId
          ? {
              ...currentConfig,
              models: refreshResult.models,
              selectedModel: "",
              modelListReady: refreshResult.modelListReady
            }
          : currentConfig
      );
      setError(messageFromError(refreshError));

      if (refreshResult.models.length > 0) {
        setMessage(m.modelsFallback(refreshResult.models.length));
      }
    } finally {
      setLoadingModels(false);
    }
  };

  return {
    config,
    updateConfig,
    refreshModels,
    loadingModels,
    message,
    setMessage,
    error,
    setError
  };
}

export function ModelConfigFields({
  config,
  onConfigChange,
  onRefreshModels,
  loadingModels,
  refreshDisabled = false,
  showRefreshControl = true
}: {
  config: ModelConfig;
  onConfigChange: <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => void;
  onRefreshModels: () => void | Promise<void>;
  loadingModels: boolean;
  refreshDisabled?: boolean;
  showRefreshControl?: boolean;
}) {
  const { messages: m } = useI18n();
  const isOtherProvider = config.providerId === "other";

  return (
    <div className="model-config-grid">
      <label className="field">
        <span className="field-label">{m.modelProviderLabel}</span>
        <select
          value={config.providerId}
          onChange={(event) => onConfigChange("providerId", event.target.value as ModelProviderId)}
        >
          {getModelProviders().map((provider) => (
            <option value={provider.id} key={provider.id}>
              {m.modelProviderName(provider.id)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">{m.apiKeyLabel}</span>
        <input
          type="password"
          value={config.apiKey}
          onChange={(event) => onConfigChange("apiKey", event.target.value)}
          placeholder={m.apiKeyPlaceholder}
          autoComplete="off"
        />
      </label>

      {isOtherProvider ? (
        <label className="field">
          <span className="field-label">API URL</span>
          <input
            type="url"
            value={config.customBaseUrl}
            onChange={(event) => onConfigChange("customBaseUrl", event.target.value)}
            placeholder="https://api.example.com/v1"
            autoComplete="url"
          />
        </label>
      ) : null}

      {config.providerId === "claude" ? (
        <div className="status-message warning-message model-provider-warning">
          {m.claudeCompatibilityWarning}
        </div>
      ) : null}

      {showRefreshControl ? (
        <div className="model-refresh-control">
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onRefreshModels}
            disabled={loadingModels || refreshDisabled || !canRefreshModelList(config)}
          >
            {loadingModels ? m.refreshingModels : m.refreshModels}
          </button>
        </div>
      ) : null}

      {isOtherProvider ? (
        <label className="field">
          <span className="field-label">{m.customModelIdLabel}</span>
          <input
            type="text"
            value={config.selectedModel}
            onChange={(event) => onConfigChange("selectedModel", event.target.value)}
            placeholder={m.refreshModelFirst}
            autoComplete="off"
          />
        </label>
      ) : (
        <label className="field">
          <span className="field-label">{m.modelLabel}</span>
          <select
            value={config.selectedModel}
            onChange={(event) => onConfigChange("selectedModel", event.target.value)}
            disabled={!config.modelListReady}
          >
            <option value="">{m.selectModelPlaceholder}</option>
            {config.models.map((model) => (
              <option value={model.id} key={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function canRefreshModelList(config: ModelConfig): boolean {
  return (
    config.apiKey.trim() !== "" &&
    (config.providerId !== "other" || config.customBaseUrl.trim() !== "")
  );
}

function readSelectedText(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.getSelection()?.toString().trim() ?? "";
}

export function resolveAnalysisText(selectionText: string, inputText: string): string {
  const trimmedSelection = selectionText.trim();

  if (trimmedSelection !== "") {
    return trimmedSelection;
  }

  return inputText.trim();
}

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
