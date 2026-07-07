import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonUploadPanel } from "./JsonUploadPanel";

describe("JsonUploadPanel", () => {
  it("keeps only the native file chooser inside the upload control", () => {
    const html = renderToStaticMarkup(
      <JsonUploadPanel
        onSamplesLoaded={() => undefined}
        onWarning={() => undefined}
        onError={() => undefined}
      />
    );

    expect(html).toContain("JSON 上传");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="application/json,.json"');
    expect(html).not.toContain(">选择 JSON 文件<");
  });
});
