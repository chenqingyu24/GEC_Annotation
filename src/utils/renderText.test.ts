import { describe, expect, it } from "vitest";
import type { Edit, Target } from "../types";
import { groupOverlappingEdits } from "./groupEdits";
import { buildRenderLines } from "./renderText";

function editFor(target: Target, edit: Edit): Edit {
  return {
    ...edit,
    target_id: target.id,
    target_type: target.type
  };
}

describe("buildRenderLines", () => {
  it("renders source and target as plain lines when there are no edits", () => {
    const source = "abc";
    const target: Target = { id: "candidate_1", type: "candidate", text: "abc" };

    const lines = buildRenderLines(source, [target], [], []);

    expect(lines).toEqual([
      {
        id: "source",
        type: "source",
        label: "Source",
        text: "abc",
        segments: [{ text: "abc", type: "plain" }]
      },
      {
        id: "candidate_1",
        type: "candidate",
        label: "candidate_1",
        text: "abc",
        segments: [{ text: "abc", type: "plain" }]
      }
    ]);
  });

  it("renders a source insertion point as anchor and target insertion as insert", () => {
    const source = "ab";
    const target: Target = { id: "candidate_1", type: "candidate", text: "aXb" };
    const edits = [
      editFor(target, {
        op: "insert",
        source_start: 1,
        source_end: 1,
        source_text: "",
        target_start: 1,
        target_end: 2,
        target_text: "X"
      })
    ];
    const groups = groupOverlappingEdits(source, [target], edits);

    const lines = buildRenderLines(source, [target], groups, edits);

    expect(lines[0].segments).toEqual([
      { text: "a", type: "plain" },
      {
        text: "",
        type: "anchor",
        group_id: "edit_group_1",
        op: "anchor"
      },
      { text: "b", type: "plain" }
    ]);
    expect(lines[1].segments).toEqual([
      { text: "a", type: "plain" },
      {
        text: "X",
        type: "insert",
        group_id: "edit_group_1",
        op: "insert"
      },
      { text: "b", type: "plain" }
    ]);
  });

  it("renders delete segments on both source and target lines", () => {
    const source = "abc";
    const target: Target = { id: "candidate_1", type: "candidate", text: "ac" };
    const edits = [
      editFor(target, {
        op: "delete",
        source_start: 1,
        source_end: 2,
        source_text: "b",
        target_start: 1,
        target_end: 1,
        target_text: ""
      })
    ];
    const groups = groupOverlappingEdits(source, [target], edits);

    const lines = buildRenderLines(source, [target], groups, edits);

    expect(lines[0].segments).toContainEqual({
      text: "b",
      type: "delete",
      group_id: "edit_group_1",
      op: "delete"
    });
    expect(lines[1].segments).toContainEqual({
      text: "b",
      type: "delete",
      group_id: "edit_group_1",
      op: "delete"
    });
  });

  it("renders source anchors inside a mixed span group", () => {
    const source = "abc";
    const target: Target = { id: "candidate_1", type: "candidate", text: "aXcY" };
    const mergedEdits = [
      editFor(target, {
        op: "replace",
        source_start: 1,
        source_end: 3,
        source_text: "bc",
        target_start: 1,
        target_end: 4,
        target_text: "XcY"
      })
    ];
    const detailedEdits = [
      editFor(target, {
        op: "replace",
        source_start: 1,
        source_end: 2,
        source_text: "b",
        target_start: 1,
        target_end: 2,
        target_text: "X"
      }),
      editFor(target, {
        op: "insert",
        source_start: 3,
        source_end: 3,
        source_text: "",
        target_start: 3,
        target_end: 4,
        target_text: "Y"
      })
    ];
    const groups = groupOverlappingEdits(source, [target], mergedEdits, detailedEdits);

    const lines = buildRenderLines(source, [target], groups, detailedEdits);

    expect(lines[0].segments).toEqual([
      { text: "a", type: "plain" },
      {
        text: "b",
        type: "replace",
        group_id: "edit_group_1",
        op: "replace"
      },
      {
        text: "c",
        type: "plain",
        group_id: "edit_group_1",
        op: "equal"
      },
      {
        text: "",
        type: "anchor",
        group_id: "edit_group_1",
        op: "anchor"
      }
    ]);
  });

  it("renders replace segments with source text on source and target text on target", () => {
    const source = "abc";
    const target: Target = { id: "candidate_1", type: "candidate", text: "aXc" };
    const edits = [
      editFor(target, {
        op: "replace",
        source_start: 1,
        source_end: 2,
        source_text: "b",
        target_start: 1,
        target_end: 2,
        target_text: "X"
      })
    ];
    const groups = groupOverlappingEdits(source, [target], edits);

    const lines = buildRenderLines(source, [target], groups, edits);

    expect(lines[0].segments).toContainEqual({
      text: "b",
      type: "replace",
      group_id: "edit_group_1",
      op: "replace"
    });
    expect(lines[1].segments).toContainEqual({
      text: "X",
      type: "replace",
      group_id: "edit_group_1",
      op: "replace"
    });
  });
});
