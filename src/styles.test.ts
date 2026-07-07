// @ts-expect-error Vitest runs this test in Node, while the app tsconfig intentionally omits Node types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("styles", () => {
  it("enlarges highlight line labels without enlarging sentence text", () => {
    expect(css).toMatch(/\.line-label\s*{[\s\S]*font-size:\s*15px/);
    expect(css).toMatch(/\.sentence-line\s*{[\s\S]*font-size:\s*inherit/);
  });

  it("makes manual field labels larger than their add and delete buttons", () => {
    expect(blockFor(".field-label")).toContain("font-size: 15px");
    expect(blockFor(".field-group-actions .icon-text-button,\n.field-group-actions .compact-button")).toContain(
      "font-size: 13px"
    );
    expect(blockFor(".field-group-actions .icon-text-button,\n.field-group-actions .compact-button")).toContain(
      "min-height: 28px"
    );
  });

  it("does not force manual input textareas to a fixed 40px height", () => {
    expect(css).not.toMatch(/\.input-panel textarea\s*{[\s\S]*height:\s*40px/);
    expect(css).toMatch(/\.auto-resize-textarea\s*{/);
  });

  it("centers alignment row labels horizontally and vertically", () => {
    expect(css).toMatch(/\.alignment-row-label\s*{[\s\S]*align-items:\s*center/);
    expect(css).toMatch(/\.alignment-row-label\s*{[\s\S]*justify-content:\s*center/);
    expect(css).toMatch(/\.alignment-row-label\s*{[\s\S]*text-align:\s*center/);
  });

  it("centers ordinary highlight line labels horizontally and vertically", () => {
    const block = blockFor(".highlight-line .line-label");

    expect(block).toContain("display: flex");
    expect(block).toContain("align-items: center");
    expect(block).toContain("justify-content: center");
    expect(block).toContain("text-align: center");
  });

  it("stretches alignment rows across available width without breaking slot text", () => {
    expect(blockFor(".alignment-row-content")).toContain("display: flex");
    expect(blockFor(".alignment-row-content")).toContain("flex-wrap: nowrap");
    expect(blockFor(".alignment-cell")).toContain(
      "flex: 1 1 calc(var(--alignment-slot-width) + 2.25em)"
    );
    expect(blockFor(".alignment-cell.alignment-slot-difference")).toContain("flex-grow: 0.45");
    expect(blockFor(".alignment-cell")).toContain("justify-content: center");
    expect(blockFor(".alignment-cell")).toContain("text-align: center");
    expect(blockFor(".alignment-cell")).toContain("white-space: pre");
    expect(blockFor(".alignment-cell")).not.toContain("overflow-wrap: anywhere");
    expect(blockFor(".alignment-cell-content")).toContain("display: inline-flex");
    expect(blockFor(".alignment-prefix-content")).toContain("min-width: 0");
    expect(blockFor(".alignment-cell .alignment-core-content")).toContain("white-space: pre");
  });

  it("uses the same alignment cell font size for every row", () => {
    expect(blockFor(".alignment-cell")).toContain("font-size: 16px");
    expect(css).not.toMatch(/\.alignment-row\.line-source \.alignment-cell\s*{[\s\S]*font-size/);
  });

  it("uses one font setup for every alignment row so slot borders stay aligned", () => {
    expect(blockFor(".alignment-grid")).toContain("font-family:");
    expect(blockFor(".alignment-cell")).toContain("line-height: 1.5");
  });

  it("colors insert empty alignment slots green", () => {
    expect(blockFor(".alignment-cell.alignment-op-insert.is-empty")).toContain(
      "background: #eaf8f1"
    );
    expect(blockFor(".alignment-cell.alignment-op-insert.is-empty .alignment-empty-content")).toContain(
      "border-color: #49a383"
    );
  });

  it("colors delete empty alignment slots red", () => {
    expect(blockFor(".alignment-cell.alignment-op-delete.is-empty")).toContain(
      "background: #fff0f0"
    );
    expect(blockFor(".alignment-cell.alignment-op-delete.is-empty .alignment-empty-content")).toContain(
      "border-color: #d36b6b"
    );
  });

  it("does not draw an extra wrapper around the native JSON file chooser", () => {
    expect(css).not.toMatch(/\.file-input\s*{/);
    expect(css).not.toMatch(/\.file-input:focus-within/);
  });

  it("does not include JSON preview styles after removing the preview panel", () => {
    expect(css).not.toMatch(/\.json-preview\s*{/);
  });
});

function blockFor(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*{([^}]*)}`))?.[1] ?? "";
}
