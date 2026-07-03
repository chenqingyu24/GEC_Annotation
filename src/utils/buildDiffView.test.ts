import { describe, expect, it } from "vitest";
import type { Sample } from "../types";
import { buildDiffView } from "./buildDiffView";

describe("buildDiffView", () => {
  it("returns targets in reference then candidate order with stable ids", () => {
    const sample: Sample = {
      id: "sample_1",
      source: "abc",
      references: ["axc", "abc"],
      candidates: [{ id: "model_b", text: "abXc" }]
    };

    const view = buildDiffView(sample);

    expect(view.targets).toEqual([
      { id: "ref_1", type: "reference", text: "axc" },
      { id: "ref_2", type: "reference", text: "abc" },
      { id: "model_b", type: "candidate", text: "abXc" }
    ]);
    expect(view.render_lines.map((line) => line.id)).toEqual([
      "source",
      "ref_1",
      "ref_2",
      "model_b"
    ]);
  });

  it("does not create reference targets when a sample has no references", () => {
    const sample: Sample = {
      id: "sample_no_refs",
      source: "abc",
      references: [],
      candidates: [{ id: "candidate_1", text: "abc" }]
    };

    const view = buildDiffView(sample);

    expect(view.targets).toEqual([
      { id: "candidate_1", type: "candidate", text: "abc" }
    ]);
    expect(view.targets.some((target) => target.type === "reference")).toBe(false);
  });

  it("preserves detailed segments inside an end-to-end merged group", () => {
    const sample: Sample = {
      id: "sample_insert_merge",
      source: "ab",
      references: [],
      candidates: [{ id: "candidate_1", text: "aXbY" }]
    };

    const view = buildDiffView(sample);

    expect(view.edit_groups).toHaveLength(1);
    expect(view.edit_groups[0]).toMatchObject({
      source_start: 1,
      source_end: 2,
      source_text: "b"
    });
    expect(view.edit_groups[0].items.candidate_1.segments).toEqual([
      { text: "X", op: "insert" },
      { text: "b", op: "equal" },
      { text: "Y", op: "insert" }
    ]);
    expect(view.render_lines[0].segments).toEqual([
      { text: "a", type: "plain" },
      {
        text: "",
        type: "anchor",
        group_id: "edit_group_1",
        op: "anchor"
      },
      {
        text: "b",
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

  it("renders no-change samples as plain lines without edit groups", () => {
    const sample: Sample = {
      id: "sample_plain",
      source: "abc",
      references: [],
      candidates: [{ id: "candidate_1", text: "abc" }]
    };

    const view = buildDiffView(sample);

    expect(view.edit_groups).toEqual([]);
    expect(view.render_lines).toEqual([
      {
        id: "source",
        type: "source",
        label: "source",
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
});
