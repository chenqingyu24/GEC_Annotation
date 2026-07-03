import { describe, expect, it } from "vitest";
import { charDiff } from "./diff";

describe("charDiff", () => {
  it("diffs 问题 to 题目 with deterministic LCS edits", () => {
    expect(charDiff("问题", "题目")).toEqual([
      {
        op: "delete",
        source_start: 0,
        source_end: 1,
        source_text: "问",
        target_start: 0,
        target_end: 0,
        target_text: ""
      },
      {
        op: "insert",
        source_start: 2,
        source_end: 2,
        source_text: "",
        target_start: 1,
        target_end: 2,
        target_text: "目"
      }
    ]);
  });

  it("deletes a prefix", () => {
    expect(charDiff("好的，我明天去学校。", "我明天去学校。")).toEqual([
      {
        op: "delete",
        source_start: 0,
        source_end: 3,
        source_text: "好的，",
        target_start: 0,
        target_end: 0,
        target_text: ""
      }
    ]);
  });

  it("inserts text in the middle", () => {
    expect(charDiff("我昨天去学校。", "我昨天去了学校。")).toEqual([
      {
        op: "insert",
        source_start: 4,
        source_end: 4,
        source_text: "",
        target_start: 4,
        target_end: 5,
        target_text: "了"
      }
    ]);
  });

  it("returns one edit for full deletion", () => {
    expect(charDiff("全部删除", "")).toEqual([
      {
        op: "delete",
        source_start: 0,
        source_end: 4,
        source_text: "全部删除",
        target_start: 0,
        target_end: 0,
        target_text: ""
      }
    ]);
  });

  it("treats whitespace as editable text", () => {
    expect(charDiff("我 喜欢", "我喜欢")).toEqual([
      {
        op: "delete",
        source_start: 1,
        source_end: 2,
        source_text: " ",
        target_start: 1,
        target_end: 1,
        target_text: ""
      }
    ]);
  });

  it("throws when the LCS matrix would be too large", () => {
    expect(() => charDiff("a".repeat(2001), "b".repeat(1000))).toThrow(
      "当前样本文本过长，字符级对齐计算量过大，请缩短 source 或 candidate/reference 后重试。"
    );
  });
});
