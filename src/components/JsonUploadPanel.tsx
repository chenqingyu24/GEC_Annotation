import type { ChangeEvent } from "react";
import { useI18n } from "../i18n";
import type { Sample } from "../types";
import { parseJsonSamples } from "../utils/parseInput";

const TEN_MB = 10 * 1024 * 1024;
const RECOMMENDED_SAMPLE_LIMIT = 3000;

interface JsonUploadPanelProps {
  onSamplesLoaded: (samples: Sample[]) => void;
  onWarning: (message: string) => void;
  onError: (message: string) => void;
}

export function JsonUploadPanel({
  onSamplesLoaded,
  onWarning,
  onError
}: JsonUploadPanelProps) {
  const { locale, messages: m } = useI18n();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    onError("");
    const warnings: string[] = [];

    if (file.size > TEN_MB) {
      warnings.push(m.largeFileWarning);
    }

    try {
      const content = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch (error) {
        throw new Error(m.jsonParseFailure(messageFromError(error)));
      }

      const samples = parseJsonSamples(parsed, locale);
      if (samples.length > RECOMMENDED_SAMPLE_LIMIT) {
        warnings.push(m.manySamplesWarning);
      }

      onWarning(warnings.join(" "));
      onSamplesLoaded(samples);
    } catch (error) {
      onError(messageFromError(error));
    } finally {
      input.value = "";
    }
  };

  return (
    <section className="panel upload-panel" aria-labelledby="json-upload-title">
      <div className="panel-header">
        <h2 id="json-upload-title">{m.jsonUploadTitle}</h2>
      </div>

      <label className="file-input">
        <input type="file" accept="application/json,.json" onChange={handleFileChange} />
      </label>
    </section>
  );
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
