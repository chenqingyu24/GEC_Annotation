import { Fragment, type KeyboardEvent, type ReactNode } from "react";
import type { RenderLine, RenderSegment } from "../types";

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
      </div>

      <div className="highlight-lines">
        {lines.map((line) => (
          <div className={`highlight-line line-${line.type}`} key={line.id}>
            <div className="line-label">{line.label}</div>
            <div className="sentence-line">
              {line.segments.map((segment, index) => (
                <Fragment key={`${line.id}-${index}`}>
                  {renderSegment(segment, selectedGroupId, onSelectGroup)}
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderSegment(
  segment: RenderSegment,
  selectedGroupId: string | null,
  onSelectGroup: (groupId: string) => void
): ReactNode {
  if (!segment.group_id && segment.type === "plain") {
    return segment.text;
  }

  const className = [
    "highlight-span",
    `segment-${segment.type}`,
    segment.group_id ? "is-interactive" : "",
    segment.group_id === selectedGroupId ? "is-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const interactiveProps = segment.group_id
    ? {
        role: "button",
        tabIndex: 0,
        title: segment.group_id,
        onClick: () => onSelectGroup(segment.group_id as string),
        onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) =>
          handleSegmentKeyDown(event, segment.group_id as string, onSelectGroup)
      }
    : {};

  if (segment.type === "delete") {
    return (
      <span className={`${className} delete-mark`} {...interactiveProps}>
        [<span className="delete-text">{segment.text}</span>]
      </span>
    );
  }

  if (segment.type === "insert" || segment.type === "anchor") {
    const text = segment.type === "anchor" ? "" : segment.text;

    return (
      <span className={`${className} insert-mark`} {...interactiveProps}>
        {`/${text}\\`}
      </span>
    );
  }

  return (
    <span className={className} {...interactiveProps}>
      {segment.text}
    </span>
  );
}

function handleSegmentKeyDown(
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
