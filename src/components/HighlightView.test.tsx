import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HighlightView } from "./HighlightView";
import type { RenderLine, Sample } from "../types";
import { buildAlignmentView } from "../utils/buildAlignmentView";
import { buildDiffView } from "../utils/buildDiffView";

const lines: RenderLine[] = [
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
];

describe("HighlightView", () => {
  it("renders highlighted tokens without owning the page-level highlight toggle", () => {
    const html = renderToStaticMarkup(
      <HighlightView
        lines={lines}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
      />
    );

    expect(html).not.toContain("隐藏高亮");
    expect(html).not.toContain("显示高亮");
    expect(html).toContain("replace-mark");
    expect(html).toContain('data-source-slot="1"');
    expect(html).toContain("图例");
    expect(html).toContain("已移除");
    expect(html).not.toContain("已缺失");
  });

  it("renders plain text and the show button when highlighting is disabled", () => {
    const html = renderToStaticMarkup(
      <HighlightView
        lines={lines}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={false}
      />
    );

    expect(html).not.toContain("显示高亮");
    expect(html).not.toContain("隐藏高亮");
    expect(html).toContain(">abc<");
    expect(html).toContain(">adc<");
    expect(html).not.toContain("图例");
    expect(html).not.toContain("replace-mark");
    expect(html).not.toContain("delete-mark");
    expect(html).not.toContain("insert-mark");
    expect(html).not.toContain("data-source-slot");
  });

  it("renders alignment slots without legacy insertion markers by default", () => {
    const sample: Sample = {
      id: "medical_alignment",
      source: "医药部门降低了某药适应症范围，并禁止儿童使用",
      references: ["医药部门缩小了某药适应症范围，并禁止儿童使用。"],
      candidates: [
        {
          id: "candidate_1",
          text: "医药部门明确了某药儿童禁用，并将适应症范围降到最低。"
        }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
      />
    );

    expect(html).toContain("alignment-grid");
    expect(html).toContain("highlight-panel-header");
    expect(html).toContain("highlight-toolbar-left");
    expect(html).toContain('id="highlight-view-title" class="sr-only"');
    expect(html).not.toContain('<h2 id="highlight-view-title">多行高亮</h2>');
    expect(html).toContain("参考基准");
    expect(html).toContain("旧符号");
    expect(html).not.toContain("空槽位");
    expect(html).toContain("儿童禁用，并将");
    expect(html).toContain("降到最低");
    expect(html).toContain("data-alignment-empty=\"true\"");
    expect(html).not.toContain("/儿童禁用，并将\\");
    expect(html).not.toContain("/\\");
  });

  it("renders alignment rows as merged wrapping slot strips", () => {
    const sample: Sample = {
      id: "medical_alignment",
      source: "医药部门降低了某药适应症范围，并禁止儿童使用",
      references: ["医药部门缩小了某药适应症范围，并禁止儿童使用。"],
      candidates: [
        {
          id: "candidate_1",
          text: "医药部门明确了某药儿童禁用，并将适应症范围降到最低。"
        }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
      />
    );

    expect(countOccurrences(html, 'class="alignment-row line-')).toBe(3);
    expect(countOccurrences(html, 'class="alignment-row-content"')).toBe(3);
    expect(countOccurrences(html, 'class="line-label alignment-row-label')).toBe(3);
    expect(html).toContain('style="--alignment-slot-width:7em"');
    expect(html).not.toContain("grid-template-columns:");
  });

  it("inserts full-width analysis rows after alignment rows when enabled", () => {
    const sample: Sample = {
      id: "analysis_rows",
      source: "他喜欢苹果。",
      references: ["他喜欢香蕉。"],
      candidates: [
        { id: "model_a", text: "他喜欢香蕉。" },
        { id: "model_b", text: "他喜欢苹果。" }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
        showAnalysisContent={true}
      />
    );

    expect(countOccurrences(html, 'class="alignment-row line-')).toBe(4);
    expect(countOccurrences(html, 'class="alignment-row-content"')).toBe(4);
    expect(countOccurrences(html, "alignment-analysis-row")).toBe(4);
    expect(html).toContain('data-analysis-for="source"');
    expect(html).toContain('data-analysis-for="ref_1"');
    expect(html).toContain('data-analysis-for="model_a"');
    expect(html).toContain('data-analysis-for="model_b"');
    expect(html.indexOf('class="alignment-row line-source"')).toBeLessThan(
      html.indexOf('data-analysis-for="source"')
    );
    expect(html.indexOf('data-analysis-for="source"')).toBeLessThan(
      html.indexOf('class="alignment-row line-reference"')
    );
    expect(html).toContain("分析");
    expect(html).toContain("待分析");
  });

  it("keeps analysis rows out of the alignment table when disabled", () => {
    const sample: Sample = {
      id: "analysis_rows_disabled",
      source: "他喜欢苹果。",
      references: ["他喜欢香蕉。"],
      candidates: [{ id: "model_a", text: "他喜欢香蕉。" }]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
        showAnalysisContent={false}
      />
    );

    expect(countOccurrences(html, 'class="alignment-row line-')).toBe(3);
    expect(countOccurrences(html, 'class="alignment-row-content"')).toBe(3);
    expect(html).not.toContain("alignment-analysis-row");
    expect(html).not.toContain('data-analysis-for="source"');
  });

  it("renders model grammar results inside analysis rows when provided", () => {
    const sample: Sample = {
      id: "model_analysis_results",
      source: "他喜欢苹果。",
      references: ["他喜欢香蕉。"],
      candidates: [{ id: "model_a", text: "他喜欢香蕉。" }]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        selectedReferenceId="ref_1"
        showAnalysisContent={true}
        analysisResultsByLineId={{
          source: {
            has_error: true,
            corrected_text: "他喜欢香蕉。",
            explanation: "苹果应改为香蕉。"
          },
          model_a: {
            has_error: false,
            explanation: "句子通顺。"
          }
        }}
      />
    );

    expect(html).toContain('data-analysis-for="source"');
    expect(html).toContain("不正确");
    expect(html).toContain("纠正句");
    expect(html).toContain("他喜欢香蕉。");
    expect(html).toContain("苹果应改为香蕉。");
    expect(html).toContain('data-analysis-for="model_a"');
    expect(html).toContain("正确");
    expect(html).toContain("句子通顺。");
  });

  it("renders loading and per-line analysis errors in analysis rows", () => {
    const sample: Sample = {
      id: "model_analysis_states",
      source: "他喜欢苹果。",
      references: ["他喜欢香蕉。"],
      candidates: [{ id: "model_a", text: "他喜欢香蕉。" }]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        selectedReferenceId="ref_1"
        showAnalysisContent={true}
        analysisLoadingByLineId={{ source: true }}
        analysisErrorsByLineId={{ model_a: "模型服务暂不可用" }}
      />
    );

    expect(html).toContain("分析中");
    expect(html).toContain("模型服务暂不可用");
  });

  it("marks plain and difference slots so extra row width can be distributed", () => {
    const sample: Sample = {
      id: "wide_alignment",
      source: "我昨天去学校。",
      references: ["我昨天去了学校。"],
      candidates: [
        {
          id: "model_a",
          text: "我昨天去了学校。"
        }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
      />
    );

    expect(html).toContain("alignment-slot-plain");
    expect(html).toContain("alignment-slot-difference");
  });

  it("wraps model ids onto their own label line", () => {
    const sample: Sample = {
      id: "wrapped_model_ids",
      source: "他喜欢苹果。",
      references: ["他喜欢香蕉。"],
      candidates: [
        { id: "model_a", text: "他喜欢香蕉。" },
        { id: "model_b", text: "他喜欢苹果。" }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
      />
    );

    expect(html).toContain('<span class="line-label-main">修改1</span>');
    expect(html).toContain('<span class="line-label-id">(model_a)</span>');
    expect(html).toContain('<span class="line-label-main">修改2</span>');
    expect(html).toContain('<span class="line-label-id">(model_b)</span>');
    expect(html).not.toContain(">修改1(model_a)<");
  });

  it("renders source insertion targets as green empty alignment slots", () => {
    const sample: Sample = {
      id: "reference_insert",
      source: "某药适应症范围",
      references: ["某药适应症范围", "某药的适应症范围"],
      candidates: [
        {
          id: "candidate_1",
          text: "某药适应症范围"
        }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_2"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_2"
        onReferenceChange={() => undefined}
      />
    );

    expect(html).toContain("alignment-op-insert");
    expect(html).toContain("alignment-slot-difference");
    expect(html).toContain("is-empty is-interactive");
    expect(html).toContain(">参考答案2<");
    expect(html).not.toContain(">ref_2<");
  });

  it("renders candidate deletions as red empty alignment slots", () => {
    const sample: Sample = {
      id: "candidate_delete",
      source: "我打喜欢篮球",
      references: ["我打喜欢篮球"],
      candidates: [
        {
          id: "candidate_1",
          text: "我喜欢篮球"
        }
      ]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      "ref_1"
    );

    const html = renderToStaticMarkup(
      <HighlightView
        lines={view.render_lines}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
      />
    );

    expect(html).toContain("alignment-op-delete");
    expect(html).toContain("alignment-slot-difference");
    expect(html).toContain("is-empty is-interactive");
    expect(html).toContain(">参考答案<");
    expect(html).not.toContain(">参考答案1<");
  });
});

function countOccurrences(text: string, search: string): number {
  return text.split(search).length - 1;
}
