import type { Candidate, Sample } from "../types";
import { DEFAULT_LOCALE, type Locale } from "../i18n";

type JsonObject = Record<string, unknown>;

interface ManualInput {
  source: string;
  references: string[];
  candidates: string[];
}

export function parseJsonSamples(input: unknown, locale: Locale = DEFAULT_LOCALE): Sample[] {
  const message = parseMessage(locale);

  if (Array.isArray(input)) {
    if (input.length === 0) {
      throw new Error(message.emptyJson);
    }

    return input.map((rawSample, index) => normalizeJsonSample(rawSample, index, locale));
  }

  if (!isJsonObject(input)) {
    throw new Error(message.jsonTopLevel);
  }

  return [normalizeJsonSample(input, 0, locale)];
}

export function buildManualSample(
  input: ManualInput,
  locale: Locale = DEFAULT_LOCALE
): Sample {
  const message = parseMessage(locale);

  if (input.source.trim() === "") {
    throw new Error(message.sourceRequired);
  }

  const references = input.references.filter((text) => text.trim() !== "");
  const candidates = input.candidates
    .filter((text) => text.trim() !== "")
    .map((text, index) => ({
      id: `candidate_${index + 1}`,
      text
    }));

  if (candidates.length === 0) {
    throw new Error(message.candidateRequired);
  }

  return {
    id: "manual_sample",
    source: input.source,
    references,
    candidates
  };
}

function normalizeJsonSample(rawSample: unknown, index: number, locale: Locale): Sample {
  const message = parseMessage(locale);

  try {
    return normalizeJsonSampleUnsafe(rawSample, index, locale);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(message.sampleFailure(sampleLabel(rawSample, index, locale), errorMessage));
  }
}

function normalizeJsonSampleUnsafe(
  rawSample: unknown,
  index: number,
  locale: Locale
): Sample {
  const message = parseMessage(locale);

  if (!isJsonObject(rawSample)) {
    throw new Error(message.sampleObject);
  }

  const id = normalizeOptionalId(rawSample.id, `sample_${index + 1}`, "id", locale);
  const source = normalizeSource(rawSample.source, locale);
  const references = normalizeReferences(rawSample.references, locale);
  const candidates = normalizeCandidates(rawSample.candidates, references, locale);

  return {
    id,
    source,
    references,
    candidates
  };
}

function normalizeSource(source: unknown, locale: Locale): string {
  const message = parseMessage(locale);

  if (typeof source !== "string") {
    throw new Error(message.sourceString);
  }

  if (source === "") {
    throw new Error(message.sourceEmpty);
  }

  return source;
}

function normalizeReferences(references: unknown, locale: Locale): string[] {
  const message = parseMessage(locale);

  if (references === undefined) {
    return [];
  }

  if (!Array.isArray(references)) {
    throw new Error(message.referencesArray);
  }

  return references.filter((reference, index) => {
    if (typeof reference !== "string") {
      throw new Error(message.referenceString(index));
    }

    return reference !== "";
  });
}

function normalizeCandidates(
  candidates: unknown,
  references: string[],
  locale: Locale
): Candidate[] {
  const message = parseMessage(locale);

  if (!Array.isArray(candidates)) {
    throw new Error(message.candidatesArray);
  }

  if (candidates.length === 0) {
    throw new Error(message.candidateRequired);
  }

  const usedTargetIds = new Set(
    references.map((_, index) => `ref_${index + 1}`)
  );

  return candidates.map((candidate, index) =>
    normalizeCandidate(candidate, index, usedTargetIds, locale)
  );
}

function normalizeCandidate(
  rawCandidate: unknown,
  index: number,
  usedTargetIds: Set<string>,
  locale: Locale
): Candidate {
  const message = parseMessage(locale);

  if (!isJsonObject(rawCandidate)) {
    throw new Error(message.candidateObject(index));
  }

  const text = rawCandidate.text;
  if (typeof text !== "string") {
    throw new Error(message.candidateText(index));
  }

  const baseId = normalizeOptionalId(
    rawCandidate.id,
    `candidate_${index + 1}`,
    `candidates[${index}].id`,
    locale
  );

  return {
    id: makeUniqueId(baseId, usedTargetIds),
    text
  };
}

function normalizeOptionalId(
  id: unknown,
  fallback: string,
  fieldName: string,
  locale: Locale
): string {
  const message = parseMessage(locale);

  if (id === undefined || id === "") {
    return fallback;
  }

  if (typeof id !== "string") {
    throw new Error(message.idString(fieldName));
  }

  return id;
}

function makeUniqueId(baseId: string, usedIds: Set<string>): string {
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}_${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidateId);
  return candidateId;
}

function sampleLabel(rawSample: unknown, index: number, locale: Locale): string {
  const indexLabel = parseMessage(locale).sampleLabel(index);

  if (
    isJsonObject(rawSample) &&
    typeof rawSample.id === "string" &&
    rawSample.id !== ""
  ) {
    return `${indexLabel} (${rawSample.id})`;
  }

  return indexLabel;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMessage(locale: Locale) {
  if (locale === "en") {
    return {
      emptyJson: "JSON must contain at least one sample.",
      jsonTopLevel: "JSON top level must be a sample object or sample array.",
      sourceRequired: "Text to edit cannot be empty.",
      candidateRequired: "At least one revision is required.",
      sampleObject: "Sample must be an object.",
      sourceString: "source must be a string.",
      sourceEmpty: "source cannot be empty.",
      referencesArray: "references must be an array of strings.",
      referenceString: (index: number) => `references[${index}] must be a string.`,
      candidatesArray: "candidates must be an array.",
      candidateObject: (index: number) => `candidates[${index}] must be an object.`,
      candidateText: (index: number) => `candidates[${index}].text must be a string.`,
      idString: (fieldName: string) => `${fieldName} must be a string.`,
      sampleLabel: (index: number) => `Sample ${index + 1}`,
      sampleFailure: (label: string, message: string) => `${label} validation failed: ${message}`
    };
  }

  return {
    emptyJson: "JSON 至少需要包含一个样本。",
    jsonTopLevel: "JSON 顶层必须是样本对象或样本数组。",
    sourceRequired: "待改句不能为空。",
    candidateRequired: "至少需要一条修改。",
    sampleObject: "样本必须是对象。",
    sourceString: "source 必须是字符串。",
    sourceEmpty: "source 不能为空。",
    referencesArray: "references 必须是字符串数组。",
    referenceString: (index: number) => `references[${index}] 必须是字符串。`,
    candidatesArray: "candidates 必须是数组。",
    candidateObject: (index: number) => `candidates[${index}] 必须是对象。`,
    candidateText: (index: number) => `candidates[${index}].text 必须是字符串。`,
    idString: (fieldName: string) => `${fieldName} 必须是字符串。`,
    sampleLabel: (index: number) => `第 ${index + 1} 个样本`,
    sampleFailure: (label: string, message: string) => `${label}校验失败：${message}`
  };
}
