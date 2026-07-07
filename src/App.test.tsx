import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { ResultContent, ResultsHeading } from "./App";
import type { DiffView } from "./types";

describe("ResultContent", () => {
  it("shows concise onboarding guidance for first-time users", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("快速开始");
    expect(html).toContain("这个工具把待改句、参考答案和修改句按同一位置对齐");
    expect(html).toContain("在“待改句”里填原始病句或待修改文本");
    expect(html).toContain("“参考基准”决定新增和删除以哪条参考答案为标准");
    expect(html).toContain(">English<");
  });

  it("places the highlight toggle next to the current sample result title", () => {
    const html = renderToStaticMarkup(
      <ResultsHeading
        hasResult
        highlightEnabled={true}
        onToggleHighlight={() => undefined}
      />
    );

    expect(html).toContain("当前样本结果");
    expect(html).toContain("隐藏高亮");
    expect(html).toContain('aria-pressed="true"');
  });

  it("shows the model analysis panel even when no sample is loaded", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("还没有样本。请在左侧手动填写待改句/修改");
    expect(html).not.toContain("No sample loaded");
    expect(html).toContain('aria-labelledby="model-analysis-title"');
    expect(html).toContain("待分析文本");
  });

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

  it("renders alignment slots by default without legacy insertion symbols", () => {
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

    expect(html).toContain("alignment-grid");
    expect(html).toContain("data-alignment-empty=\"true\"");
    expect(html).toContain("旧符号");
    expect(html).toContain("X");
    expect(html).not.toContain("/X\\");
    expect(html).not.toContain("/\\");
    expect(html).not.toContain("data-source-slot");
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
      html.indexOf('aria-labelledby="model-analysis-title"')
    );
    expect(html.indexOf('aria-labelledby="model-analysis-title"')).toBeLessThan(
      html.indexOf('aria-labelledby="edit-group-title"')
    );
  });

  it("omits the raw JSON preview from result content", () => {
    const view: DiffView = {
      id: "sample_without_json_preview",
      source: "我喜欢篮球",
      targets: [{ id: "candidate_1", type: "candidate", text: "我喜欢打篮球" }],
      edit_groups: [
        {
          group_id: "edit_group_1",
          source_start: 3,
          source_end: 3,
          source_text: "",
          items: {
            candidate_1: {
              text: "打",
              op: "insert",
              segments: [{ text: "打", op: "insert" }]
            }
          }
        }
      ],
      render_lines: [
        {
          id: "source",
          type: "source",
          label: "source",
          text: "我喜欢篮球",
          segments: [
            { text: "我喜欢", type: "plain" },
            { text: "", type: "anchor", group_id: "edit_group_1", op: "anchor" },
            { text: "篮球", type: "plain" }
          ]
        },
        {
          id: "candidate_1",
          type: "candidate",
          label: "candidate_1",
          text: "我喜欢打篮球",
          segments: [
            { text: "我喜欢", type: "plain" },
            { text: "打", type: "insert", group_id: "edit_group_1", op: "insert" },
            { text: "篮球", type: "plain" }
          ]
        }
      ]
    };

    const html = renderToStaticMarkup(
      <ResultContent view={view} selectedGroupId={null} onSelectGroup={() => undefined} />
    );

    expect(html).not.toContain("JSON 预览");
    expect(html).not.toContain("json-preview");
    expect(html).not.toContain('"edit_groups"');
  });
});
