import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HighlightView } from "./HighlightView";
import type { RenderLine } from "../types";

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
});
