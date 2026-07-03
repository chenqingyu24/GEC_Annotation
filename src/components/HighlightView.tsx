import { Fragment, type ReactNode } from "react";
import type { RenderLine, RenderSegment } from "../types";
import { DiffToken } from "./DiffToken";

interface HighlightViewProps {
  lines: RenderLine[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function HighlightView({
  lines,
  selectedGroupId,
  onSelectGroup
}: HighlightViewProps) {
  return (
    <section className="panel result-panel" aria-labelledby="highlight-view-title">
      <div className="panel-header">
        <h2 id="highlight-view-title">多行高亮</h2>
        <HighlightLegend />
      </div>

      <div className="highlight-lines">
        {lines.map((line) => (
          <div className={`highlight-line line-${line.type}`} key={line.id}>
            <div className="line-label">{line.label}</div>
            <div className="sentence-line">
              {renderSegmentsWithSlots(line, selectedGroupId, onSelectGroup)}
            </div>
          </div>
        ))}
      </div>
    </section>
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
        <span>已缺失</span>
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
