import type {
  Edit,
  EditGroup,
  EditOp,
  RenderLine,
  RenderSegment,
  SegmentType,
  Target
} from "../types";

interface SourceSpan {
  source_start: number;
  source_end: number;
}

export function buildRenderLines(
  source: string,
  targets: Target[],
  editGroups: EditGroup[],
  allEdits: Edit[]
): RenderLine[] {
  if (editGroups.length === 0) {
    return [
      plainLine("source", "source", "Source", source),
      ...targets.map((target) => plainLine(target.id, target.type, target.id, target.text))
    ];
  }

  const groups = [...editGroups].sort(compareGroups);
  const sourceChars = Array.from(source);

  return [
    {
      id: "source",
      type: "source",
      label: "Source",
      text: source,
      segments: buildSourceSegments(sourceChars, groups, allEdits)
    },
    ...targets.map((target) => buildTargetLine(sourceChars, target, groups, allEdits))
  ];
}

function plainLine(
  id: string,
  type: RenderLine["type"],
  label: string,
  text: string
): RenderLine {
  return {
    id,
    type,
    label,
    text,
    segments: [{ text, type: "plain" }]
  };
}

function buildSourceSegments(
  sourceChars: string[],
  groups: EditGroup[],
  allEdits: Edit[]
): RenderSegment[] {
  const segments: RenderSegment[] = [];
  let sourceCursor = 0;

  for (const group of groups) {
    appendPlain(segments, sourceChars.slice(sourceCursor, group.source_start).join(""));

    if (isPointSpan(group)) {
      appendRenderSegment(segments, {
        text: "",
        type: "anchor",
        group_id: group.group_id,
        op: "anchor"
      });
    } else {
      appendSourceGroupSegments(segments, sourceChars, group, editsForGroup(group, allEdits));
    }

    sourceCursor = Math.max(sourceCursor, group.source_end);
  }

  appendPlain(segments, sourceChars.slice(sourceCursor).join(""));
  return segments;
}

function appendSourceGroupSegments(
  segments: RenderSegment[],
  sourceChars: string[],
  group: EditGroup,
  groupEdits: Edit[]
): void {
  const anchors = new Set<number>();
  const sourceOps: EditOp[] = Array.from(
    { length: group.source_end - group.source_start },
    () => "equal"
  );

  for (const edit of groupEdits) {
    if (edit.op === "insert") {
      anchors.add(edit.source_start);
      continue;
    }

    const op: EditOp = edit.op === "delete" ? "delete" : "replace";
    const start = Math.max(edit.source_start, group.source_start);
    const end = Math.min(edit.source_end, group.source_end);

    for (let position = start; position < end; position += 1) {
      const opIndex = position - group.source_start;
      sourceOps[opIndex] = mergeSourceOps(sourceOps[opIndex], op);
    }
  }

  let sourceCursor = group.source_start;

  while (sourceCursor < group.source_end) {
    appendAnchorIfNeeded(segments, anchors, group, sourceCursor);

    const op = sourceOps[sourceCursor - group.source_start];
    let runEnd = sourceCursor + 1;

    while (
      runEnd < group.source_end &&
      !anchors.has(runEnd) &&
      sourceOps[runEnd - group.source_start] === op
    ) {
      runEnd += 1;
    }

    appendSourceTextSegment(
      segments,
      sourceChars.slice(sourceCursor, runEnd).join(""),
      group.group_id,
      op
    );
    sourceCursor = runEnd;
  }

  appendAnchorIfNeeded(segments, anchors, group, group.source_end);
}

function mergeSourceOps(current: EditOp, next: EditOp): EditOp {
  if (current === "replace" || next === "replace") {
    return "replace";
  }

  if (current === "delete" || next === "delete") {
    return "delete";
  }

  return "equal";
}

function appendAnchorIfNeeded(
  segments: RenderSegment[],
  anchors: Set<number>,
  group: EditGroup,
  position: number
): void {
  if (!anchors.has(position)) {
    return;
  }

  appendRenderSegment(segments, {
    text: "",
    type: "anchor",
    group_id: group.group_id,
    op: "anchor"
  });
}

function appendSourceTextSegment(
  segments: RenderSegment[],
  text: string,
  groupId: string,
  op: EditOp
): void {
  if (text === "") {
    return;
  }

  if (op === "equal") {
    appendRenderSegment(segments, {
      text,
      type: "plain",
      group_id: groupId,
      op: "equal"
    });
    return;
  }

  const type: SegmentType = op === "delete" ? "delete" : "replace";

  appendRenderSegment(segments, {
    text,
    type,
    group_id: groupId,
    op
  });
}

function buildTargetLine(
  sourceChars: string[],
  target: Target,
  groups: EditGroup[],
  allEdits: Edit[]
): RenderLine {
  const targetChars = Array.from(target.text);
  const targetEdits = allEdits
    .filter((edit) => edit.target_id === target.id)
    .sort(compareEditsByPosition);
  const segments: RenderSegment[] = [];
  let sourceCursor = 0;
  let targetCursor = 0;

  for (const group of groups) {
    const sourceGapLength = group.source_start - sourceCursor;
    if (sourceGapLength > 0) {
      appendPlain(segments, targetChars.slice(targetCursor, targetCursor + sourceGapLength).join(""));
      targetCursor += sourceGapLength;
    }

    sourceCursor = group.source_start;

    const groupTargetEdits = targetEdits.filter((edit) => editBelongsToGroup(edit, group));
    if (isPointSpan(group)) {
      targetCursor = appendPointGroupSegments(segments, targetCursor, group, groupTargetEdits);
    } else if (groupTargetEdits.length === 0) {
      const groupLength = group.source_end - group.source_start;
      appendRenderSegment(segments, {
        text: targetChars.slice(targetCursor, targetCursor + groupLength).join(""),
        type: "plain",
        group_id: group.group_id,
        op: "equal"
      });
      targetCursor += groupLength;
      sourceCursor = group.source_end;
    } else {
      const cursors = appendTargetGroupSegments(
        segments,
        targetChars,
        group,
        groupTargetEdits,
        sourceCursor,
        targetCursor
      );
      sourceCursor = cursors.sourceCursor;
      targetCursor = cursors.targetCursor;
    }
  }

  appendPlain(segments, targetChars.slice(targetCursor).join(""));

  return {
    id: target.id,
    type: target.type,
    label: target.id,
    text: target.text,
    segments
  };
}

function appendPointGroupSegments(
  segments: RenderSegment[],
  targetCursor: number,
  group: EditGroup,
  groupTargetEdits: Edit[]
): number {
  if (groupTargetEdits.length === 0) {
    appendRenderSegment(segments, {
      text: "",
      type: "anchor",
      group_id: group.group_id,
      op: "anchor"
    });
    return targetCursor;
  }

  let nextTargetCursor = targetCursor;

  for (const edit of groupTargetEdits) {
    appendRenderSegment(segments, renderSegmentForEdit(edit, group.group_id));
    nextTargetCursor = Math.max(nextTargetCursor, edit.target_end);
  }

  return nextTargetCursor;
}

function appendTargetGroupSegments(
  segments: RenderSegment[],
  targetChars: string[],
  group: EditGroup,
  groupTargetEdits: Edit[],
  sourceCursor: number,
  targetCursor: number
): { sourceCursor: number; targetCursor: number } {
  let nextSourceCursor = sourceCursor;
  let nextTargetCursor = targetCursor;

  for (const edit of groupTargetEdits) {
    const equalLength = Math.max(0, edit.source_start - nextSourceCursor);
    if (equalLength > 0) {
      appendRenderSegment(segments, {
        text: targetChars.slice(nextTargetCursor, nextTargetCursor + equalLength).join(""),
        type: "plain",
        group_id: group.group_id,
        op: "equal"
      });
      nextSourceCursor += equalLength;
      nextTargetCursor += equalLength;
    }

    appendRenderSegment(segments, renderSegmentForEdit(edit, group.group_id));
    nextSourceCursor = Math.max(nextSourceCursor, edit.source_end);
    nextTargetCursor = Math.max(nextTargetCursor, edit.target_end);
  }

  const tailEqualLength = Math.max(0, group.source_end - nextSourceCursor);
  if (tailEqualLength > 0) {
    appendRenderSegment(segments, {
      text: targetChars.slice(nextTargetCursor, nextTargetCursor + tailEqualLength).join(""),
      type: "plain",
      group_id: group.group_id,
      op: "equal"
    });
    nextSourceCursor += tailEqualLength;
    nextTargetCursor += tailEqualLength;
  }

  return {
    sourceCursor: nextSourceCursor,
    targetCursor: nextTargetCursor
  };
}

function renderSegmentForEdit(edit: Edit, groupId: string): RenderSegment {
  if (edit.op === "delete") {
    return {
      text: edit.source_text,
      type: "delete",
      group_id: groupId,
      op: "delete"
    };
  }

  if (edit.op === "insert") {
    return {
      text: edit.target_text,
      type: "insert",
      group_id: groupId,
      op: "insert"
    };
  }

  return {
    text: edit.target_text,
    type: "replace",
    group_id: groupId,
    op: "replace"
  };
}

function editsForGroup(group: EditGroup, allEdits: Edit[]): Edit[] {
  return allEdits.filter((edit) => editBelongsToGroup(edit, group));
}

function editBelongsToGroup(edit: Edit, group: EditGroup): boolean {
  if (isPointSpan(group)) {
    return edit.source_start === group.source_start && edit.source_end === group.source_end;
  }

  return edit.source_start >= group.source_start && edit.source_end <= group.source_end;
}

function appendPlain(segments: RenderSegment[], text: string): void {
  if (text === "") {
    return;
  }

  appendRenderSegment(segments, { text, type: "plain" });
}

function appendRenderSegment(segments: RenderSegment[], segment: RenderSegment): void {
  const previous = segments[segments.length - 1];
  const canMerge =
    previous &&
    previous.type === segment.type &&
    previous.group_id === segment.group_id &&
    previous.op === segment.op &&
    segment.type !== "anchor";

  if (canMerge) {
    previous.text += segment.text;
    return;
  }

  segments.push(segment);
}

function isPointSpan(span: SourceSpan): boolean {
  return span.source_start === span.source_end;
}

function compareGroups(first: EditGroup, second: EditGroup): number {
  return first.source_start - second.source_start || first.source_end - second.source_end;
}

function compareEditsByPosition(first: Edit, second: Edit): number {
  return (
    first.source_start - second.source_start ||
    first.source_end - second.source_end ||
    first.target_start - second.target_start ||
    first.target_end - second.target_end
  );
}
