import type {
  Edit,
  EditGroup,
  EditGroupItem,
  EditGroupItemSegment,
  EditOp,
  Target
} from "../types";

interface IndexedEdit {
  edit: Edit;
  index: number;
}

interface GroupDraft {
  source_start: number;
  source_end: number;
  firstIndex: number;
  edits: IndexedEdit[];
}

interface SourceSpan {
  source_start: number;
  source_end: number;
}

export function groupOverlappingEdits(
  source: string,
  targets: Target[],
  mergedEdits: Edit[],
  detailedEdits = mergedEdits
): EditGroup[] {
  const sourceChars = Array.from(source);
  const drafts: GroupDraft[] = [];
  const indexedEdits = mergedEdits
    .map((edit, index) => ({ edit, index }))
    .sort(compareIndexedEdits);
  const indexedDetailedEdits = detailedEdits.map((edit, index) => ({ edit, index }));

  for (const indexedEdit of indexedEdits) {
    let nextDraft = draftFromEdit(indexedEdit);
    let didMerge = true;

    while (didMerge) {
      didMerge = false;

      for (let index = 0; index < drafts.length; ) {
        if (canJoinDrafts(nextDraft, drafts[index])) {
          nextDraft = mergeDrafts(nextDraft, drafts[index]);
          drafts.splice(index, 1);
          didMerge = true;
        } else {
          index += 1;
        }
      }
    }

    drafts.push(nextDraft);
  }

  return drafts
    .sort(compareDrafts)
    .map((draft, index) =>
      buildEditGroup(sourceChars, targets, draft, indexedDetailedEdits, index)
    );
}

function draftFromEdit(indexedEdit: IndexedEdit): GroupDraft {
  return {
    source_start: indexedEdit.edit.source_start,
    source_end: indexedEdit.edit.source_end,
    firstIndex: indexedEdit.index,
    edits: [indexedEdit]
  };
}

function mergeDrafts(first: GroupDraft, second: GroupDraft): GroupDraft {
  return {
    source_start: Math.min(first.source_start, second.source_start),
    source_end: Math.max(first.source_end, second.source_end),
    firstIndex: Math.min(first.firstIndex, second.firstIndex),
    edits: [...first.edits, ...second.edits].sort(compareIndexedEdits)
  };
}

function canJoinDrafts(first: SourceSpan, second: SourceSpan): boolean {
  const firstIsPoint = isPointSpan(first);
  const secondIsPoint = isPointSpan(second);

  if (!firstIsPoint && !secondIsPoint) {
    return first.source_start < second.source_end && second.source_start < first.source_end;
  }

  if (firstIsPoint && secondIsPoint) {
    return Math.abs(first.source_start - second.source_start) <= 1;
  }

  const point = firstIsPoint ? first : second;
  const span = firstIsPoint ? second : first;

  return distanceFromPointToSpan(point.source_start, span) <= 1;
}

function distanceFromPointToSpan(point: number, span: SourceSpan): number {
  if (point >= span.source_start && point <= span.source_end) {
    return 0;
  }

  return Math.min(
    Math.abs(point - span.source_start),
    Math.abs(point - span.source_end)
  );
}

function isPointSpan(span: SourceSpan): boolean {
  return span.source_start === span.source_end;
}

function buildEditGroup(
  sourceChars: string[],
  targets: Target[],
  draft: GroupDraft,
  detailedEdits: IndexedEdit[],
  index: number
): EditGroup {
  const source_text = sourceChars.slice(draft.source_start, draft.source_end).join("");
  const items: Record<string, EditGroupItem> = {};

  for (const target of targets) {
    const targetEdits = detailedEdits
      .filter(({ edit }) => edit.target_id === target.id && editBelongsToGroup(edit, draft))
      .sort(compareIndexedEdits)
      .map(({ edit }) => edit);

    items[target.id] = buildGroupItem(sourceChars, draft, targetEdits);
  }

  return {
    group_id: `edit_group_${index + 1}`,
    source_start: draft.source_start,
    source_end: draft.source_end,
    source_text,
    items
  };
}

function editBelongsToGroup(edit: Edit, group: SourceSpan): boolean {
  if (isPointSpan(group)) {
    return edit.source_start === group.source_start && edit.source_end === group.source_end;
  }

  return edit.source_start >= group.source_start && edit.source_end <= group.source_end;
}

function buildGroupItem(
  sourceChars: string[],
  group: SourceSpan,
  targetEdits: Edit[]
): EditGroupItem {
  if (targetEdits.length === 0) {
    if (isPointSpan(group)) {
      return {
        text: "",
        op: "anchor",
        segments: [{ text: "", op: "anchor" }]
      };
    }

    const text = sourceChars.slice(group.source_start, group.source_end).join("");

    return {
      text,
      op: "equal",
      segments: [{ text, op: "equal" }]
    };
  }

  const segments = buildItemSegments(sourceChars, group, targetEdits);

  return {
    text: finalTextFromSegments(segments),
    op: itemOp(sourceChars.length, group, segments),
    segments
  };
}

function buildItemSegments(
  sourceChars: string[],
  group: SourceSpan,
  targetEdits: Edit[]
): EditGroupItemSegment[] {
  const segments: EditGroupItemSegment[] = [];
  let sourceCursor = group.source_start;

  for (const edit of [...targetEdits].sort(compareEditsByPosition)) {
    if (edit.source_start > sourceCursor) {
      appendItemSegment(segments, {
        text: sourceChars.slice(sourceCursor, edit.source_start).join(""),
        op: "equal"
      });
    }

    appendItemSegment(segments, segmentForEdit(edit));
    sourceCursor = Math.max(sourceCursor, edit.source_end);
  }

  if (group.source_end > sourceCursor) {
    appendItemSegment(segments, {
      text: sourceChars.slice(sourceCursor, group.source_end).join(""),
      op: "equal"
    });
  }

  return segments;
}

function segmentForEdit(edit: Edit): EditGroupItemSegment {
  if (edit.op === "delete") {
    return {
      text: edit.source_text,
      op: "delete"
    };
  }

  if (edit.op === "insert") {
    return {
      text: edit.target_text,
      op: "insert"
    };
  }

  return {
    text: edit.target_text,
    op: "replace"
  };
}

function appendItemSegment(
  segments: EditGroupItemSegment[],
  segment: EditGroupItemSegment
): void {
  if (segment.text === "" && segment.op !== "anchor") {
    return;
  }

  const previous = segments[segments.length - 1];
  if (previous && previous.op === segment.op && segment.op !== "anchor") {
    previous.text += segment.text;
    return;
  }

  segments.push(segment);
}

function finalTextFromSegments(segments: EditGroupItemSegment[]): string {
  return segments
    .filter((segment) => segment.op === "equal" || segment.op === "insert" || segment.op === "replace")
    .map((segment) => segment.text)
    .join("");
}

function itemOp(sourceLength: number, group: SourceSpan, segments: EditGroupItemSegment[]): EditOp {
  if (segments.every((segment) => segment.op === "anchor")) {
    return "anchor";
  }

  if (segments.every((segment) => segment.op === "equal")) {
    return "equal";
  }

  if (segments.every((segment) => segment.op === "insert")) {
    return "insert";
  }

  const isFullSentenceDelete =
    group.source_start === 0 &&
    group.source_end === sourceLength &&
    segments.length > 0 &&
    segments.every((segment) => segment.op === "delete");

  return isFullSentenceDelete ? "delete" : "replace";
}

function compareDrafts(first: GroupDraft, second: GroupDraft): number {
  return (
    first.source_start - second.source_start ||
    first.source_end - second.source_end ||
    first.firstIndex - second.firstIndex
  );
}

function compareIndexedEdits(first: IndexedEdit, second: IndexedEdit): number {
  return (
    first.edit.source_start - second.edit.source_start ||
    first.edit.source_end - second.edit.source_end ||
    first.index - second.index
  );
}

function compareEditsByPosition(first: Edit, second: Edit): number {
  return (
    first.source_start - second.source_start ||
    first.source_end - second.source_end ||
    first.target_start - second.target_start ||
    first.target_end - second.target_end
  );
}
