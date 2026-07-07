import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SampleNavigator } from "./SampleNavigator";

describe("SampleNavigator", () => {
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
