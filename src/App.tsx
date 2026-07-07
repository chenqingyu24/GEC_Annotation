import { useMemo, useState } from "react";
import { EditGroupTable } from "./components/EditGroupTable";
import { HighlightView } from "./components/HighlightView";
import { JsonPreview } from "./components/JsonPreview";
import { JsonUploadPanel } from "./components/JsonUploadPanel";
import {
  ManualInputPanel,
  type ManualInputPayload
} from "./components/ManualInputPanel";
import { ModelAnalysisPanel } from "./components/ModelAnalysisPanel";
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
import type { DiffView, Sample } from "./types";
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

  const handleManualSubmit = (input: ManualInputPayload) => {
    try {
      const sample = buildManualSample(input, locale);
      setSamples([sample]);
      setCurrentIndex(0);
      setSelectedGroupId(null);
      setHighlightEnabled(true);
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
    setHighlightEnabled(true);
    setError("");
  };

  const handleClear = () => {
    setSamples([]);
    setCurrentIndex(0);
    setSelectedGroupId(null);
    setHighlightEnabled(true);
    setError("");
    setWarning("");
  };

  const handleSampleChange = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= samples.length) {
      return;
    }

    setCurrentIndex(nextIndex);
    setSelectedGroupId(null);
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

          <SampleNavigator
            samples={samples}
            currentIndex={currentIndex}
            onChange={handleSampleChange}
          />
        </aside>

        <section className="preview-column" aria-labelledby="results-title">
          <ResultsHeading
            hasResult={Boolean(samples.length && currentResult.view)}
            highlightEnabled={highlightEnabled}
            onToggleHighlight={() => setHighlightEnabled((enabled) => !enabled)}
          />

          {samples.length === 0 ? (
            <div className="result-stack">
              <div className="panel empty-result">
                {m.emptySample}
              </div>
              <ModelAnalysisPanel />
            </div>
          ) : currentResult.view ? (
            <ResultContent
              view={currentResult.view}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              highlightEnabled={highlightEnabled}
            />
          ) : (
            <div className="result-stack">
              <ModelAnalysisPanel />
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
  onToggleHighlight
}: {
  hasResult: boolean;
  highlightEnabled: boolean;
  onToggleHighlight: () => void;
}) {
  const { messages: m } = useI18n();

  return (
    <div className="section-heading">
      <h2 id="results-title">{m.resultsTitle}</h2>
      {hasResult ? (
        <button
          className="secondary-button compact-button result-highlight-toggle"
          type="button"
          aria-pressed={highlightEnabled}
          onClick={onToggleHighlight}
        >
          {highlightEnabled ? m.hideHighlight : m.showHighlight}
        </button>
      ) : null}
    </div>
  );
}

interface ResultContentProps {
  view: DiffView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  highlightEnabled?: boolean;
}

export function ResultContent({
  view,
  selectedGroupId,
  onSelectGroup,
  highlightEnabled = true
}: ResultContentProps) {
  const { messages: m } = useI18n();
  const hasEditGroups = view.edit_groups.length > 0;
  const [useLegacySymbols, setUseLegacySymbols] = useState(false);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const referenceIds = useMemo(
    () => view.targets.filter((target) => target.type === "reference").map((target) => target.id),
    [view.targets]
  );
  const activeReferenceId =
    selectedReferenceId && referenceIds.includes(selectedReferenceId)
      ? selectedReferenceId
      : referenceIds[0] ?? null;
  const alignmentView = useMemo(
    () =>
      hasEditGroups
        ? buildAlignmentView(view.source, view.targets, view.edit_groups, activeReferenceId)
        : undefined,
    [activeReferenceId, hasEditGroups, view.edit_groups, view.source, view.targets]
  );

  return (
    <div className="result-stack">
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={selectedGroupId}
        onSelectGroup={onSelectGroup}
        highlightEnabled={highlightEnabled}
        useLegacySymbols={useLegacySymbols}
        onToggleLegacySymbols={() => setUseLegacySymbols((enabled) => !enabled)}
        selectedReferenceId={activeReferenceId}
        onReferenceChange={setSelectedReferenceId}
      />
      <ModelAnalysisPanel />
      {hasEditGroups ? (
        <EditGroupTable
          view={view}
          alignmentView={alignmentView}
          selectedGroupId={selectedGroupId}
          onSelectGroup={onSelectGroup}
        />
      ) : (
        <div className="panel empty-result">{m.noEdits}</div>
      )}
      <JsonPreview view={view} />
    </div>
  );
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
