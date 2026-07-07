import type { DiffView } from "../types";
import { useI18n } from "../i18n";

interface JsonPreviewProps {
  view: DiffView;
}

export function JsonPreview({ view }: JsonPreviewProps) {
  const { messages: m } = useI18n();

  return (
    <section className="panel result-panel" aria-labelledby="json-preview-title">
      <div className="panel-header">
        <h2 id="json-preview-title">{m.jsonPreview}</h2>
      </div>

      <pre className="json-preview">{JSON.stringify(view, null, 2)}</pre>
    </section>
  );
}
