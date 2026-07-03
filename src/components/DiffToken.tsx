import { type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { EditOp, RenderLine, SegmentType } from "../types";

export interface DiffTokenSegment {
  text: string;
  type: SegmentType;
  group_id?: string;
  op?: EditOp;
}

interface DiffTokenProps {
  segment: DiffTokenSegment;
  lineType?: RenderLine["type"];
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string) => void;
  sourceSlot?: number;
}

export function DiffToken({
  segment,
  lineType,
  selectedGroupId = null,
  onSelectGroup,
  sourceSlot
}: DiffTokenProps) {
  const isInteractive = Boolean(segment.group_id && onSelectGroup);
  const isSelected = segment.group_id === selectedGroupId;
  const isMissing = segment.type === "delete" && segment.op === "delete" && lineType !== "source";
  const isPlaceholder =
    isMissing || segment.type === "anchor" || (segment.type === "insert" && segment.text === "");
  const className = [
    "highlight-span",
    "diff-token",
    `segment-${segment.type}`,
    tokenColorClass(segment),
    isInteractive ? "is-interactive" : "",
    isSelected ? "is-selected" : "",
    isPlaceholder ? "is-placeholder" : "is-actual"
  ]
    .filter(Boolean)
    .join(" ");
  const style =
    sourceSlot === undefined
      ? undefined
      : ({
          "--source-slot": sourceSlot
        } as CSSProperties);
  const interactiveProps =
    isInteractive && segment.group_id
      ? {
          role: "button",
          tabIndex: 0,
          onClick: () => onSelectGroup?.(segment.group_id as string),
          onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) =>
            handleSegmentKeyDown(event, segment.group_id as string, onSelectGroup)
        }
      : {};

  return (
    <span
      className={className}
      data-source-slot={sourceSlot}
      title={tokenTitle(segment, isMissing)}
      style={style}
      {...interactiveProps}
    >
      {tokenContent(segment, isMissing)}
    </span>
  );
}

function tokenColorClass(segment: DiffTokenSegment): string {
  if (segment.type === "delete") {
    return "delete-mark";
  }

  if (segment.type === "insert" || segment.type === "anchor") {
    return "insert-mark";
  }

  if (segment.type === "replace") {
    return "replace-mark";
  }

  return "";
}

function tokenTitle(segment: DiffTokenSegment, isMissing: boolean): string | undefined {
  if (!segment.group_id && !segment.text) {
    return undefined;
  }

  const parts = [segment.group_id, isMissing && segment.text ? `missing: ${segment.text}` : ""]
    .filter(Boolean)
    .join(" ");

  return parts || undefined;
}

function tokenContent(segment: DiffTokenSegment, isMissing: boolean): ReactNode {
  if (segment.type === "delete") {
    if (isMissing) {
      return "∅";
    }

    return (
      <>
        [<span className="delete-text">{segment.text}</span>]
      </>
    );
  }

  if (segment.type === "insert" || segment.type === "anchor") {
    const text = segment.type === "anchor" ? "" : segment.text;

    return `/${text}\\`;
  }

  return segment.text;
}

function handleSegmentKeyDown(
  event: KeyboardEvent<HTMLSpanElement>,
  groupId: string,
  onSelectGroup: ((groupId: string) => void) | undefined
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  onSelectGroup?.(groupId);
}
