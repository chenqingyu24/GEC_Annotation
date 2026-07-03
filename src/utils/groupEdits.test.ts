import { describe, expect, it } from "vitest";
import type { Edit, Target } from "../types";
import { groupOverlappingEdits } from "./groupEdits";

function editFor(target: Target, edit: Edit): Edit {
  return {
    ...edit,
    target_id: target.id,
    target_type: target.type
  };
}

describe("groupOverlappingEdits", () => {
  it("creates a delete group for full sentence deletion", () => {
    const source = "abc";
    const target: Target = { id: "candidate_1", type: "candidate", text: "" };

    const groups = groupOverlappingEdits(source, [target], [
      editFor(target, {
        op: "delete",
        source_start: 0,
        source_end: 3,
        source_text: "abc",
        target_start: 0,
        target_end: 0,
        target_text: ""
      })
    ]);

    expect(groups).toEqual([
      {
        group_id: "edit_group_1",
        source_start: 0,
        source_end: 3,
        source_text: "abc",
        items: {
          candidate_1: {
            text: "",
            op: "delete",
            segments: [{ text: "abc", op: "delete" }]
          }
        }
      }
    ]);
  });

  it("uses anchor items for targets without a pure insertion", () => {
    const source = "ab";
    const inserted: Target = { id: "candidate_inserted", type: "candidate", text: "aXb" };
    const unchanged: Target = { id: "candidate_plain", type: "candidate", text: "ab" };

    const groups = groupOverlappingEdits(source, [inserted, unchanged], [
      editFor(inserted, {
        op: "insert",
        source_start: 1,
        source_end: 1,
        source_text: "",
        target_start: 1,
        target_end: 2,
        target_text: "X"
      })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].source_start).toBe(1);
    expect(groups[0].source_end).toBe(1);
    expect(groups[0].items.candidate_inserted).toEqual({
      text: "X",
      op: "insert",
      segments: [{ text: "X", op: "insert" }]
    });
    expect(groups[0].items.candidate_plain).toEqual({
      text: "",
      op: "anchor",
      segments: [{ text: "", op: "anchor" }]
    });
  });

  it("keeps a local deletion item as replace while preserving delete segments", () => {
    const source = "\u611f\u5230\u5f88\u6709\u5174\u8da3";
    const targetText = "\u5f88\u6709\u5174\u8da3";
    const target: Target = { id: "candidate_1", type: "candidate", text: targetText };

    const groups = groupOverlappingEdits(source, [target], [
      editFor(target, {
        op: "delete",
        source_start: 0,
        source_end: 2,
        source_text: "\u611f\u5230",
        target_start: 0,
        target_end: 0,
        target_text: ""
      })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.candidate_1).toEqual({
      text: "",
      op: "replace",
      segments: [{ text: "\u611f\u5230", op: "delete" }]
    });
  });

  it("merges overlapping source spans from multiple targets into one group", () => {
    const source = "abcdef";
    const first: Target = { id: "candidate_1", type: "candidate", text: "abXef" };
    const second: Target = { id: "candidate_2", type: "candidate", text: "abcYf" };
    const unchanged: Target = { id: "candidate_3", type: "candidate", text: "abcdef" };

    const groups = groupOverlappingEdits(source, [first, second, unchanged], [
      editFor(first, {
        op: "replace",
        source_start: 2,
        source_end: 4,
        source_text: "cd",
        target_start: 2,
        target_end: 3,
        target_text: "X"
      }),
      editFor(second, {
        op: "replace",
        source_start: 3,
        source_end: 5,
        source_text: "de",
        target_start: 3,
        target_end: 4,
        target_text: "Y"
      })
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      group_id: "edit_group_1",
      source_start: 2,
      source_end: 5,
      source_text: "cde"
    });
    expect(Object.keys(groups[0].items)).toEqual([
      "candidate_1",
      "candidate_2",
      "candidate_3"
    ]);
    expect(groups[0].items.candidate_1.segments).toEqual([
      { text: "X", op: "replace" },
      { text: "e", op: "equal" }
    ]);
    expect(groups[0].items.candidate_2.segments).toEqual([
      { text: "c", op: "equal" },
      { text: "Y", op: "replace" }
    ]);
    expect(groups[0].items.candidate_3).toEqual({
      text: "cde",
      op: "equal",
      segments: [{ text: "cde", op: "equal" }]
    });
  });

  it("uses merged edits for group bounds and detailed edits for item segments", () => {
    const source = "ab";
    const target: Target = { id: "candidate_1", type: "candidate", text: "aXbY" };
    const mergedEdits = [
      editFor(target, {
        op: "replace",
        source_start: 1,
        source_end: 2,
        source_text: "b",
        target_start: 1,
        target_end: 4,
        target_text: "XbY"
      })
    ];
    const detailedEdits = [
      editFor(target, {
        op: "insert",
        source_start: 1,
        source_end: 1,
        source_text: "",
        target_start: 1,
        target_end: 2,
        target_text: "X"
      }),
      editFor(target, {
        op: "insert",
        source_start: 2,
        source_end: 2,
        source_text: "",
        target_start: 3,
        target_end: 4,
        target_text: "Y"
      })
    ];

    const groups = groupOverlappingEdits(source, [target], mergedEdits, detailedEdits);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      source_start: 1,
      source_end: 2,
      source_text: "b"
    });
    expect(groups[0].items.candidate_1).toEqual({
      text: "XbY",
      op: "replace",
      segments: [
        { text: "X", op: "insert" },
        { text: "b", op: "equal" },
        { text: "Y", op: "insert" }
      ]
    });
  });

  it("merges insertions that are within one character of a span boundary", () => {
    const source = "abc";
    const target: Target = { id: "candidate_1", type: "candidate", text: "aXbcY" };
    const edits = [
      editFor(target, {
        op: "insert",
        source_start: 3,
        source_end: 3,
        source_text: "",
        target_start: 4,
        target_end: 5,
        target_text: "Y"
      }),
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

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      source_start: 1,
      source_end: 3,
      source_text: "bc"
    });
    expect(groups[0].items.candidate_1.segments).toEqual([
      { text: "X", op: "replace" },
      { text: "c", op: "equal" },
      { text: "Y", op: "insert" }
    ]);
  });

  it("sorts groups by source_start after stable grouping", () => {
    const source = "abcd";
    const target: Target = { id: "candidate_1", type: "candidate", text: "aXbcYd" };
    const edits = [
      editFor(target, {
        op: "insert",
        source_start: 3,
        source_end: 3,
        source_text: "",
        target_start: 4,
        target_end: 5,
        target_text: "Y"
      }),
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

    expect(groups.map((group) => group.source_start)).toEqual([1, 3]);
    expect(groups.map((group) => group.group_id)).toEqual(["edit_group_1", "edit_group_2"]);
  });
});
