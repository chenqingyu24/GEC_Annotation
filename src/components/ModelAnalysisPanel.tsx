import { useState } from "react";
import type { GrammarCheckResult, ModelConfig, ModelOption } from "../types";
import { checkGrammar, fetchModelList } from "../services/modelApi";

interface ModelAnalysisPanelProps {
  initialInputText?: string;
  initialSelectedText?: string;
  initialResult?: GrammarCheckResult | null;
}

const DEFAULT_MODEL_API_BASE_URL =
  import.meta.env.VITE_MODEL_API_BASE_URL?.trim() || "http://127.0.0.1:8001";

const DEFAULT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "rule-based-demo",
    label: "本地规则演示",
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

export function ModelAnalysisPanel({
  initialInputText = "",
  initialSelectedText = "",
  initialResult = null
}: ModelAnalysisPanelProps) {
  const [config, setConfig] = useState<ModelConfig>({
    baseUrl: DEFAULT_MODEL_API_BASE_URL,
    apiKey: "",
    selectedModel: DEFAULT_MODEL_OPTIONS[0]?.id ?? "",
    models: DEFAULT_MODEL_OPTIONS
  });
  const [inputText, setInputText] = useState(initialInputText);
  const [selectedText, setSelectedText] = useState(initialSelectedText);
  const [result, setResult] = useState<GrammarCheckResult | null>(initialResult);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const updateConfig = <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      [key]: value
    }));
  };

  const handleRefreshModels = async () => {
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
      setMessage(`已加载 ${models.length} 个模型。`);
    } catch (refreshError) {
      setError(messageFromError(refreshError));
    } finally {
      setLoadingModels(false);
    }
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
      setError("请输入或选中文本。");
      return;
    }

    if (config.baseUrl.trim() === "") {
      setError("请先填写服务地址。");
      return;
    }

    if (config.selectedModel.trim() === "") {
      setError("请先选择模型。");
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
        <h2 id="model-analysis-title">模型分析</h2>
      </div>

      <div className="model-config-grid">
        <label className="field">
          <span className="field-label">大模型 API Key，本地模型可留空</span>
          <input
            type="password"
            value={config.apiKey}
            onChange={(event) => updateConfig("apiKey", event.target.value)}
            placeholder="可留空"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span className="field-label">选择模型</span>
          <select
            value={config.selectedModel}
            onChange={(event) => updateConfig("selectedModel", event.target.value)}
          >
            {config.models.length === 0 ? (
              <option value="">请先刷新模型</option>
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

      <label className="field model-text-field">
        <span className="field-label">待分析文本</span>
        <textarea
          rows={3}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="输入待分析文本"
        />
      </label>

      <div className="button-row model-action-row">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={handleRefreshModels}
          disabled={loadingModels}
        >
          {loadingModels ? "刷新中..." : "刷新模型"}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? "分析中..." : "大模型分析"}
        </button>
      </div>

      <div className="status-stack" aria-live="polite">
        {message ? <div className="status-message info-message">{message}</div> : null}
        {error ? <div className="status-message error-message">{error}</div> : null}
      </div>

      {selectedText ? (
        <div className="model-selected-text">
          <span className="field-label">选中文本</span>
          <p>{selectedText}</p>
        </div>
      ) : null}

      {result ? <ModelResult result={result} /> : null}
    </section>
  );
}

function ModelResult({ result }: { result: GrammarCheckResult }) {
  return (
    <div className="model-result">
      <div className={result.has_error ? "model-verdict error-verdict" : "model-verdict ok-verdict"}>
        {result.has_error ? "存在语法错误" : "无语法错误"}
      </div>

      {result.corrected_text ? (
        <div className="model-result-block">
          <span className="field-label">纠正句</span>
          <p>{result.corrected_text}</p>
        </div>
      ) : null}

      {result.explanation ? (
        <div className="model-result-block">
          <span className="field-label">解释</span>
          <p>{result.explanation}</p>
        </div>
      ) : null}
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

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
