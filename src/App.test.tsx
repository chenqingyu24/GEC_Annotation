import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultContent } from "./App";
import type { DiffView } from "./types";

describe("ResultContent", () => {
  it("shows plain rendered lines with a no-change note when a sample has no edit groups", () => {
    const view: DiffView = {
      id: "sample_plain",
      source: "我昨天去了学校。",
      targets: [{ id: "ref_1", type: "reference", text: "我昨天去了学校。" }],
      edit_groups: [],
      render_lines: [
        {
          id: "source",
          type: "source",
          label: "source",
          text: "我昨天去了学校。",
          segments: [{ text: "我昨天去了学校。", type: "plain" }]
        },
        {
          id: "ref_1",
          type: "reference",
          label: "ref_1",
          text: "我昨天去了学校。",
          segments: [{ text: "我昨天去了学校。", type: "plain" }]
        }
      ]
    };

    const html = renderToStaticMarkup(
      <ResultContent view={view} selectedGroupId={null} onSelectGroup={() => undefined} />
    );

    expect(html).toContain("该样本没有检测到修改。");
    expect(html).toContain("我昨天去了学校。");
    expect(html).not.toContain("data-source-slot");
  });

  it("renders symbolic edit tokens, legend, and alignment slots", () => {
    const view: DiffView = {
      id: "sample_symbols",
      source: "abc",
      targets: [{ id: "model_a", type: "candidate", text: "acX" }],
      edit_groups: [
        {
          group_id: "edit_group_1",
          source_start: 1,
          source_end: 2,
          source_text: "b",
          items: {
            model_a: {
              text: "b",
              op: "delete",
              segments: [{ text: "b", op: "delete" }]
            }
          }
        },
        {
          group_id: "edit_group_2",
          source_start: 3,
          source_end: 3,
          source_text: "",
          items: {
            model_a: {
              text: "X",
              op: "insert",
              segments: [{ text: "X", op: "insert" }]
            }
          }
        }
      ],
      render_lines: [
        {
          id: "source",
          type: "source",
          label: "source",
          text: "abc",
          segments: [
            { text: "a", type: "plain" },
            { text: "b", type: "delete", group_id: "edit_group_1", op: "delete" },
            { text: "c", type: "plain" },
            { text: "", type: "anchor", group_id: "edit_group_2", op: "anchor" }
          ]
        },
        {
          id: "model_a",
          type: "candidate",
          label: "model_a",
          text: "acX",
          segments: [
            { text: "a", type: "plain" },
            { text: "b", type: "delete", group_id: "edit_group_1", op: "delete" },
            { text: "c", type: "plain" },
            { text: "X", type: "insert", group_id: "edit_group_2", op: "insert" }
          ]
        }
      ]
    };

    const html = renderToStaticMarkup(
      <ResultContent view={view} selectedGroupId={null} onSelectGroup={() => undefined} />
    );

    expect(html).toContain("∅");
    expect(html).toContain("/X\\");
    expect(html).toContain("/\\");
    expect(html).toContain("[");
    expect(html).toContain("data-source-slot=\"1\"");
    expect(html).toContain("data-source-slot=\"3\"");
    expect(html).toContain("图例");
  });

  it("renders highlight view before the edit group table", () => {
    const view: DiffView = {
      id: "sample_order",
      source: "abc",
      targets: [{ id: "model_a", type: "candidate", text: "adc" }],
      edit_groups: [
        {
          group_id: "edit_group_1",
          source_start: 1,
          source_end: 2,
          source_text: "b",
          items: {
            model_a: {
              text: "d",
              op: "replace",
              segments: [{ text: "d", op: "replace" }]
            }
          }
        }
      ],
      render_lines: [
        {
          id: "source",
          type: "source",
          label: "source",
          text: "abc",
          segments: [
            { text: "a", type: "plain" },
            { text: "b", type: "replace", group_id: "edit_group_1", op: "replace" },
            { text: "c", type: "plain" }
          ]
        },
        {
          id: "model_a",
          type: "candidate",
          label: "model_a",
          text: "adc",
          segments: [
            { text: "a", type: "plain" },
            { text: "d", type: "replace", group_id: "edit_group_1", op: "replace" },
            { text: "c", type: "plain" }
          ]
        }
      ]
    };

    const html = renderToStaticMarkup(
      <ResultContent view={view} selectedGroupId={null} onSelectGroup={() => undefined} />
    );

    expect(html.indexOf('aria-labelledby="highlight-view-title"')).toBeLessThan(
      html.indexOf('aria-labelledby="edit-group-title"')
    );
  });
});
