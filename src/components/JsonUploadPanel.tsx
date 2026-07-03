import type { ChangeEvent } from "react";
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
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    onError("");
    const warnings: string[] = [];

    if (file.size > TEN_MB) {
      warnings.push("文件超过 10MB，解析和当前样本对齐可能较慢。");
    }

    try {
      const content = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch (error) {
        throw new Error(`JSON 解析失败：${messageFromError(error)}`);
      }

      const samples = parseJsonSamples(parsed);
      if (samples.length > RECOMMENDED_SAMPLE_LIMIT) {
        warnings.push("样本数量超过 3000 条，建议拆分文件以保持页面响应速度。");
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
        <h2 id="json-upload-title">JSON 上传</h2>
      </div>

      <label className="file-input">
        <span>选择 JSON 文件</span>
        <input type="file" accept="application/json,.json" onChange={handleFileChange} />
      </label>
    </section>
  );
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
