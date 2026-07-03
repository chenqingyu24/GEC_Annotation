import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManualInputPanel } from "./ManualInputPanel";

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
});
