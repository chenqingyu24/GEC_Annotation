import { describe, expect, it } from "vitest";
import type { Sample } from "../types";
import { buildAlignmentView } from "./buildAlignmentView";
import { buildDiffView } from "./buildDiffView";

const medicalSample: Sample = {
  id: "medical_alignment",
  source: "医药部门降低了某药适应症范围，并禁止儿童使用",
  references: ["医药部门缩小了某药适应症范围，并禁止儿童使用。"],
  candidates: [
    {
      id: "candidate_1",
      text: "医药部门明确了某药儿童禁用，并将适应症范围降到最低。"
    },
    {
      id: "candidate_2",
      text: "医药部门降低了某药适应症范围，并禁止儿童使用"
    }
  ]
};

describe("buildAlignmentView", () => {
  it("expands candidate insertions as empty slots and keeps added sentence punctuation separate", () => {
    const diffView = buildDiffView(medicalSample);

    const alignment = buildAlignmentView(
      diffView.source,
      diffView.targets,
      diffView.edit_groups,
      "ref_1"
    );

    const sourceLine = lineById(alignment, "source");
    const referenceLine = lineById(alignment, "ref_1");
    const candidateLine = lineById(alignment, "candidate_1");
    const unchangedCandidateLine = lineById(alignment, "candidate_2");

    const candidateInsertIndex = alignment.slots.findIndex(
      (_slot, index) => candidateLine.cells[index].text === "儿童禁用，并将"
    );
    expect(candidateInsertIndex).toBeGreaterThanOrEqual(0);
    expect(sourceLine.cells[candidateInsertIndex]).toMatchObject({
      text: "",
      op: "empty",
      is_empty: true
    });
    expect(referenceLine.cells[candidateInsertIndex]).toMatchObject({
      text: "",
      op: "empty",
      is_empty: true
    });
    expect(unchangedCandidateLine.cells[candidateInsertIndex]).toMatchObject({
      text: "",
      op: "empty",
      is_empty: true
    });
    expect(candidateLine.cells[candidateInsertIndex]).toMatchObject({
      text: "儿童禁用，并将",
      op: "insert",
      is_empty: false
    });

    const replacementIndex = alignment.slots.findIndex(
      (_slot, index) => candidateLine.cells[index].text === "降到最低"
    );
    expect(replacementIndex).toBeGreaterThanOrEqual(0);
    expect(sourceLine.cells[replacementIndex].text).toBe("，并禁止儿童使用");
    expect(sourceLine.cells[replacementIndex].parts).toEqual([
      { text: "，", op: "equal", role: "prefix-punctuation" },
      { text: "并禁止儿童使用", op: "equal", role: "core" }
    ]);
    expect(candidateLine.cells[replacementIndex].parts).toEqual([
      { text: "降到最低", op: "replace", role: "core" }
    ]);

    const punctuationIndex = alignment.slots.findIndex(
      (slot, index) =>
        slot.kind === "punctuation" && referenceLine.cells[index].text === "。"
    );
    expect(punctuationIndex).toBeGreaterThanOrEqual(0);
    expect(sourceLine.cells[punctuationIndex]).toMatchObject({
      text: "",
      op: "empty",
      is_empty: true
    });
    expect(referenceLine.cells[punctuationIndex]).toMatchObject({
      text: "。",
      op: "insert",
      is_empty: false
    });
    expect(candidateLine.cells[punctuationIndex]).toMatchObject({
      text: "。",
      op: "insert",
      is_empty: false
    });
    expect(unchangedCandidateLine.cells[punctuationIndex]).toMatchObject({
      text: "",
      op: "empty",
      is_empty: true
    });
  });

  it("bases source-line edit styling on the selected reference", () => {
    const diffView = buildDiffView({
      id: "reference_authority",
      source: "abc",
      references: ["abc", "axc"],
      candidates: [{ id: "candidate_1", text: "axc" }]
    });

    const refOneAlignment = buildAlignmentView(
      diffView.source,
      diffView.targets,
      diffView.edit_groups,
      "ref_1"
    );
    const refTwoAlignment = buildAlignmentView(
      diffView.source,
      diffView.targets,
      diffView.edit_groups,
      "ref_2"
    );

    const candidateEditIndex = refOneAlignment.slots.findIndex(
      (_slot, index) => lineById(refOneAlignment, "candidate_1").cells[index].text === "x"
    );

    expect(lineById(refOneAlignment, "source").cells[candidateEditIndex].op).toBe("plain");
    expect(lineById(refTwoAlignment, "source").cells[candidateEditIndex].op).toBe("replace");
  });

  it("keeps source text visible when the selected reference deletes it", () => {
    const diffView = buildDiffView({
      id: "reference_delete",
      source: "abc",
      references: ["abc", "ac"],
      candidates: [{ id: "candidate_1", text: "abc" }]
    });

    const alignment = buildAlignmentView(
      diffView.source,
      diffView.targets,
      diffView.edit_groups,
      "ref_2"
    );
    const deletedIndex = alignment.slots.findIndex((slot) => slot.source_text === "b");

    expect(deletedIndex).toBeGreaterThanOrEqual(0);
    expect(lineById(alignment, "source").cells[deletedIndex]).toMatchObject({
      text: "b",
      op: "delete",
      is_empty: false,
      parts: [{ text: "b", op: "delete", role: "core" }]
    });
    expect(lineById(alignment, "ref_2").cells[deletedIndex]).toMatchObject({
      text: "",
      op: "delete",
      is_empty: true
    });
  });
});

function lineById(
  alignment: ReturnType<typeof buildAlignmentView>,
  lineId: string
) {
  const line = alignment.lines.find((candidateLine) => candidateLine.id === lineId);
  if (!line) {
    throw new Error(`Missing line ${lineId}`);
  }

  return line;
}
