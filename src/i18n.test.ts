import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  formatLineLabel,
  getStoredLocale,
  setStoredLocale,
  type Locale
} from "./i18n";
import type { AlignmentLine } from "./types";

const sourceLine = line("source", "source");
const references = [line("ref_1", "reference"), line("ref_2", "reference")];

describe("i18n label formatting", () => {
  it("formats Chinese source and reference labels", () => {
    const lines = [sourceLine, ...references, line("candidate_1", "candidate")];

    expect(formatLineLabel(sourceLine, lines, "zh")).toBe("待改句");
    expect(formatLineLabel(references[1], lines, "zh")).toBe("参考答案2");
  });

  it("formats Chinese revision labels by candidate count and model id", () => {
    expect(formatLineLabel(line("candidate_1", "candidate"), [sourceLine, line("candidate_1", "candidate")], "zh")).toBe(
      "修改句"
    );
    expect(formatLineLabel(line("candidate_1", "candidate"), [sourceLine, line("candidate_1", "candidate"), line("candidate_2", "candidate")], "zh")).toBe(
      "修改1"
    );
    expect(formatLineLabel(line("gpt4", "candidate"), [sourceLine, line("gpt4", "candidate")], "zh")).toBe(
      "修改句(gpt4)"
    );
    expect(formatLineLabel(line("gpt4", "candidate"), [sourceLine, line("gpt4", "candidate"), line("candidate_2", "candidate")], "zh")).toBe(
      "修改1(gpt4)"
    );
  });

  it("formats English labels", () => {
    const lines = [sourceLine, ...references, line("gpt4", "candidate")];

    expect(formatLineLabel(sourceLine, lines, "en")).toBe("Text to Edit");
    expect(formatLineLabel(references[0], lines, "en")).toBe("Reference 1");
    expect(formatLineLabel(line("gpt4", "candidate"), lines, "en")).toBe("Revision(gpt4)");
  });
});

describe("stored locale", () => {
  it("falls back to Chinese and persists valid language choices", () => {
    const storage = new MemoryStorage();

    expect(DEFAULT_LOCALE).toBe("zh");
    expect(getStoredLocale(storage)).toBe("zh");

    setStoredLocale("en", storage);
    expect(getStoredLocale(storage)).toBe("en");

    storage.setItem("gec-ui-locale", "fr");
    expect(getStoredLocale(storage)).toBe("zh");
  });
});

function line(id: string, type: AlignmentLine["type"]): AlignmentLine {
  return {
    id,
    type,
    label: id,
    text: "",
    cells: []
  };
}

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: Locale | string): void {
    this.values.set(key, value);
  }
}
