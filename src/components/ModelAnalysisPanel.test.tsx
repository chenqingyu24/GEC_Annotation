import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelAnalysisPanel, resolveAnalysisText } from "./ModelAnalysisPanel";

describe("ModelAnalysisPanel", () => {
  it("renders model choice, API key, text input, and analysis controls without exposing service URL", () => {
    const html = renderToStaticMarkup(<ModelAnalysisPanel />);

    expect(html).toContain("模型分析");
    expect(html).not.toContain("服务地址");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("localhost");
    expect(html).toContain("大模型 API Key，本地模型可留空");
    expect(html).toContain("API Key");
    expect(html).toContain("选择模型");
    expect(html).toContain("rule-based-demo");
    expect(html).toContain("DeepSeek V4 Flash");
    expect(html).toContain("DeepSeek V4 Pro");
    expect(html).toContain("待分析文本");
    expect(html).toContain("刷新模型");
    expect(html).toContain("大模型分析");
    expect(html).not.toContain("纠正句");
  });

  it("renders editable pending text when no page selection exists", () => {
    const html = renderToStaticMarkup(<ModelAnalysisPanel initialInputText="我昨天去学校。" />);

    expect(html).toContain("待分析文本");
    expect(html).toContain("我昨天去学校。");
  });

  it("prefers current selected text over manual pending text", () => {
    expect(resolveAnalysisText("  选中文本  ", "手动文本")).toBe("选中文本");
    expect(resolveAnalysisText("", "  手动文本  ")).toBe("手动文本");
  });

  it("renders a successful grammar error result", () => {
    const html = renderToStaticMarkup(
      <ModelAnalysisPanel
        initialSelectedText="我昨天去学校。"
        initialResult={{
          has_error: true,
          corrected_text: "我昨天去了学校。",
          explanation: "缺少动态助词“了”。"
        }}
      />
    );

    expect(html).toContain("选中文本");
    expect(html).toContain("我昨天去学校。");
    expect(html).toContain("存在语法错误");
    expect(html).toContain("纠正句");
    expect(html).toContain("我昨天去了学校。");
    expect(html).toContain("缺少动态助词“了”。");
  });

  it("renders a successful no-error result", () => {
    const html = renderToStaticMarkup(
      <ModelAnalysisPanel
        initialSelectedText="我昨天去了学校。"
        initialResult={{
          has_error: false,
          explanation: "句子通顺。"
        }}
      />
    );

    expect(html).toContain("无语法错误");
    expect(html).not.toContain("纠正句");
    expect(html).toContain("句子通顺。");
  });
});
