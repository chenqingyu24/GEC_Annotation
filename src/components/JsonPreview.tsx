import type { DiffView } from "../types";

interface JsonPreviewProps {
  view: DiffView;
}

export function JsonPreview({ view }: JsonPreviewProps) {
  return (
    <section className="panel result-panel" aria-labelledby="json-preview-title">
      <div className="panel-header">
        <h2 id="json-preview-title">JSON 预览</h2>
      </div>

      <pre className="json-preview">{JSON.stringify(view, null, 2)}</pre>
    </section>
  );
}
