import { useId, useState, type ChangeEvent } from "react";
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
  const inputId = useId();
  const [selectedFileName, setSelectedFileName] = useState("");

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      setSelectedFileName("");
      return;
    }

    setSelectedFileName(file.name);
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
      setSelectedFileName("");
    }
  };

  return (
    <section className="panel upload-panel" aria-labelledby="json-upload-title">
      <div className="panel-header">
        <h2 id="json-upload-title">{m.jsonUploadTitle}</h2>
      </div>

      <div className="json-file-picker">
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label={m.chooseJsonFile}
          onChange={handleFileChange}
        />
        <label className="secondary-button json-file-button" htmlFor={inputId}>
          {m.chooseJsonFile}
        </label>
        <span className="json-file-name">{selectedFileName || m.noFileSelected}</span>
      </div>
    </section>
  );
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
