import type {
  AlignmentCell,
  AlignmentCellOp,
  AlignmentCellPart,
  AlignmentLine,
  AlignmentSlot,
  AlignmentSlotKind,
  AlignmentView,
  EditGroup,
  EditGroupItem,
  EditGroupItemSegment,
  EditOp,
  Target
} from "../types";

interface SlotDraft {
  slot: AlignmentSlot;
  cellsByLineId: Record<string, AlignmentCell>;
}

interface ExtractedItem {
  mainSegments: EditGroupItemSegment[];
  punctuationSegments: EditGroupItemSegment[];
}

type SourceAlignmentOp = "plain" | "replace" | "delete";
type VisibleEditOp = Extract<EditOp, "replace" | "delete" | "insert">;

export function buildAlignmentView(
  source: string,
  targets: Target[],
  editGroups: EditGroup[],
  selectedReferenceId?: string | null
): AlignmentView {
  const sourceChars = Array.from(source);
  const activeReferenceId = resolveReferenceId(targets, selectedReferenceId);
  const drafts: SlotDraft[] = [];
  let sourceCursor = 0;

  for (const group of [...editGroups].sort(compareGroups)) {
    if (group.source_start > sourceCursor) {
      drafts.push(buildPlainSlot(sourceChars, targets, sourceCursor, group.source_start));
    }

    drafts.push(...buildGroupSlots(group, targets, activeReferenceId));
    sourceCursor = Math.max(sourceCursor, group.source_end);
  }

  if (sourceCursor < sourceChars.length) {
    drafts.push(buildPlainSlot(sourceChars, targets, sourceCursor, sourceChars.length));
  }

  return {
    selected_reference_id: activeReferenceId,
    slots: drafts.map((draft) => draft.slot),
    lines: buildLines(source, targets, drafts)
  };
}

function resolveReferenceId(targets: Target[], selectedReferenceId?: string | null): string | null {
  const references = targets.filter((target) => target.type === "reference");

  if (
    selectedReferenceId &&
    references.some((target) => target.id === selectedReferenceId)
  ) {
    return selectedReferenceId;
  }

  return references[0]?.id ?? null;
}

function buildPlainSlot(
  sourceChars: string[],
  targets: Target[],
  sourceStart: number,
  sourceEnd: number
): SlotDraft {
  const text = sourceChars.slice(sourceStart, sourceEnd).join("");
  const cellsByLineId: Record<string, AlignmentCell> = {
    source: cellFromVisibleSegments([{ text, op: "equal" }], "plain")
  };

  for (const target of targets) {
    cellsByLineId[target.id] = cellFromVisibleSegments([{ text, op: "equal" }], "plain");
  }

  return finalizeSlot({
    slot: {
      slot_id: `plain_${sourceStart}_${sourceEnd}`,
      kind: "plain",
      source_start: sourceStart,
      source_end: sourceEnd,
      source_text: text,
      label: text,
      column_width_ch: 0,
      is_difference: false
    },
    cellsByLineId
  });
}

function buildGroupSlots(
  group: EditGroup,
  targets: Target[],
  activeReferenceId: string | null
): SlotDraft[] {
  const isPoint = group.source_start === group.source_end;
  const extractedByTarget = new Map<string, ExtractedItem>();

  for (const target of targets) {
    extractedByTarget.set(
      target.id,
      extractItemForSlots(group, group.items[target.id], isPoint)
    );
  }

  const mainCellsByLineId: Record<string, AlignmentCell> = {};
  const referenceExtraction =
    activeReferenceId === null ? undefined : extractedByTarget.get(activeReferenceId);
  const referenceMainSegments = referenceExtraction?.mainSegments ?? [];
  const sourceOp = sourceOpFromReferenceSegments(referenceMainSegments);

  mainCellsByLineId.source = isPoint
    ? emptyCell(group.group_id, sourceEmptyOpFromReferenceSegments(referenceMainSegments))
    : sourceCellForGroup(group, sourceOp);

  for (const target of targets) {
    const extracted = extractedByTarget.get(target.id);
    const item = group.items[target.id];
    mainCellsByLineId[target.id] = cellFromVisibleSegments(
      extracted?.mainSegments ?? [],
      "plain",
      group.group_id,
      targetPartOpOverride(item, sourceOp, isPoint)
    );
  }

  const drafts = [
    finalizeSlot({
      slot: {
        slot_id: group.group_id,
        kind: groupSlotKind(mainCellsByLineId, isPoint),
        source_start: group.source_start,
        source_end: group.source_end,
        source_text: group.source_text,
        group_id: group.group_id,
        label: group.source_text || "空槽位",
        column_width_ch: 0,
        is_difference: true
      },
      cellsByLineId: mainCellsByLineId
    })
  ];

  if (!hasPunctuationSlot(extractedByTarget)) {
    return drafts;
  }

  const punctuationCellsByLineId: Record<string, AlignmentCell> = {
    source: emptyCell(group.group_id)
  };

  for (const target of targets) {
    const extracted = extractedByTarget.get(target.id);
    punctuationCellsByLineId[target.id] = cellFromVisibleSegments(
      extracted?.punctuationSegments ?? [],
      "insert",
      group.group_id
    );
  }

  drafts.push(
    finalizeSlot({
      slot: {
        slot_id: `${group.group_id}_punct`,
        kind: "punctuation",
        source_start: group.source_end,
        source_end: group.source_end,
        source_text: "",
        group_id: group.group_id,
        label: "标点差异",
        column_width_ch: 0,
        is_difference: true
      },
      cellsByLineId: punctuationCellsByLineId
    })
  );

  return drafts;
}

function extractItemForSlots(
  group: EditGroup,
  item: EditGroupItem | undefined,
  isPoint: boolean
): ExtractedItem {
  const segments = cloneSegments(item?.segments ?? []);

  if (isPoint || !sourceHasCoreText(group.source_text)) {
    return {
      mainSegments: segments,
      punctuationSegments: []
    };
  }

  const punctuationSegments: EditGroupItemSegment[] = [];

  while (segments.length > 0) {
    const last = segments[segments.length - 1];

    if (last.op === "insert" && isOnlyPunctuation(last.text)) {
      punctuationSegments.unshift({ ...last });
      segments.pop();
      continue;
    }

    if (last.op === "insert" || last.op === "replace") {
      const split = splitTrailingPunctuation(last.text);

      if (split.punctuation && !group.source_text.endsWith(split.punctuation)) {
        punctuationSegments.unshift({
          text: split.punctuation,
          op: "insert"
        });

        if (split.body) {
          segments[segments.length - 1] = {
            ...last,
            text: split.body
          };
        } else {
          segments.pop();
        }
        continue;
      }
    }

    break;
  }

  return {
    mainSegments: segments.filter((segment) => segment.text !== "" || segment.op === "anchor"),
    punctuationSegments
  };
}

function sourceCellForGroup(
  group: EditGroup,
  op: SourceAlignmentOp
): AlignmentCell {
  const segmentOp: EditOp = op === "plain" ? "equal" : op;

  return {
    text: group.source_text,
    op,
    is_empty: false,
    group_id: group.group_id,
    parts: partsFromSegments([
      {
        text: group.source_text,
        op: segmentOp
      }
    ])
  };
}

function sourceOpFromReferenceSegments(segments: EditGroupItemSegment[]): SourceAlignmentOp {
  const hasReplace = segments.some((segment) => segment.op === "replace");
  const hasDelete = segments.some((segment) => segment.op === "delete");
  const hasInsert = segments.some((segment) => segment.op === "insert");

  if (hasReplace || (hasDelete && hasInsert)) {
    return "replace";
  }

  if (hasDelete) {
    return "delete";
  }

  return "plain";
}

function sourceEmptyOpFromReferenceSegments(
  segments: EditGroupItemSegment[]
): AlignmentCellOp {
  if (segments.some((segment) => segment.op === "insert")) {
    return "insert";
  }

  return "empty";
}

function cellFromVisibleSegments(
  segments: EditGroupItemSegment[],
  fallbackOp: AlignmentCellOp,
  groupId?: string,
  partOpOverride?: VisibleEditOp
): AlignmentCell {
  const visibleSegments = segments.filter(
    (segment) =>
      segment.op === "equal" || segment.op === "insert" || segment.op === "replace"
  );
  const text = visibleSegments.map((segment) => segment.text).join("");
  const op = text
    ? partOpOverride ?? cellOpFromSegments(segments, fallbackOp)
    : emptyOpFromSegments(segments);

  if (!text) {
    return emptyCell(groupId, op);
  }

  return {
    text,
    op,
    is_empty: false,
    group_id: groupId,
    parts: partsFromSegments(overrideSegmentOps(visibleSegments, partOpOverride))
  };
}

function targetPartOpOverride(
  item: EditGroupItem | undefined,
  sourceOp: SourceAlignmentOp,
  isPoint: boolean
): VisibleEditOp | undefined {
  if (isPoint || sourceOp === "plain" || !item) {
    return undefined;
  }

  const hasTargetEdit = item.segments.some(
    (segment) => segment.op !== "equal" && segment.op !== "anchor"
  );

  if (!hasTargetEdit) {
    return sourceOp;
  }

  return sourceOp === "replace" ? "replace" : undefined;
}

function overrideSegmentOps(
  segments: EditGroupItemSegment[],
  opOverride: VisibleEditOp | undefined
): EditGroupItemSegment[] {
  if (!opOverride) {
    return segments;
  }

  return segments.map((segment) => ({
    ...segment,
    op: opOverride
  }));
}

function emptyCell(groupId?: string, op: AlignmentCellOp = "empty"): AlignmentCell {
  return {
    text: "",
    op,
    is_empty: true,
    group_id: groupId,
    parts: []
  };
}

function cellOpFromSegments(
  segments: EditGroupItemSegment[],
  fallbackOp: AlignmentCellOp
): AlignmentCellOp {
  if (segments.some((segment) => segment.op === "replace")) {
    return "replace";
  }

  if (segments.some((segment) => segment.op === "insert")) {
    return "insert";
  }

  if (segments.some((segment) => segment.op === "delete")) {
    return "delete";
  }

  return fallbackOp;
}

function emptyOpFromSegments(segments: EditGroupItemSegment[]): AlignmentCellOp {
  if (segments.some((segment) => segment.op === "delete")) {
    return "delete";
  }

  return "empty";
}

function partsFromSegments(segments: EditGroupItemSegment[]): AlignmentCellPart[] {
  const parts: AlignmentCellPart[] = [];
  let canExtractLeadingPunctuation = true;

  for (const segment of segments) {
    if (!segment.text) {
      continue;
    }

    const op = segment.op === "equal" ? "equal" : segment.op;

    if (canExtractLeadingPunctuation) {
      const split = splitLeadingPunctuation(segment.text);

      if (split.punctuation) {
        parts.push({
          text: split.punctuation,
          op,
          role: "prefix-punctuation"
        });
      }

      if (split.body) {
        parts.push({
          text: split.body,
          op,
          role: "core"
        });
      }

      canExtractLeadingPunctuation = false;
      continue;
    }

    parts.push({
      text: segment.text,
      op,
      role: "core"
    });
  }

  return parts;
}

function hasPunctuationSlot(extractedByTarget: Map<string, ExtractedItem>): boolean {
  return [...extractedByTarget.values()].some(
    (extracted) => extracted.punctuationSegments.length > 0
  );
}

function groupSlotKind(
  cellsByLineId: Record<string, AlignmentCell>,
  isPoint: boolean
): AlignmentSlotKind {
  if (isPoint) {
    return "insert";
  }

  const ops = Object.values(cellsByLineId).map((cell) => cell.op);

  if (ops.includes("replace")) {
    return "replace";
  }

  if (ops.includes("delete")) {
    return "delete";
  }

  if (ops.includes("insert")) {
    return "insert";
  }

  return "plain";
}

function finalizeSlot(draft: SlotDraft): SlotDraft {
  const cellTexts = Object.values(draft.cellsByLineId).map((cell) => cell.text);
  const columnWidth = Math.max(2, ...cellTexts.map((text) => Array.from(text).length));

  return {
    slot: {
      ...draft.slot,
      column_width_ch: columnWidth,
      is_difference:
        draft.slot.is_difference ||
        Object.values(draft.cellsByLineId).some(
          (cell) => cell.op !== "plain" && cell.op !== "empty"
        )
    },
    cellsByLineId: draft.cellsByLineId
  };
}

function buildLines(source: string, targets: Target[], drafts: SlotDraft[]): AlignmentLine[] {
  return [
    {
      id: "source",
      type: "source",
      label: "source",
      text: source,
      cells: drafts.map((draft) => draft.cellsByLineId.source)
    },
    ...targets.map((target) => ({
      id: target.id,
      type: target.type,
      label: target.id,
      text: target.text,
      cells: drafts.map((draft) => draft.cellsByLineId[target.id] ?? emptyCell())
    }))
  ];
}

function splitLeadingPunctuation(text: string): { punctuation: string; body: string } {
  const chars = Array.from(text);
  let cursor = 0;

  while (cursor < chars.length && isPunctuation(chars[cursor])) {
    cursor += 1;
  }

  return {
    punctuation: chars.slice(0, cursor).join(""),
    body: chars.slice(cursor).join("")
  };
}

function splitTrailingPunctuation(text: string): { body: string; punctuation: string } {
  const chars = Array.from(text);
  let cursor = chars.length;

  while (cursor > 0 && isPunctuation(chars[cursor - 1])) {
    cursor -= 1;
  }

  return {
    body: chars.slice(0, cursor).join(""),
    punctuation: chars.slice(cursor).join("")
  };
}

function sourceHasCoreText(text: string): boolean {
  return Array.from(text).some((char) => !isPunctuation(char));
}

function isOnlyPunctuation(text: string): boolean {
  const chars = Array.from(text);

  return chars.length > 0 && chars.every(isPunctuation);
}

function isPunctuation(char: string): boolean {
  return /[，。！？；：、,.!?;:]/u.test(char);
}

function cloneSegments(segments: EditGroupItemSegment[]): EditGroupItemSegment[] {
  return segments.map((segment) => ({ ...segment }));
}

function compareGroups(first: EditGroup, second: EditGroup): number {
  return first.source_start - second.source_start || first.source_end - second.source_end;
}
