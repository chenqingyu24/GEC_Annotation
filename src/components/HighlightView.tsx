import { Fragment, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type {
  AlignmentCell,
  AlignmentCellPart,
  AlignmentSlot,
  AlignmentView,
  RenderLine,
  RenderSegment
} from "../types";
import { DiffToken } from "./DiffToken";

interface HighlightViewProps {
  lines: RenderLine[];
  alignmentView?: AlignmentView;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  highlightEnabled: boolean;
  onToggleHighlight: () => void;
  useLegacySymbols?: boolean;
  onToggleLegacySymbols?: () => void;
  selectedReferenceId?: string | null;
  onReferenceChange?: (referenceId: string) => void;
}

const MIN_ALIGNMENT_SLOT_WIDTH_EM = 2;

type AlignmentSlotStyle = CSSProperties & {
  "--alignment-slot-width": string;
};

export function HighlightView({
  lines,
  alignmentView,
  selectedGroupId,
  onSelectGroup,
  highlightEnabled,
  onToggleHighlight,
  useLegacySymbols = !alignmentView,
  onToggleLegacySymbols,
  selectedReferenceId,
  onReferenceChange
}: HighlightViewProps) {
  const shouldRenderAlignment = Boolean(alignmentView && highlightEnabled && !useLegacySymbols);

  return (
    <section className="panel result-panel" aria-labelledby="highlight-view-title">
      <div className="panel-header">
        <h2 id="highlight-view-title">多行高亮</h2>
        <div className="panel-header-actions">
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
              <span>旧符号</span>
            </label>
          ) : null}
          {highlightEnabled ? (
            shouldRenderAlignment ? <AlignmentLegend /> : <HighlightLegend />
          ) : null}
          <button
            className="secondary-button compact-button"
            type="button"
            aria-pressed={highlightEnabled}
            onClick={onToggleHighlight}
          >
            {highlightEnabled ? "隐藏高亮" : "显示高亮"}
          </button>
        </div>
      </div>

      {shouldRenderAlignment && alignmentView ? (
        renderAlignmentGrid(alignmentView, selectedGroupId, onSelectGroup)
      ) : (
        <div className="highlight-lines">
          {lines.map((line) => (
            <div className={`highlight-line line-${line.type}`} key={line.id}>
              <div className="line-label">{line.label}</div>
              <div className="sentence-line">
                {highlightEnabled
                  ? renderSegmentsWithSlots(line, selectedGroupId, onSelectGroup)
                  : line.text}
              </div>
            </div>
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
  const references = alignmentView.lines.filter((line) => line.type === "reference");

  if (references.length === 0) {
    return null;
  }

  const activeReferenceId =
    selectedReferenceId ?? alignmentView.selected_reference_id ?? references[0].id;

  return (
    <label className="reference-selector">
      <span>参考基准</span>
      <select
        value={activeReferenceId}
        onChange={(event) => onReferenceChange?.(event.target.value)}
        disabled={!onReferenceChange || references.length < 2}
      >
        {references.map((reference) => (
          <option value={reference.id} key={reference.id}>
            {reference.id}
          </option>
        ))}
      </select>
    </label>
  );
}

function HighlightLegend() {
  return (
    <div className="highlight-legend" aria-label="图例">
      <span className="legend-label">图例</span>
      <span className="legend-item">
        <DiffToken segment={{ text: "替换", type: "replace", op: "replace" }} />
        <span>替换</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: "文本", type: "delete", op: "delete" }} lineType="source" />
        <span>应移除</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: "文本", type: "delete", op: "delete" }} lineType="candidate" />
        <span>已移除</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: "文本", type: "insert", op: "insert" }} />
        <span>已新增</span>
      </span>
      <span className="legend-item">
        <DiffToken segment={{ text: "", type: "anchor", op: "anchor" }} />
        <span>插入位</span>
      </span>
    </div>
  );
}

function AlignmentLegend() {
  return (
    <div className="highlight-legend" aria-label="图例">
      <span className="legend-label">图例</span>
      <span className="legend-item">
        <span className="alignment-swatch alignment-op-replace" aria-hidden="true" />
        <span>替换</span>
      </span>
      <span className="legend-item">
        <span className="alignment-swatch alignment-op-delete" aria-hidden="true" />
        <span>删除</span>
      </span>
      <span className="legend-item">
        <span className="alignment-swatch alignment-op-insert" aria-hidden="true" />
        <span>新增</span>
      </span>
      <span className="legend-item">
        <span className="alignment-empty-sample" />
        <span>空槽位</span>
      </span>
    </div>
  );
}

function renderAlignmentGrid(
  alignmentView: AlignmentView,
  selectedGroupId: string | null,
  onSelectGroup: (groupId: string) => void
): ReactNode {
  return (
    <div
      className="alignment-grid"
      data-slot-count={alignmentView.slots.length}
    >
      {alignmentView.lines.map((line) => (
        <div className={`alignment-row line-${line.type}`} key={line.id}>
          <div className={`line-label alignment-row-label line-${line.type}`}>{line.label}</div>
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
      ))}
    </div>
  );
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
