import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider, type Locale } from "../i18n";
import { JsonUploadPanel } from "./JsonUploadPanel";

describe("JsonUploadPanel", () => {
  it("renders translated English file picker text instead of browser-native labels", () => {
    const html = renderPanel("en");

    expect(html).toContain(">Choose JSON File<");
    expect(html).toContain(">No file selected<");
    expect(html).not.toContain(">选择文件<");
    expect(html).not.toContain(">未选择任何文件<");
  });

  it("keeps a single custom file picker without the previous wrapper class", () => {
    const html = renderPanel("zh");

    expect(html).toContain("JSON 上传");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="application/json,.json"');
    expect(html).toContain(">选择 JSON 文件<");
    expect(html).toContain(">未选择文件<");
    expect(html).not.toContain('class="file-input"');
  });
});

function renderPanel(locale: Locale): string {
  return renderToStaticMarkup(
    <I18nProvider locale={locale}>
      <JsonUploadPanel
        onSamplesLoaded={() => undefined}
        onWarning={() => undefined}
        onError={() => undefined}
      />
    </I18nProvider>
  );
}
