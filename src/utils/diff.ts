import type { Edit } from "../types";

const MAX_LCS_CELLS = 2_000_000;
const LCS_LIMIT_ERROR =
  "当前样本文本过长，字符级对齐计算量过大，请缩短 source 或 candidate/reference 后重试。";

type DiffStep = "equal" | "delete" | "insert";

interface PositionedStep {
  op: DiffStep;
  sourceIndex: number;
  targetIndex: number;
}

interface EditDraft {
  source_start: number;
  source_end: number;
  target_start: number;
  target_end: number;
}

export function charDiff(source: string, target: string): Edit[] {
  const sourceChars = Array.from(source);
  const targetChars = Array.from(target);
  const sourceLength = sourceChars.length;
  const targetLength = targetChars.length;

  if (sourceLength * targetLength > MAX_LCS_CELLS) {
    throw new Error(LCS_LIMIT_ERROR);
  }

  const steps = buildDiffSteps(sourceChars, targetChars);

  return buildEdits(sourceChars, targetChars, steps);
}

function buildDiffSteps(sourceChars: string[], targetChars: string[]): PositionedStep[] {
  const sourceLength = sourceChars.length;
  const targetLength = targetChars.length;
  const width = targetLength + 1;
  const dp = new Uint32Array((sourceLength + 1) * width);

  for (let sourceIndex = 1; sourceIndex <= sourceLength; sourceIndex += 1) {
    for (let targetIndex = 1; targetIndex <= targetLength; targetIndex += 1) {
      const current = sourceIndex * width + targetIndex;

      if (sourceChars[sourceIndex - 1] === targetChars[targetIndex - 1]) {
        dp[current] = dp[(sourceIndex - 1) * width + targetIndex - 1] + 1;
      } else {
        const deleteScore = dp[(sourceIndex - 1) * width + targetIndex];
        const insertScore = dp[sourceIndex * width + targetIndex - 1];
        dp[current] = deleteScore >= insertScore ? deleteScore : insertScore;
      }
    }
  }

  const reversedSteps: DiffStep[] = [];
  let sourceIndex = sourceLength;
  let targetIndex = targetLength;

  while (sourceIndex > 0 || targetIndex > 0) {
    if (
      sourceIndex > 0 &&
      targetIndex > 0 &&
      sourceChars[sourceIndex - 1] === targetChars[targetIndex - 1]
    ) {
      reversedSteps.push("equal");
      sourceIndex -= 1;
      targetIndex -= 1;
    } else if (
      sourceIndex > 0 &&
      (targetIndex === 0 ||
        dp[(sourceIndex - 1) * width + targetIndex] >=
          dp[sourceIndex * width + targetIndex - 1])
    ) {
      reversedSteps.push("delete");
      sourceIndex -= 1;
    } else {
      reversedSteps.push("insert");
      targetIndex -= 1;
    }
  }

  const steps: PositionedStep[] = [];
  sourceIndex = 0;
  targetIndex = 0;

  for (let index = reversedSteps.length - 1; index >= 0; index -= 1) {
    const op = reversedSteps[index];

    steps.push({ op, sourceIndex, targetIndex });

    if (op === "equal") {
      sourceIndex += 1;
      targetIndex += 1;
    } else if (op === "delete") {
      sourceIndex += 1;
    } else {
      targetIndex += 1;
    }
  }

  return steps;
}

function buildEdits(
  sourceChars: string[],
  targetChars: string[],
  steps: PositionedStep[]
): Edit[] {
  const edits: Edit[] = [];
  let draft: EditDraft | undefined;

  const flushDraft = () => {
    if (!draft) {
      return;
    }

    const sourceText = sourceChars.slice(draft.source_start, draft.source_end).join("");
    const targetText = targetChars.slice(draft.target_start, draft.target_end).join("");

    edits.push({
      op: getEditOp(sourceText, targetText),
      source_start: draft.source_start,
      source_end: draft.source_end,
      source_text: sourceText,
      target_start: draft.target_start,
      target_end: draft.target_end,
      target_text: targetText
    });
    draft = undefined;
  };

  for (const step of steps) {
    if (step.op === "equal") {
      flushDraft();
      continue;
    }

    if (!draft) {
      draft = {
        source_start: step.sourceIndex,
        source_end: step.sourceIndex,
        target_start: step.targetIndex,
        target_end: step.targetIndex
      };
    }

    if (step.op === "delete") {
      draft.source_start = Math.min(draft.source_start, step.sourceIndex);
      draft.source_end = Math.max(draft.source_end, step.sourceIndex + 1);
    } else {
      draft.target_start = Math.min(draft.target_start, step.targetIndex);
      draft.target_end = Math.max(draft.target_end, step.targetIndex + 1);
    }
  }

  flushDraft();

  return edits;
}

function getEditOp(sourceText: string, targetText: string): Edit["op"] {
  if (sourceText.length === 0) {
    return "insert";
  }

  if (targetText.length === 0) {
    return "delete";
  }

  return "replace";
}
