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
  it("renders highlighted tokens and the hide button when highlighting is enabled", () => {
    const html = renderToStaticMarkup(
      <HighlightView
        lines={lines}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
        highlightEnabled={true}
        onToggleHighlight={() => undefined}
      />
    );

    expect(html).toContain("隐藏高亮");
    expect(html).toContain('aria-pressed="true"');
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
        onToggleHighlight={() => undefined}
      />
    );

    expect(html).toContain("显示高亮");
    expect(html).toContain('aria-pressed="false"');
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
        onToggleHighlight={() => undefined}
        useLegacySymbols={false}
        onToggleLegacySymbols={() => undefined}
        selectedReferenceId="ref_1"
        onReferenceChange={() => undefined}
      />
    );

    expect(html).toContain("alignment-grid");
    expect(html).toContain("参考基准");
    expect(html).toContain("旧符号");
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
        onToggleHighlight={() => undefined}
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
});

function countOccurrences(text: string, search: string): number {
  return text.split(search).length - 1;
}
