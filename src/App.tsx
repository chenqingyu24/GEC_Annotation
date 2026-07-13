import { useEffect, useMemo, useState } from "react";
import { EditGroupTable } from "./components/EditGroupTable";
import { HighlightView } from "./components/HighlightView";
import { JsonUploadPanel } from "./components/JsonUploadPanel";
import {
  ManualInputPanel,
  type ManualInputPayload
} from "./components/ManualInputPanel";
import {
  ModelConfigFields,
  canRefreshModelList,
  messageFromError,
  useModelConfig
} from "./components/ModelAnalysisPanel";
import { SampleNavigator } from "./components/SampleNavigator";
import {
  I18nProvider,
  getStoredLocale,
  messages,
  nextLocale,
  setStoredLocale,
  useI18n,
  type Locale
} from "./i18n";
import type {
  AlignmentLine,
  AlignmentView,
  DiffView,
  GrammarCheckResult,
  ModelConfig,
  Sample
} from "./types";
import { checkGrammar } from "./services/modelApi";
import { buildAlignmentView } from "./utils/buildAlignmentView";
import { buildDiffView } from "./utils/buildDiffView";
import { buildManualSample } from "./utils/parseInput";

interface CurrentViewResult {
  view: DiffView | null;
  error: string;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => getStoredLocale());

  const handleLocaleToggle = () => {
    setLocale((currentLocale) => {
      const updatedLocale = nextLocale(currentLocale);
      setStoredLocale(updatedLocale);
      return updatedLocale;
    });
  };

  return (
    <I18nProvider locale={locale}>
      <AppContent locale={locale} onLocaleToggle={handleLocaleToggle} />
    </I18nProvider>
  );
}

function AppContent({
  locale,
  onLocaleToggle
}: {
  locale: Locale;
  onLocaleToggle: () => void;
}) {
  const m = messages[locale];
  const [samples, setSamples] = useState<Sample[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [showAnalysisContent, setShowAnalysisContent] = useState(false);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const {
    config,
    updateConfig,
    refreshModels,
    loadingModels,
    message: modelMessage,
    setMessage: setModelMessage,
    error: modelError,
    setError: setModelError
  } = useModelConfig();
  const [analysisResultsByLineId, setAnalysisResultsByLineId] = useState<Record<string, GrammarCheckResult>>({});
  const [analysisLoadingByLineId, setAnalysisLoadingByLineId] = useState<Record<string, boolean>>({});
  const [analysisErrorsByLineId, setAnalysisErrorsByLineId] = useState<Record<string, string>>({});
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);

  const currentSample = samples[currentIndex];
  const currentResult = useMemo<CurrentViewResult>(() => {
    if (!currentSample) {
      return { view: null, error: "" };
    }

    try {
      return { view: buildDiffView(currentSample), error: "" };
    } catch (viewError) {
      return { view: null, error: messageFromError(viewError) };
    }
  }, [currentSample]);
  const referenceIds = useMemo(
    () =>
      currentResult.view
        ? currentResult.view.targets.filter((target) => target.type === "reference").map((target) => target.id)
        : [],
    [currentResult.view]
  );
  const activeReferenceId =
    selectedReferenceId && referenceIds.includes(selectedReferenceId)
      ? selectedReferenceId
      : referenceIds[0] ?? null;
  const currentAlignmentView = useMemo(
    () =>
      currentResult.view
        ? buildAlignmentView(
            currentResult.view.source,
            currentResult.view.targets,
            currentResult.view.edit_groups,
            activeReferenceId
          )
        : null,
    [activeReferenceId, currentResult.view]
  );

  useEffect(() => {
    setAnalysisResultsByLineId({});
    setAnalysisLoadingByLineId({});
    setAnalysisErrorsByLineId({});
    setModelMessage("");
    setModelError("");
  }, [activeReferenceId, currentResult.view?.id, setModelError, setModelMessage]);

  const handleManualSubmit = (input: ManualInputPayload) => {
    try {
      const sample = buildManualSample(input, locale);
      setSamples([sample]);
      setCurrentIndex(0);
      setSelectedGroupId(null);
      setSelectedReferenceId(null);
      setHighlightEnabled(true);
      setShowAnalysisContent(false);
      setError("");
      setWarning("");
    } catch (submitError) {
      setError(messageFromError(submitError));
    }
  };

  const handleSamplesLoaded = (nextSamples: Sample[]) => {
    setSamples(nextSamples);
    setCurrentIndex(0);
    setSelectedGroupId(null);
    setSelectedReferenceId(null);
    setHighlightEnabled(true);
    setShowAnalysisContent(false);
    setError("");
  };

  const handleClear = () => {
    setSamples([]);
    setCurrentIndex(0);
    setSelectedGroupId(null);
    setSelectedReferenceId(null);
    setHighlightEnabled(true);
    setShowAnalysisContent(false);
    setError("");
    setWarning("");
  };

  const handleSampleChange = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= samples.length) {
      return;
    }

    setCurrentIndex(nextIndex);
    setSelectedGroupId(null);
    setSelectedReferenceId(null);
  };

  const handleBatchAnalyze = async () => {
    setModelMessage("");
    setModelError("");
    setAnalysisResultsByLineId({});
    setAnalysisErrorsByLineId({});

    if (!currentAlignmentView) {
      setModelError(m.emptySample);
      return;
    }

    if (config.apiKey.trim() === "") {
      setModelError(m.fillApiKey);
      return;
    }

    if (config.baseUrl.trim() === "") {
      setModelError(m.fillServiceUrl);
      return;
    }

    if (config.selectedModel.trim() === "") {
      setModelError(m.selectModelFirst);
      return;
    }

    const linesToAnalyze = currentAlignmentView.lines.filter((line) => line.text.trim() !== "");
    const loadingMap = Object.fromEntries(linesToAnalyze.map((line) => [line.id, true]));
    setAnalysisLoadingByLineId(loadingMap);
    setBatchAnalyzing(true);

    try {
      const analysisEntries = await Promise.all(
        linesToAnalyze.map(async (line) => analyzeAlignmentLine(line, config))
      );
      const nextResults: Record<string, GrammarCheckResult> = {};
      const nextErrors: Record<string, string> = {};

      analysisEntries.forEach((entry) => {
        if (entry.result) {
          nextResults[entry.lineId] = entry.result;
        }
        if (entry.error) {
          nextErrors[entry.lineId] = entry.error;
        }
      });

      setAnalysisResultsByLineId(nextResults);
      setAnalysisErrorsByLineId(nextErrors);
    } finally {
      setAnalysisLoadingByLineId({});
      setBatchAnalyzing(false);
    }
  };

  const displayedError = error || currentResult.error;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title-block">
          <h1>{m.appTitle}</h1>
          <p className="app-subtitle">{m.appSubtitle}</p>
        </div>
        <button
          className="secondary-button compact-button language-toggle-button"
          type="button"
          onClick={onLocaleToggle}
        >
          {m.switchLanguage}
        </button>
        <div className="quick-start" aria-label={m.quickStartAria}>
          <span className="quick-start-title">{m.quickStartTitle}</span>
          <p className="quick-start-intro">{m.quickStartIntro}</p>
          <ol>
            {m.quickStartItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="control-column" aria-label={m.inputOptionsAria}>
          <ManualInputPanel onSubmit={handleManualSubmit} onClear={handleClear} />
          <JsonUploadPanel
            onSamplesLoaded={handleSamplesLoaded}
            onWarning={setWarning}
            onError={setError}
          />

          <div className="status-stack" aria-live="polite">
            {warning ? <div className="status-message warning-message">{warning}</div> : null}
            {displayedError ? (
              <div className="status-message error-message">{displayedError}</div>
            ) : null}
          </div>

          <BatchModelAnalysisPanel
            config={config}
            onConfigChange={updateConfig}
            onRefreshModels={refreshModels}
            onBatchAnalyze={handleBatchAnalyze}
            loadingModels={loadingModels}
            batchAnalyzing={batchAnalyzing}
            message={modelMessage}
            error={modelError}
          />
        </aside>

        <section className="preview-column" aria-labelledby="results-title">
          <SampleNavigator
            samples={samples}
            currentIndex={currentIndex}
            onChange={handleSampleChange}
          />
          <ResultsHeading
            hasResult={Boolean(samples.length && currentResult.view)}
            highlightEnabled={highlightEnabled}
            onToggleHighlight={() => setHighlightEnabled((enabled) => !enabled)}
            showAnalysisContent={showAnalysisContent}
            onToggleAnalysisContent={() => setShowAnalysisContent((enabled) => !enabled)}
          />

          {samples.length === 0 ? (
            <div className="result-stack">
              <div className="panel empty-result">
                {m.emptySample}
              </div>
            </div>
          ) : currentResult.view && currentAlignmentView ? (
            <ResultContent
              view={currentResult.view}
              alignmentView={currentAlignmentView}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              onReferenceChange={setSelectedReferenceId}
              highlightEnabled={highlightEnabled}
              showAnalysisContent={showAnalysisContent}
              analysisResultsByLineId={analysisResultsByLineId}
              analysisLoadingByLineId={analysisLoadingByLineId}
              analysisErrorsByLineId={analysisErrorsByLineId}
            />
          ) : (
            <div className="result-stack">
              <div className="panel empty-result">{displayedError || m.emptySample}</div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function ResultsHeading({
  hasResult,
  highlightEnabled,
  onToggleHighlight,
  showAnalysisContent = false,
  onToggleAnalysisContent
}: {
  hasResult: boolean;
  highlightEnabled: boolean;
  onToggleHighlight: () => void;
  showAnalysisContent?: boolean;
  onToggleAnalysisContent?: () => void;
}) {
  const { messages: m } = useI18n();

  return (
    <div className="section-heading">
      <h2 id="results-title">{m.resultsTitle}</h2>
      {hasResult ? (
        <div className="section-heading-actions">
          {onToggleAnalysisContent ? (
            <button
              className="primary-button compact-button result-analysis-toggle"
              type="button"
              aria-pressed={showAnalysisContent}
              onClick={onToggleAnalysisContent}
            >
              {showAnalysisContent ? m.hideAnalysisContent : m.showAnalysisContent}
            </button>
          ) : null}
          <button
            className="secondary-button compact-button result-highlight-toggle"
            type="button"
            aria-pressed={highlightEnabled}
            onClick={onToggleHighlight}
          >
            {highlightEnabled ? m.hideHighlight : m.showHighlight}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface ResultContentProps {
  view: DiffView;
  alignmentView?: AlignmentView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onReferenceChange?: (referenceId: string | null) => void;
  highlightEnabled?: boolean;
  showAnalysisContent?: boolean;
  analysisResultsByLineId?: Record<string, GrammarCheckResult>;
  analysisLoadingByLineId?: Record<string, boolean>;
  analysisErrorsByLineId?: Record<string, string>;
}

export function ResultContent({
  view,
  alignmentView,
  selectedGroupId,
  onSelectGroup,
  onReferenceChange,
  highlightEnabled = true,
  showAnalysisContent = false,
  analysisResultsByLineId = {},
  analysisLoadingByLineId = {},
  analysisErrorsByLineId = {}
}: ResultContentProps) {
  const { messages: m } = useI18n();
  const hasEditGroups = view.edit_groups.length > 0;
  const [useLegacySymbols, setUseLegacySymbols] = useState(false);
  const [fallbackSelectedReferenceId, setFallbackSelectedReferenceId] = useState<string | null>(null);
  const referenceIds = useMemo(
    () => view.targets.filter((target) => target.type === "reference").map((target) => target.id),
    [view.targets]
  );
  const fallbackReferenceId =
    fallbackSelectedReferenceId && referenceIds.includes(fallbackSelectedReferenceId)
      ? fallbackSelectedReferenceId
      : referenceIds[0] ?? null;
  const fallbackAlignmentView = useMemo(
    () => buildAlignmentView(view.source, view.targets, view.edit_groups, fallbackReferenceId),
    [fallbackReferenceId, view.edit_groups, view.source, view.targets]
  );
  const effectiveAlignmentView = alignmentView ?? fallbackAlignmentView;
  const handleReferenceChange = onReferenceChange ?? setFallbackSelectedReferenceId;

  return (
    <div className="result-stack">
      <HighlightView
        lines={view.render_lines}
        alignmentView={effectiveAlignmentView}
        selectedGroupId={selectedGroupId}
        onSelectGroup={onSelectGroup}
        highlightEnabled={highlightEnabled}
        useLegacySymbols={useLegacySymbols}
        onToggleLegacySymbols={() => setUseLegacySymbols((enabled) => !enabled)}
        selectedReferenceId={effectiveAlignmentView.selected_reference_id}
        onReferenceChange={handleReferenceChange}
        showAnalysisContent={showAnalysisContent}
        analysisResultsByLineId={analysisResultsByLineId}
        analysisLoadingByLineId={analysisLoadingByLineId}
        analysisErrorsByLineId={analysisErrorsByLineId}
      />
      {!hasEditGroups ? <div className="panel empty-result">{m.noEdits}</div> : null}
      {hasEditGroups ? (
        <EditGroupTable
          view={view}
          alignmentView={effectiveAlignmentView}
          selectedGroupId={selectedGroupId}
          onSelectGroup={onSelectGroup}
        />
      ) : null}
    </div>
  );
}

export function BatchModelAnalysisPanel({
  config,
  onConfigChange,
  onRefreshModels,
  onBatchAnalyze,
  loadingModels,
  batchAnalyzing,
  message,
  error
}: {
  config: ModelConfig;
  onConfigChange: <Key extends keyof ModelConfig>(key: Key, value: ModelConfig[Key]) => void;
  onRefreshModels: () => void | Promise<void>;
  onBatchAnalyze: () => void | Promise<void>;
  loadingModels: boolean;
  batchAnalyzing: boolean;
  message: string;
  error: string;
}) {
  const { messages: m } = useI18n();

  return (
    <section
      className="panel result-panel model-analysis-panel batch-model-analysis-panel compact-model-analysis-panel"
      aria-labelledby="batch-model-analysis-title"
    >
      <div className="panel-header">
        <h2 id="batch-model-analysis-title">{m.modelAnalysis}</h2>
      </div>
      <ModelConfigFields
        config={config}
        onConfigChange={onConfigChange}
        onRefreshModels={onRefreshModels}
        loadingModels={loadingModels}
        refreshDisabled={batchAnalyzing}
        showRefreshControl={false}
      />
      <div className="button-row model-action-row model-action-row-horizontal">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={onRefreshModels}
          disabled={loadingModels || batchAnalyzing || !canRefreshModelList(config)}
        >
          {loadingModels ? m.refreshingModels : m.refreshModels}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={onBatchAnalyze}
          disabled={batchAnalyzing}
        >
          {batchAnalyzing ? m.analyzing : m.batchAnalyzeWithModel}
        </button>
      </div>
      <div className="status-stack" aria-live="polite">
        {message ? <div className="status-message info-message">{message}</div> : null}
        {error ? <div className="status-message error-message">{error}</div> : null}
      </div>
    </section>
  );
}

async function analyzeAlignmentLine(
  line: AlignmentLine,
  config: ModelConfig
): Promise<{ lineId: string; result?: GrammarCheckResult; error?: string }> {
  try {
    const result = await checkGrammar(config, {
      text: line.text,
      model: config.selectedModel
    });

    return { lineId: line.id, result };
  } catch (error) {
    return { lineId: line.id, error: messageFromError(error) };
  }
}
