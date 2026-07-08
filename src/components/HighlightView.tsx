import { Fragment, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type {
  AlignmentCell,
  AlignmentCellPart,
  AlignmentLine,
  AlignmentSlot,
  AlignmentView,
  GrammarCheckResult,
  RenderLine,
  RenderSegment
} from "../types";
import { formatLineLabel, messages, useI18n, type Locale } from "../i18n";
import { DiffToken } from "./DiffToken";

interface HighlightViewProps {
  lines: RenderLine[];
  alignmentView?: AlignmentView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  highlightEnabled: boolean;
  useLegacySymbols?: boolean;
  onToggleLegacySymbols?: () => void;
  selectedReferenceId?: string | null;
  onReferenceChange?: (referenceId: string) => void;
  showAnalysisContent?: boolean;
  analysisResultsByLineId?: Record<string, GrammarCheckResult>;
  analysisLoadingByLineId?: Record<string, boolean>;
  analysisErrorsByLineId?: Record<string, string>;
}

const MIN_ALIGNMENT_SLOT_WIDTH_EM = 2;

type AlignmentSlotStyle = CSSProperties & {
  "--alignment-slot-width": string;
};

interface LineAnalysis {
  state: "pending" | "loading" | "error" | "result";
  hasError?: boolean;
  statusText: string;
  errorType?: string;
  correctedText?: string;
  explanation: string;
}

export function HighlightView({
  lines,
  alignmentView,
  selectedGroupId,
  onSelectGroup,
  highlightEnabled,
  useLegacySymbols = !alignmentView,
  onToggleLegacySymbols,
  selectedReferenceId,
  onReferenceChange,
  showAnalysisContent = false,
  analysisResultsByLineId = {},
  analysisLoadingByLineId = {},
  analysisErrorsByLineId = {}
}: HighlightViewProps) {
  const { locale, messages: m } = useI18n();
  const shouldRenderAlignment = Boolean(alignmentView && highlightEnabled && !useLegacySymbols);

  return (
    <section className="panel result-panel" aria-labelledby="highlight-view-title">
      <div className="panel-header highlight-panel-header">
        <h2 id="highlight-view-title" className="sr-only">{m.highlightTitle}</h2>
        <div className="panel-header-actions highlight-toolbar-left">
          {alignmentView ? (
            <ReferenceSelector
              alignmentView={alignmentView}
              selectedReferenceId={selectedReferenceId}
              onReferenceChange={onReferenceChange}
            />
          ) : null}
          {alignmentView && onToggleLegacySymbols ? (
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={useLegacySymbols}
                onChange={onToggleLegacySymbols}
              />
              <span>{m.legacySymbols}</span>
            </label>
          ) : null}
          {highlightEnabled ? (
            shouldRenderAlignment ? <AlignmentLegend /> : <HighlightLegend />
          ) : null}
        </div>
      </div>

      {shouldRenderAlignment && alignmentView ? (
        renderAlignmentGrid(
          alignmentView,
          selectedGroupId,
          onSelectGroup,
          locale,
          showAnalysisContent,
          analysisResultsByLineId,
          analysisLoadingByLineId,
          analysisErrorsByLineId
        )
      ) : (
        <div className="highlight-lines">
          {lines.map((line) => (
            <Fragment key={line.id}>
              <div className={`highlight-line line-${line.type}`}>
                <div className="line-label">{renderLineLabel(line, lines, locale)}</div>
                <div className="sentence-line">
                  {highlightEnabled
                    ? renderSegmentsWithSlots(line, selectedGroupId, onSelectGroup)
                    : line.text}
                </div>
              </div>
              {showAnalysisContent
                ? renderInlineAnalysisRow(
                    line,
                    locale,
                    analysisResultsByLineId,
                    analysisLoadingByLineId,
                    analysisErrorsByLineId
                  )
                : null}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

function ReferenceSelector({
  alignmentView,
  selectedReferenceId,
  onReferenceChange
}: {
  alignmentView: AlignmentView;
  selectedReferenceId?: string | null;
  onReferenceChange?: (referenceId: string) => void;
}) {
  const { locale, messages: m } = useI18n();
  const references = alignmentView.lines.filter((line) => line.type === "reference");

  if (references.length === 0) {
    return null;
  }

  const activeReferenceId =
    selectedReferenceId ?? alignmentView.selected_reference_id ?? references[0].id;

  return (
    <label className="reference-selector">
      <span>{m.referenceBase}</span>
      <select
        value={activeReferenceId}
        onChange={(event) => onReferenceChange?.(event.target.value)}
        disabled={!onReferenceChange || references.length < 2}
      >
        {references.map((reference) => (
          <option value={reference.id} key={reference.id}>
            {formatLineLabel(reference, alignmentView.lines, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}

function HighlightLegend() {
  const { messages: m } = useI18n();

  return (
    <div className="highlight-legend" aria-label={m.legend}>
      <span className="legend-label">{m.legend}</span>
      <span className="legend-item">
        <DiffToken segment={{ text: m.replace, type: "replace", op: "replace" }} />
        <span>{m.replace}</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: m.sampleText, type: "delete", op: "delete" }} lineType="source" />
        <span>{m.shouldRemove}</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: m.sampleText, type: "delete", op: "delete" }} lineType="candidate" />
        <span>{m.removed}</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: m.sampleText, type: "insert", op: "insert" }} />
        <span>{m.inserted}</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: "", type: "anchor", op: "anchor" }} />
        <span>{m.insertionPoint}</span>
      </span>
    </div>
  );
}

function AlignmentLegend() {
  const { messages: m } = useI18n();

  return (
    <div className="highlight-legend" aria-label={m.legend}>
      <span className="legend-label">{m.legend}</span>
      <span className="legend-item">
        <span className="alignment-swatch alignment-op-replace" aria-hidden="true" />
        <span>{m.replace}</span>
      </span>
      <span className="legend-item">
        <span className="alignment-swatch alignment-op-delete" aria-hidden="true" />
        <span>{m.delete}</span>
      </span>
      <span className="legend-item">
        <span className="alignment-swatch alignment-op-insert" aria-hidden="true" />
        <span>{m.insert}</span>
      </span>
    </div>
  );
}

function renderAlignmentGrid(
  alignmentView: AlignmentView,
  selectedGroupId: string | null,
  onSelectGroup: (groupId: string) => void,
  locale: Locale,
  showAnalysisContent: boolean,
  analysisResultsByLineId: Record<string, GrammarCheckResult>,
  analysisLoadingByLineId: Record<string, boolean>,
  analysisErrorsByLineId: Record<string, string>
): ReactNode {
  return (
    <div
      className="alignment-grid"
      data-slot-count={alignmentView.slots.length}
    >
      {alignmentView.lines.map((line) => (
        <Fragment key={line.id}>
          <div className={`alignment-row line-${line.type}`}>
            <div className={`line-label alignment-row-label line-${line.type}`}>
              {renderLineLabel(line, alignmentView.lines, locale)}
            </div>
            <div className="alignment-row-content">
              {line.cells.map((cell, index) =>
                renderAlignmentCell(
                  cell,
                  alignmentView.slots[index],
                  selectedGroupId,
                  onSelectGroup
                )
              )}
            </div>
          </div>
          {showAnalysisContent
            ? renderAlignmentAnalysisRow(
                line,
                locale,
                analysisResultsByLineId,
                analysisLoadingByLineId,
                analysisErrorsByLineId
              )
            : null}
        </Fragment>
      ))}
    </div>
  );
}

function renderAlignmentAnalysisRow(
  line: AlignmentLine,
  locale: Locale,
  analysisResultsByLineId: Record<string, GrammarCheckResult>,
  analysisLoadingByLineId: Record<string, boolean>,
  analysisErrorsByLineId: Record<string, string>
): ReactNode {
  return (
    <div
      className={`alignment-analysis-row analysis-for-${line.type}`}
      data-analysis-for={line.id}
    >
      <div className="line-label alignment-row-label alignment-analysis-label">
        {messages[locale].analysisLabel}
      </div>
      <div className="alignment-analysis-content">
        {renderLineAnalysisCard(
          resolveLineAnalysis(
            line.id,
            locale,
            analysisResultsByLineId,
            analysisLoadingByLineId,
            analysisErrorsByLineId
          ),
          locale
        )}
      </div>
    </div>
  );
}

function renderInlineAnalysisRow(
  line: RenderLine,
  locale: Locale,
  analysisResultsByLineId: Record<string, GrammarCheckResult>,
  analysisLoadingByLineId: Record<string, boolean>,
  analysisErrorsByLineId: Record<string, string>
): ReactNode {
  return (
    <div className={`highlight-analysis-line analysis-for-${line.type}`} data-analysis-for={line.id}>
      <div className="line-label">{messages[locale].analysisLabel}</div>
      <div className="highlight-analysis-content">
        {renderLineAnalysisCard(
          resolveLineAnalysis(
            line.id,
            locale,
            analysisResultsByLineId,
            analysisLoadingByLineId,
            analysisErrorsByLineId
          ),
          locale
        )}
      </div>
    </div>
  );
}

function resolveLineAnalysis(
  lineId: string,
  locale: Locale,
  analysisResultsByLineId: Record<string, GrammarCheckResult>,
  analysisLoadingByLineId: Record<string, boolean>,
  analysisErrorsByLineId: Record<string, string>
): LineAnalysis {
  const m = messages[locale];

  if (analysisLoadingByLineId[lineId]) {
    return {
      state: "loading",
      statusText: m.analysisLoading,
      explanation: m.analysisLoading
    };
  }

  const error = analysisErrorsByLineId[lineId];
  if (error) {
    return {
      state: "error",
      hasError: true,
      statusText: m.analysisFailed,
      explanation: error
    };
  }

  const result = analysisResultsByLineId[lineId];
  if (result) {
    return analysisFromGrammarResult(result, locale);
  }

  return {
    state: "pending",
    statusText: m.analysisPending,
    explanation: m.analysisPending
  };
}

function analysisFromGrammarResult(result: GrammarCheckResult, locale: Locale): LineAnalysis {
  const m = messages[locale];

  return {
    state: "result",
    hasError: result.has_error,
    statusText: result.has_error ? m.analysisIncorrect : m.analysisCorrect,
    correctedText: result.corrected_text,
    explanation: result.explanation ?? ""
  };
}

function renderLineAnalysisCard(result: LineAnalysis, locale: Locale): ReactNode {
  const m = messages[locale];

  return (
    <div className={`line-analysis-card ${classForAnalysisState(result)}`}>
      <span className="line-analysis-status">{result.statusText}</span>
      <div className="line-analysis-detail-grid">
        {result.errorType ? (
          <>
            <span className="line-analysis-field">{m.analysisErrorType}：</span>
            <span>{result.errorType}</span>
          </>
        ) : null}
        {result.correctedText ? (
          <>
            <span className="line-analysis-field">{m.analysisCorrection}：</span>
            <span className="line-analysis-correction">{result.correctedText}</span>
          </>
        ) : null}
        {result.explanation ? (
          <>
            <span className="line-analysis-field">{m.analysisReason}：</span>
            <span>{result.explanation}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function classForAnalysisState(result: LineAnalysis): string {
  if (result.state === "loading" || result.state === "pending") {
    return "is-pending";
  }

  return result.hasError ? "is-error" : "is-ok";
}

function getAlignmentSlotStyle(slot: AlignmentSlot): AlignmentSlotStyle {
  const width = Math.max(slot.column_width_ch, MIN_ALIGNMENT_SLOT_WIDTH_EM);

  return {
    "--alignment-slot-width": `${width}em`
  } as AlignmentSlotStyle;
}

function renderAlignmentCell(
  cell: AlignmentCell,
  slot: AlignmentSlot,
  selectedGroupId: string | null,
  onSelectGroup: (groupId: string) => void
): ReactNode {
  const isInteractive = Boolean(cell.group_id);
  const isSelected = cell.group_id === selectedGroupId;
  const className = [
    "alignment-cell",
    `alignment-op-${cell.op}`,
    slot.is_difference ? "alignment-slot-difference" : "alignment-slot-plain",
    `alignment-slot-kind-${slot.kind}`,
    cell.is_empty ? "is-empty" : "is-filled",
    isInteractive ? "is-interactive" : "",
    isSelected ? "is-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const interactiveProps =
    isInteractive && cell.group_id
      ? {
          role: "button",
          tabIndex: 0,
          onClick: () => onSelectGroup(cell.group_id as string),
          onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) =>
            handleCellKeyDown(event, cell.group_id as string, onSelectGroup)
        }
      : {};

  return (
    <span
      className={className}
      key={slot.slot_id}
      data-slot-id={slot.slot_id}
      data-alignment-empty={cell.is_empty ? "true" : "false"}
      style={getAlignmentSlotStyle(slot)}
      title={cell.group_id}
      {...interactiveProps}
    >
      {cell.is_empty ? (
        <span className="alignment-empty-content" aria-hidden="true" />
      ) : (
        <span className="alignment-cell-content">{renderAlignmentParts(cell.parts)}</span>
      )}
    </span>
  );
}

function renderLineLabel(
  line: AlignmentLine | RenderLine,
  lines: Array<AlignmentLine | RenderLine>,
  locale: Locale
): ReactNode {
  const label = formatLineLabel(line, lines, locale);
  const idMatch = line.type === "candidate" ? /^(.*)(\([^)]+\))$/.exec(label) : null;

  if (!idMatch) {
    return label;
  }

  return (
    <span className="line-label-formatted">
      <span className="line-label-main">{idMatch[1]}</span>
      <span className="line-label-id">{idMatch[2]}</span>
    </span>
  );
}

function renderAlignmentParts(parts: AlignmentCellPart[]): ReactNode {
  const prefixParts = parts.filter((part) => part.role === "prefix-punctuation");
  const coreParts = parts.filter((part) => part.role === "core");

  return (
    <>
      <span className="alignment-prefix-content">
        {prefixParts.map(renderAlignmentPart)}
      </span>
      <span className="alignment-core-content">
        {coreParts.map(renderAlignmentPart)}
      </span>
    </>
  );
}

function renderAlignmentPart(part: AlignmentCellPart, index: number): ReactNode {
  return (
    <span
      className={["alignment-part", `alignment-part-op-${part.op}`].join(" ")}
      key={`${part.role}-${index}`}
    >
      {part.text}
    </span>
  );
}

function handleCellKeyDown(
  event: KeyboardEvent<HTMLSpanElement>,
  groupId: string,
  onSelectGroup: (groupId: string) => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  onSelectGroup(groupId);
}

function renderSegmentsWithSlots(
  line: RenderLine,
  selectedGroupId: string | null,
  onSelectGroup: (groupId: string) => void
): ReactNode[] {
  let sourceSlot = 0;

  return line.segments.map((segment, index) => {
    const currentSlot = sourceSlot;
    sourceSlot += sourceLengthForSegment(segment);

    return (
      <Fragment key={`${line.id}-${index}`}>
        {renderSegment(segment, line.type, selectedGroupId, onSelectGroup, currentSlot)}
      </Fragment>
    );
  });
}

function renderSegment(
  segment: RenderSegment,
  lineType: RenderLine["type"],
  selectedGroupId: string | null,
  onSelectGroup: (groupId: string) => void,
  sourceSlot: number
): ReactNode {
  if (!segment.group_id && segment.type === "plain") {
    return segment.text;
  }

  return (
    <DiffToken
      segment={segment}
      lineType={lineType}
      selectedGroupId={selectedGroupId}
      onSelectGroup={onSelectGroup}
      sourceSlot={sourceSlot}
    />
  );
}

function sourceLengthForSegment(segment: RenderSegment): number {
  if (segment.type === "insert" || segment.type === "anchor") {
    return 0;
  }

  return Array.from(segment.text).length;
}
