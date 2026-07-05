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
});
