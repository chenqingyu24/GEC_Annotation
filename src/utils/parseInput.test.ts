import { describe, expect, it } from "vitest";
import { buildManualSample, parseJsonSamples } from "./parseInput";

describe("parseJsonSamples", () => {
  it("parses a JSON array and generates missing sample ids", () => {
    const samples = parseJsonSamples([
      {
        source: "我昨天去学校。",
        candidates: [{ text: "我昨天去了学校。" }]
      },
      {
        source: "我喜欢学习。",
        candidates: [{ text: "我爱学习。" }]
      }
    ]);

    expect(samples.map((sample) => sample.id)).toEqual(["sample_1", "sample_2"]);
    expect(samples.map((sample) => sample.candidates[0].id)).toEqual([
      "candidate_1",
      "candidate_1"
    ]);
  });

  it("keeps empty candidate text from JSON", () => {
    const samples = parseJsonSamples({
      source: "我昨天去了学校。",
      candidates: [{ id: "model_a", text: "" }]
    });

    expect(samples[0].candidates[0].text).toBe("");
  });

  it("keeps JSON whitespace strings", () => {
    const samples = parseJsonSamples({
      source: "   ",
      references: ["   "],
      candidates: [{ text: "   " }]
    });

    expect(samples[0].source).toBe("   ");
    expect(samples[0].references).toEqual(["   "]);
    expect(samples[0].candidates[0].text).toBe("   ");
  });

  it("rejects non-string source values", () => {
    expect(() =>
      parseJsonSamples({
        source: 123,
        candidates: [{ text: "candidate" }]
      })
    ).toThrow(/source/);
  });

  it("rejects non-array references values", () => {
    expect(() =>
      parseJsonSamples({
        source: "source",
        references: "reference",
        candidates: [{ text: "candidate" }]
      })
    ).toThrow(/references/);
  });

  it("rejects non-string reference items", () => {
    expect(() =>
      parseJsonSamples({
        source: "source",
        references: ["reference", 123],
        candidates: [{ text: "candidate" }]
      })
    ).toThrow(/references\[1\]/);
  });

  it("ignores empty JSON references only", () => {
    const samples = parseJsonSamples({
      source: "我昨天去学校。",
      references: ["", "   ", "我昨天去了学校。"],
      candidates: [{ text: "我昨天去了学校。" }]
    });

    expect(samples[0].references).toEqual(["   ", "我昨天去了学校。"]);
  });

  it("rejects non-array candidates values", () => {
    expect(() =>
      parseJsonSamples({
        source: "source",
        candidates: "candidate"
      })
    ).toThrow(/candidates/);
  });

  it("rejects empty candidates arrays", () => {
    expect(() =>
      parseJsonSamples({
        source: "source",
        candidates: []
      })
    ).toThrow();
  });

  it("rejects non-string candidate text values", () => {
    expect(() =>
      parseJsonSamples({
        source: "source",
        candidates: [{ text: 123 }]
      })
    ).toThrow(/candidates\[0\]\.text/);
  });

  it("generates candidate ids by order for multiple missing ids in one sample", () => {
    const samples = parseJsonSamples({
      source: "source",
      candidates: [{ text: "candidate one" }, { text: "candidate two" }]
    });

    expect(samples[0].candidates.map((candidate) => candidate.id)).toEqual([
      "candidate_1",
      "candidate_2"
    ]);
  });

  it("suffixes candidate ids that conflict with generated reference ids", () => {
    const samples = parseJsonSamples({
      source: "我昨天去学校。",
      references: ["我昨天去了学校。"],
      candidates: [{ id: "ref_1", text: "我昨天去学校。" }]
    });

    expect(samples[0].candidates.map((candidate) => candidate.id)).toEqual([
      "ref_1_2"
    ]);
  });

  it("suffixes duplicate candidate ids", () => {
    const samples = parseJsonSamples({
      source: "我昨天去学校。",
      candidates: [
        { id: "model_a", text: "我昨天去了学校。" },
        { id: "model_a", text: "我昨天去过学校。" }
      ]
    });

    expect(samples[0].candidates.map((candidate) => candidate.id)).toEqual([
      "model_a",
      "model_a_2"
    ]);
  });

  it("rejects the whole JSON array when any sample is invalid", () => {
    expect(() =>
      parseJsonSamples([
        {
          id: "good_sample",
          source: "我昨天去学校。",
          candidates: [{ text: "我昨天去了学校。" }]
        },
        {
          id: "bad_sample",
          source: "",
          candidates: [{ text: "我昨天去了学校。" }]
        }
      ])
    ).toThrow(/bad_sample|第 2 个样本/);
  });

  it("rejects empty JSON arrays", () => {
    expect(() => parseJsonSamples([])).toThrow(/至少|empty/i);
  });

  it("rejects non-object JSON top-level values", () => {
    expect(() => parseJsonSamples("not a sample")).toThrow(/顶层|top-level|object/i);
  });
});

describe("buildManualSample", () => {
  it("keeps manual non-empty text without trimming", () => {
    const sample = buildManualSample({
      source: " 我喜欢学习。 ",
      references: [" ", " 我喜欢学习。 "],
      candidates: [" ", " 我喜欢学习。"]
    });

    expect(sample).toEqual({
      id: "manual_sample",
      source: " 我喜欢学习。 ",
      references: [" 我喜欢学习。 "],
      candidates: [{ id: "candidate_1", text: " 我喜欢学习。" }]
    });
  });

  it("rejects manual input without any effective candidate", () => {
    expect(() =>
      buildManualSample({
        source: "我喜欢学习。",
        references: [],
        candidates: ["", "   "]
      })
    ).toThrow(/修改/);
  });
});
