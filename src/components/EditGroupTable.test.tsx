import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DiffView, Sample } from "../types";
import { buildAlignmentView } from "../utils/buildAlignmentView";
import { buildDiffView } from "../utils/buildDiffView";
import { EditGroupTable } from "./EditGroupTable";

describe("EditGroupTable", () => {
  it("does not offset table cell content by absolute source position", () => {
    const view: DiffView = {
      id: "long_sentence",
      source:
        "为进一步保障公众用药安全，国家食品药品监督管理总局决定对匹多莫德制剂说明书进行修订，降低了适应症范围，并明确指出3岁以下儿童禁用。",
      targets: [
        {
          id: "candidate_1",
          type: "candidate",
          text:
            "为进一步保障公众用药安全，国家食品药品监督管理总局决定对匹多莫德制剂说明书进行修订，缩小了适应症范围，并明确指出3岁以下儿童禁用。"
        }
      ],
      edit_groups: [
        {
          group_id: "edit_group_1",
          source_start: 43,
          source_end: 45,
          source_text: "降低",
          items: {
            candidate_1: {
              text: "缩小",
              op: "replace",
              segments: [{ text: "缩小", op: "replace" }]
            }
          }
        }
      ],
      render_lines: []
    };

    const html = renderToStaticMarkup(
      <EditGroupTable view={view} selectedGroupId={null} onSelectGroup={() => undefined} />
    );

    expect(html).toContain("降低");
    expect(html).toContain("缩小");
    expect(html).toContain('data-source-slot="43"');
    expect(html).not.toContain('class="aligned-cell-content" data-source-slot="43" style=');
  });

  it("renders alignment slots with empty cells instead of legacy insertion markers", () => {
    const sample: Sample = {
      id: "slot_table",
      source: "ab",
      references: [],
      candidates: [{ id: "candidate_1", text: "aXb" }]
    };
    const view = buildDiffView(sample);
    const alignmentView = buildAlignmentView(
      view.source,
      view.targets,
      view.edit_groups,
      null
    );

    const html = renderToStaticMarkup(
      <EditGroupTable
        view={view}
        alignmentView={alignmentView}
        selectedGroupId={null}
        onSelectGroup={() => undefined}
      />
    );

    expect(html).toContain("槽位");
    expect(html).toContain("修改句");
    expect(html).toContain("空槽位");
    expect(html).toContain("X");
    expect(html).not.toContain("说明");
    expect(html).not.toContain("新增槽");
    expect(html).not.toContain("/X\\");
    expect(html).not.toContain("/\\");
  });
});
