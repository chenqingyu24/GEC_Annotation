import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AUTO_RESIZE_MAX_ROWS,
  ManualInputPanel,
  resizeAutoTextarea
} from "./ManualInputPanel";

describe("ManualInputPanel", () => {
  it("places list add and remove controls in the field header", () => {
    const html = renderToStaticMarkup(
      <ManualInputPanel onSubmit={() => undefined} onClear={() => undefined} />
    );

    expect(html.match(/class="field-group-actions"/g) ?? []).toHaveLength(2);

    const dynamicRows = html.match(/<div class="dynamic-row">[\s\S]*?<\/div>/g) ?? [];
    expect(dynamicRows).toHaveLength(2);
    expect(dynamicRows.every((row) => !row.includes("<button"))).toBe(true);
  });

  it("uses auto-resizing textareas for source, references, and candidates", () => {
    const html = renderToStaticMarkup(
      <ManualInputPanel onSubmit={() => undefined} onClear={() => undefined} />
    );

    expect(html.match(/class="auto-resize-textarea"/g) ?? []).toHaveLength(3);
  });

  it("resizes below the five-row limit without internal scrolling", () => {
    const textarea = fakeTextarea(82);

    resizeAutoTextarea(textarea, {
      lineHeightPx: 20,
      paddingBlockPx: 12,
      minHeightPx: 40
    });

    expect(textarea.style.height).toBe("82px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("caps auto-resizing at five rows and enables internal scrolling", () => {
    const textarea = fakeTextarea(200);

    resizeAutoTextarea(textarea, {
      lineHeightPx: 20,
      paddingBlockPx: 12,
      minHeightPx: 40
    });

    expect(AUTO_RESIZE_MAX_ROWS).toBe(5);
    expect(textarea.style.height).toBe("112px");
    expect(textarea.style.overflowY).toBe("auto");
  });
});

function fakeTextarea(scrollHeight: number) {
  return {
    scrollHeight,
    style: {
      height: "",
      overflowY: ""
    }
  };
}
