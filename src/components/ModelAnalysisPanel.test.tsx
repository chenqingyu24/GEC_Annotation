import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelAnalysisPanel, ModelConfigFields, resolveAnalysisText } from "./ModelAnalysisPanel";

describe("ModelAnalysisPanel", () => {
  it("renders provider-first controls and a native model selector", () => {
    const html = renderToStaticMarkup(<ModelAnalysisPanel />);

    expect(html).toContain("模型分析");
    expect(html).toContain(">服务商<");
    expect(html).not.toContain("127.0.0.1");
    expect(html).not.toContain("localhost");
    expect(html).toContain(">API Key<");
    expect(html).not.toContain("大模型 API Key，本地模型可留空");
    expect(html).toContain("模型");
    expect(html).toContain("<select");
    expect(html).toContain("deepseek-v4-flash");
    expect(html).toContain("deepseek-v4-pro");
    expect(html).not.toContain("<datalist");
    expect(html.indexOf(">服务商<")).toBeLessThan(html.indexOf(">API Key<"));
    expect(html.indexOf(">API Key<")).toBeLessThan(html.indexOf("刷新模型"));
    expect(html.indexOf("刷新模型")).toBeLessThan(html.indexOf(">模型<"));
    expect(html).toContain("待分析文本");
    expect(html).toContain("刷新模型");
    expect(html).toContain('class="model-refresh-control"');
    expect(html).toContain("大模型分析");
    expect(html).not.toContain("纠正句");
  });

  it("enables the native selector and preserves an explicitly selected DeepSeek Pro model", () => {
    const html = renderToStaticMarkup(
      <ModelConfigFields
        config={{
          providerId: "deepseek",
          baseUrl: "https://api.deepseek.com",
          customBaseUrl: "",
          apiKey: "test-key",
          selectedModel: "deepseek-v4-pro",
          models: [
            {
              id: "deepseek-v4-flash",
              label: "DeepSeek V4 Flash",
              provider: "deepseek",
              requires_api_key: true
            },
            {
              id: "deepseek-v4-pro",
              label: "DeepSeek V4 Pro",
              provider: "deepseek",
              requires_api_key: true
            }
          ],
          modelListReady: true
        }}
        onConfigChange={() => undefined}
        onRefreshModels={() => undefined}
        loadingModels={false}
      />
    );

    expect(html).not.toMatch(/<select[^>]*disabled/);
    expect(html).toContain('value="deepseek-v4-pro" selected=""');
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
