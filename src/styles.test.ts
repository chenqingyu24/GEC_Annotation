// @ts-expect-error Vitest runs this test in Node, while the app tsconfig intentionally omits Node types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("styles", () => {
  it("enlarges highlight line labels without enlarging sentence text", () => {
    expect(css).toMatch(/\.line-label\s*{[\s\S]*font-size:\s*15px/);
    expect(css).toMatch(/\.sentence-line\s*{[\s\S]*font-size:\s*inherit/);
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

  it("wraps alignment rows between slots without breaking slot text", () => {
    expect(blockFor(".alignment-row-content")).toContain("display: flex");
    expect(blockFor(".alignment-row-content")).toContain("flex-wrap: wrap");
    expect(blockFor(".alignment-cell")).toContain(
      "flex: 0 0 calc(var(--alignment-slot-width) + 1.75em)"
    );
    expect(blockFor(".alignment-cell")).toContain("white-space: pre");
    expect(blockFor(".alignment-cell")).not.toContain("overflow-wrap: anywhere");
    expect(blockFor(".alignment-cell .alignment-core-content")).toContain("white-space: pre");
  });
});

function blockFor(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*{([^}]*)}`))?.[1] ?? "";
}
