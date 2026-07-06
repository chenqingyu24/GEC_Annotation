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
        <div className="app-title-block">
          <h1>中文语法纠错多候选对齐工具</h1>
          <p className="app-subtitle">对齐原句、参考答案和多个候选句，快速检查同一位置的改动。</p>
        </div>
        <div className="quick-start" aria-label="快速开始">
          <span className="quick-start-title">快速开始</span>
          <ol>
            <li>填写原句 source、候选句 candidate，参考答案 reference 可选。</li>
            <li>点击“生成对齐结果”，查看多行高亮和编辑组表格。</li>
            <li>点击高亮片段或编辑组行，可以联动定位同一处修改。</li>
          </ol>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="control-column" aria-label="Input options">
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
          <div className="section-heading">
            <h2 id="results-title">当前样本结果</h2>
          </div>

          {samples.length === 0 ? (
            <div className="result-stack">
              <div className="panel empty-result">
                还没有样本。请在左侧手动填写 source/candidate，或上传 JSON 文件生成对齐结果。
              </div>
              <ModelAnalysisPanel />
            </div>
          ) : currentResult.view ? (
            <ResultContent
              view={currentResult.view}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
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

interface ResultContentProps {
  view: DiffView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function ResultContent({
  view,
  selectedGroupId,
  onSelectGroup
}: ResultContentProps) {
  const hasEditGroups = view.edit_groups.length > 0;
  const [highlightEnabled, setHighlightEnabled] = useState(true);

  return (
    <div className="result-stack">
      <HighlightView
        lines={view.render_lines}
        selectedGroupId={selectedGroupId}
        onSelectGroup={onSelectGroup}
        highlightEnabled={highlightEnabled}
        onToggleHighlight={() => setHighlightEnabled((enabled) => !enabled)}
      />
      <ModelAnalysisPanel />
      {hasEditGroups ? (
        <EditGroupTable
          view={view}
          selectedGroupId={selectedGroupId}
          onSelectGroup={onSelectGroup}
        />
      ) : (
        <div className="panel empty-result">该样本没有检测到修改。</div>
      )}
      <JsonPreview view={view} />
    </div>
  );
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
