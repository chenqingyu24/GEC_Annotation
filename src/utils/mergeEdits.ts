import type { Edit } from "../types";

const OBVIOUS_PUNCTUATION = /[，。！？；：、,.!?;:]/u;
const MAX_MERGED_TEXT_LENGTH = 12;

interface MergeDraft extends Edit {
  ops: Set<Edit["op"]>;
}

export function mergeNearbyEdits(
  source: string,
  target: string,
  edits: Edit[],
  maxGap = 2
): Edit[] {
  const sourceChars = Array.from(source);
  const targetChars = Array.from(target);
  const merged: MergeDraft[] = [];

  for (const edit of edits) {
    const nextDraft = toDraft(edit);
    const current = merged[merged.length - 1];

    if (current && canMerge(sourceChars, targetChars, current, nextDraft, maxGap)) {
      merged[merged.length - 1] = mergeDrafts(sourceChars, targetChars, current, nextDraft);
    } else {
      merged.push(nextDraft);
    }
  }

  return merged.map(({ ops: _ops, ...edit }) => edit);
}

function toDraft(edit: Edit): MergeDraft {
  return {
    ...edit,
    ops: new Set([edit.op])
  };
}

function canMerge(
  sourceChars: string[],
  targetChars: string[],
  current: MergeDraft,
  next: MergeDraft,
  maxGap: number
): boolean {
  const sourceGapLength = next.source_start - current.source_end;
  const targetGapLength = next.target_start - current.target_end;

  if (sourceGapLength < 0 || targetGapLength < 0) {
    return false;
  }

  if (sourceGapLength > maxGap || targetGapLength > maxGap) {
    return false;
  }

  if (hasMetadataConflict(current, next)) {
    return false;
  }

  const sourceGapText = sourceChars.slice(current.source_end, next.source_start).join("");
  const targetGapText = targetChars.slice(current.target_end, next.target_start).join("");

  if (OBVIOUS_PUNCTUATION.test(sourceGapText) || OBVIOUS_PUNCTUATION.test(targetGapText)) {
    return false;
  }

  const sourceText = sourceChars.slice(current.source_start, next.source_end).join("");
  const targetText = targetChars.slice(current.target_start, next.target_end).join("");

  return (
    Array.from(sourceText).length <= MAX_MERGED_TEXT_LENGTH &&
    Array.from(targetText).length <= MAX_MERGED_TEXT_LENGTH
  );
}

function mergeDrafts(
  sourceChars: string[],
  targetChars: string[],
  current: MergeDraft,
  next: MergeDraft
): MergeDraft {
  const ops = new Set([...current.ops, ...next.ops]);
  const source_start = current.source_start;
  const source_end = next.source_end;
  const target_start = current.target_start;
  const target_end = next.target_end;
  const source_text = sourceChars.slice(source_start, source_end).join("");
  const target_text = targetChars.slice(target_start, target_end).join("");
  const target_id = current.target_id ?? next.target_id;
  const target_type = current.target_type ?? next.target_type;

  const merged: MergeDraft = {
    op: getMergedOp(source_text, target_text),
    source_start,
    source_end,
    source_text,
    target_start,
    target_end,
    target_text,
    ops
  };

  if (target_id !== undefined) {
    merged.target_id = target_id;
  }

  if (target_type !== undefined) {
    merged.target_type = target_type;
  }

  return merged;
}

function hasMetadataConflict(current: MergeDraft, next: MergeDraft): boolean {
  if (
    current.target_id !== undefined &&
    next.target_id !== undefined &&
    current.target_id !== next.target_id
  ) {
    return true;
  }

  if (
    current.target_type !== undefined &&
    next.target_type !== undefined &&
    current.target_type !== next.target_type
  ) {
    return true;
  }

  return false;
}

function getMergedOp(sourceText: string, targetText: string): Edit["op"] {
  if (sourceText === "") {
    return "insert";
  }

  if (targetText === "") {
    return "delete";
  }

  return "replace";
}
