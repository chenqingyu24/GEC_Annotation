import { useEffect, useMemo, useState } from "react";
import type { GrammarCheckResult, ModelConfig, ModelOption } from "../types";
import { checkGrammar, fetchModelList } from "../services/modelApi";
import { BROWSER_DEMO_API_BASE_URL, DEFAULT_MODEL_API_BASE_URL } from "../config/modelService";
import { useI18n, type Locale } from "../i18n";

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

  const handleRefreshModels = async () => {
    await refreshModels();
  };

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

      <ModelConfigFields config={config} onConfigChange={updateConfig} />

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
          className="secondary-button compact-button"
          type="button"
          onClick={handleRefreshModels}
          disabled={loadingModels}
        >
          {loadingModels ? m.refreshingModels : m.refreshModels}
        </button>
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
  const { locale, messages: m } = useI18n();
  const defaultModelOptions = useMemo(() => defaultModelOptionsForLocale(locale), [locale]);
  const initialModelOptions =
    DEFAULT_MODEL_API_BASE_URL === BROWSER_DEMO_API_BASE_URL
      ? browserDemoModelOptions(defaultModelOptions)
      : defaultModelOptions;
  const [config, setConfig] = useState<ModelConfig>({
    baseUrl: DEFAULT_MODEL_API_BASE_URL,
    apiKey: "",
    selectedModel: initialModelOptions[0]?.id ?? "",
    models: initialModelOptions
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setConfig((currentConfig) => {
      if (!hasOnlyDefaultModelIds(currentConfig.models)) {
        return currentConfig;
      }

      const localizedModels =
        DEFAULT_MODEL_API_BASE_URL === BROWSER_DEMO_API_BASE_URL
          ? browserDemoModelOptions(defaultModelOptions)
          : defaultModelOptions;

      return {
        ...currentConfig,
        models: localizedModels,
        selectedModel: localizedModels.some((model) => model.id === currentConfig.selectedModel)
          ? currentConfig.selectedModel
          : localizedModels[0]?.id ?? ""
      };
    });
  }, [defaultModelOptions]);

  const updateConfig = <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      [key]: value
    }));
  };

  const refreshModels = async () => {
    setError("");
    setMessage("");
    setLoadingModels(true);

    try {
      const models = await fetchModelList(config);
      setConfig((currentConfig) => ({
        ...currentConfig,
        models,
        selectedModel: models.some((model) => model.id === currentConfig.selectedModel)
          ? currentConfig.selectedModel
          : models[0]?.id ?? ""
      }));
      setMessage(m.modelsLoaded(models.length));
    } catch (refreshError) {
      setError(messageFromError(refreshError));
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
  onConfigChange
}: {
  config: ModelConfig;
  onConfigChange: <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => void;
}) {
  const { messages: m } = useI18n();

  return (
    <div className="model-config-grid">
      <label className="field">
        <span className="field-label">{m.apiKeyLabel}</span>
        <input
          type="password"
          value={config.apiKey}
          onChange={(event) => onConfigChange("apiKey", event.target.value)}
          placeholder={m.optional}
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span className="field-label">{m.selectModel}</span>
        <select
          value={config.selectedModel}
          onChange={(event) => onConfigChange("selectedModel", event.target.value)}
        >
          {config.models.length === 0 ? (
            <option value="">{m.refreshModelFirst}</option>
          ) : (
            config.models.map((model) => (
              <option value={model.id} key={model.id}>
                {model.label}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
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

function defaultModelOptionsForLocale(locale: Locale): ModelOption[] {
  return [
    {
      id: "rule-based-demo",
      label: locale === "zh" ? "本地规则演示" : "Local Rule Demo",
      provider: "local",
      requires_api_key: false
    },
    {
      id: "deepseek-v4-flash",
      label: "DeepSeek V4 Flash",
      provider: "deepseek",
      requires_api_key: true
    },
    {
      id: "deepseek-v4-pro",
      label: "DeepSeek V4 Pro",
      provider: "deepseek",
      requires_api_key: true
    }
  ];
}

function browserDemoModelOptions(modelOptions: ModelOption[]): ModelOption[] {
  return modelOptions.filter((model) => model.id === "rule-based-demo");
}

function hasOnlyDefaultModelIds(modelOptions: ModelOption[]): boolean {
  const defaultIds = new Set(["rule-based-demo", "deepseek-v4-flash", "deepseek-v4-pro"]);
  return modelOptions.every((model) => defaultIds.has(model.id));
}

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
