import { useMemo, useState } from "react";
import { EditGroupTable } from "./components/EditGroupTable";
import { HighlightView } from "./components/HighlightView";
import { JsonPreview } from "./components/JsonPreview";
import { JsonUploadPanel } from "./components/JsonUploadPanel";
import {
  ManualInputPanel,
  type ManualInputPayload
} from "./components/ManualInputPanel";
import { SampleNavigator } from "./components/SampleNavigator";
import type { DiffView, Sample } from "./types";
import { buildDiffView } from "./utils/buildDiffView";
import { buildManualSample } from "./utils/parseInput";

interface CurrentViewResult {
  view: DiffView | null;
  error: string;
}

export default function App() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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
      const sample = buildManualSample(input);
      setSamples([sample]);
      setCurrentIndex(0);
      setSelectedGroupId(null);
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
    setError("");
  };

  const handleClear = () => {
    setSamples([]);
    setCurrentIndex(0);
    setSelectedGroupId(null);
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
        <h1>中文语法纠错多候选对齐工具</h1>
      </header>

      <div className="input-grid">
        <ManualInputPanel onSubmit={handleManualSubmit} onClear={handleClear} />
        <JsonUploadPanel
          onSamplesLoaded={handleSamplesLoaded}
          onWarning={setWarning}
          onError={setError}
        />
      </div>

      <div className="status-stack" aria-live="polite">
        {warning ? <div className="status-message warning-message">{warning}</div> : null}
        {displayedError ? (
          <div className="status-message error-message">{displayedError}</div>
        ) : null}
      </div>

      {samples.length > 0 ? (
        <section className="results-shell" aria-labelledby="results-title">
          <div className="section-heading">
            <h2 id="results-title">当前样本结果</h2>
          </div>

          <SampleNavigator
            samples={samples}
            currentIndex={currentIndex}
            onChange={handleSampleChange}
          />

          {currentResult.view ? (
            <div className="result-stack">
              {currentResult.view.edit_groups.length === 0 ? (
                <div className="panel empty-result">该样本没有检测到修改。</div>
              ) : (
                <>
                <EditGroupTable
                  view={currentResult.view}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={setSelectedGroupId}
                />
                <HighlightView
                  lines={currentResult.view.render_lines}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={setSelectedGroupId}
                />
                </>
              )}
              <JsonPreview view={currentResult.view} />
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
