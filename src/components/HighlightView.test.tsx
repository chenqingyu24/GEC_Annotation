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

    expect(html).toContain('class="alignment-cell alignment-op-insert is-empty is-interactive"');
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

    expect(html).toContain('class="alignment-cell alignment-op-delete is-empty is-interactive"');
    expect(html).toContain(">参考答案<");
    expect(html).not.toContain(">参考答案1<");
  });
});

function countOccurrences(text: string, search: string): number {
  return text.split(search).length - 1;
}
