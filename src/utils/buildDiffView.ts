import type { DiffView, Edit, Sample, Target } from "../types";
import { charDiff } from "./diff";
import { groupOverlappingEdits } from "./groupEdits";
import { mergeNearbyEdits } from "./mergeEdits";
import { buildRenderLines } from "./renderText";

export function buildDiffView(sample: Sample): DiffView {
  const targets = buildTargets(sample);
  const targetEdits = targets.map((target) => buildTargetEdits(sample.source, target));
  const rawEdits = targetEdits.flatMap((edits) => edits.rawEdits);
  const mergedEdits = targetEdits.flatMap((edits) => edits.mergedEdits);
  const edit_groups = groupOverlappingEdits(sample.source, targets, mergedEdits, rawEdits);
  const render_lines = buildRenderLines(sample.source, targets, edit_groups, rawEdits);

  return {
    id: sample.id,
    source: sample.source,
    targets,
    edit_groups,
    render_lines
  };
}

function buildTargets(sample: Sample): Target[] {
  return [
    ...sample.references.map((text, index) => ({
      id: `ref_${index + 1}`,
      type: "reference" as const,
      text
    })),
    ...sample.candidates.map((candidate) => ({
      id: candidate.id,
      type: "candidate" as const,
      text: candidate.text
    }))
  ];
}

function buildTargetEdits(
  source: string,
  target: Target
): { rawEdits: Edit[]; mergedEdits: Edit[] } {
  const rawEdits = charDiff(source, target.text).map((edit) => addTargetMetadata(edit, target));
  const mergedEdits = mergeNearbyEdits(source, target.text, rawEdits).map((edit) =>
    addTargetMetadata(edit, target)
  );

  return {
    rawEdits,
    mergedEdits
  };
}

function addTargetMetadata(edit: Edit, target: Target): Edit {
  return {
    ...edit,
    target_id: target.id,
    target_type: target.type
  };
}
