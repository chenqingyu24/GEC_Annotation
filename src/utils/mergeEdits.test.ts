import { describe, expect, it } from "vitest";
import type { Edit } from "../types";
import { charDiff } from "./diff";
import { mergeNearbyEdits } from "./mergeEdits";

describe("mergeNearbyEdits", () => {
  it("merges the 问题 to 题目 replacement for display", () => {
    const source = "问题";
    const target = "题目";

    expect(mergeNearbyEdits(source, target, charDiff(source, target))).toEqual([
      {
        op: "replace",
        source_start: 0,
        source_end: 2,
        source_text: "问题",
        target_start: 0,
        target_end: 2,
        target_text: "题目"
      }
    ]);
  });

  it("does not merge across obvious punctuation", () => {
    const source = "甲，乙";
    const target = "A，B";
    const edits: Edit[] = [
      {
        op: "replace",
        source_start: 0,
        source_end: 1,
        source_text: "甲",
        target_start: 0,
        target_end: 1,
        target_text: "A"
      },
      {
        op: "replace",
        source_start: 2,
        source_end: 3,
        source_text: "乙",
        target_start: 2,
        target_end: 3,
        target_text: "B"
      }
    ];

    expect(mergeNearbyEdits(source, target, edits)).toEqual(edits);
  });

  it("turns nearby delete and insert into a replace when gaps stay within maxGap", () => {
    const source = "abcd";
    const target = "acbd";

    const merged = mergeNearbyEdits(source, target, charDiff(source, target));

    expect(merged).toEqual([
      {
        op: "replace",
        source_start: 1,
        source_end: 3,
        source_text: "bc",
        target_start: 1,
        target_end: 3,
        target_text: "cb"
      }
    ]);
  });

  it("does not merge reorder-like edits when either gap exceeds maxGap", () => {
    const source = "我把作业昨天写完了。";
    const target = "我昨天把作业写完了。";
    const edits = charDiff(source, target);

    expect(mergeNearbyEdits(source, target, edits)).toEqual(edits);
  });

  it("uses the merged spans to choose replace when two inserts absorb an equal gap", () => {
    const source = "ab";
    const target = "aXbY";
    const edits: Edit[] = [
      {
        op: "insert",
        source_start: 1,
        source_end: 1,
        source_text: "",
        target_start: 1,
        target_end: 2,
        target_text: "X"
      },
      {
        op: "insert",
        source_start: 2,
        source_end: 2,
        source_text: "",
        target_start: 3,
        target_end: 4,
        target_text: "Y"
      }
    ];

    expect(mergeNearbyEdits(source, target, edits)).toEqual([
      {
        op: "replace",
        source_start: 1,
        source_end: 2,
        source_text: "b",
        target_start: 1,
        target_end: 4,
        target_text: "XbY"
      }
    ]);
  });

  it("does not merge edits with conflicting target metadata", () => {
    const source = "ab";
    const target = "aXbY";
    const edits: Edit[] = [
      {
        op: "insert",
        source_start: 1,
        source_end: 1,
        source_text: "",
        target_start: 1,
        target_end: 2,
        target_text: "X",
        target_id: "candidate_a",
        target_type: "candidate"
      },
      {
        op: "insert",
        source_start: 2,
        source_end: 2,
        source_text: "",
        target_start: 3,
        target_end: 4,
        target_text: "Y",
        target_id: "candidate_b",
        target_type: "candidate"
      }
    ];

    expect(mergeNearbyEdits(source, target, edits)).toEqual(edits);
  });
});
