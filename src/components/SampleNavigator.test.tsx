import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SampleNavigator } from "./SampleNavigator";

describe("SampleNavigator", () => {
  it("does not render when no samples are loaded", () => {
    const html = renderToStaticMarkup(
      <SampleNavigator samples={[]} currentIndex={0} onChange={() => undefined} />
    );

    expect(html).toBe("");
  });

  it("renders the current sample as a compact result header strip", () => {
    const html = renderToStaticMarkup(
      <SampleNavigator
        samples={[
          {
            id: "upload_replace_basic",
            source: "他喜欢苹果。",
            references: ["他喜欢香蕉。"],
            candidates: [{ id: "model_a", text: "他喜欢香蕉。" }]
          },
          {
            id: "upload_delete_basic",
            source: "他喜欢吃苹果。",
            references: ["他喜欢苹果。"],
            candidates: [{ id: "model_a", text: "他喜欢苹果。" }]
          }
        ]}
        currentIndex={0}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("sample-navigator-strip");
    expect(html).toContain("样本:");
    expect(html).toContain("sample-current-chip");
    expect(html).toContain("upload_replace_basic");
    expect(html).toContain("1 / 2");
    expect(html).toContain("上一条");
    expect(html).toContain("下一条");
    expect(html).not.toContain("<select");
  });

  it("displays generated manual sample ids as Chinese labels", () => {
    const html = renderToStaticMarkup(
      <SampleNavigator
        samples={[
          {
            id: "manual_sample",
            source: "我打喜欢篮球",
            references: ["我喜欢打篮球"],
            candidates: [{ id: "candidate_1", text: "我喜欢篮球" }]
          }
        ]}
        currentIndex={0}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("手动样本");
    expect(html).not.toContain("manual_sample");
  });
});
