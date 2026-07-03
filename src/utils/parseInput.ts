import type { Candidate, Sample } from "../types";

type JsonObject = Record<string, unknown>;

interface ManualInput {
  source: string;
  references: string[];
  candidates: string[];
}

export function parseJsonSamples(input: unknown): Sample[] {
  if (Array.isArray(input)) {
    if (input.length === 0) {
      throw new Error("JSON 至少需要包含一个样本。");
    }

    return input.map((rawSample, index) => normalizeJsonSample(rawSample, index));
  }

  if (!isJsonObject(input)) {
    throw new Error("JSON 顶层必须是样本对象或样本数组。");
  }

  return [normalizeJsonSample(input, 0)];
}

export function buildManualSample(input: ManualInput): Sample {
  if (input.source.trim() === "") {
    throw new Error("原句不能为空。");
  }

  const references = input.references.filter((text) => text.trim() !== "");
  const candidates = input.candidates
    .filter((text) => text.trim() !== "")
    .map((text, index) => ({
      id: `candidate_${index + 1}`,
      text
    }));

  if (candidates.length === 0) {
    throw new Error("至少需要一条候选句。");
  }

  return {
    id: "manual_sample",
    source: input.source,
    references,
    candidates
  };
}

function normalizeJsonSample(rawSample: unknown, index: number): Sample {
  try {
    return normalizeJsonSampleUnsafe(rawSample, index);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${sampleLabel(rawSample, index)}校验失败：${message}`);
  }
}

function normalizeJsonSampleUnsafe(rawSample: unknown, index: number): Sample {
  if (!isJsonObject(rawSample)) {
    throw new Error("样本必须是对象。");
  }

  const id = normalizeOptionalId(rawSample.id, `sample_${index + 1}`, "id");
  const source = normalizeSource(rawSample.source);
  const references = normalizeReferences(rawSample.references);
  const candidates = normalizeCandidates(rawSample.candidates, references);

  return {
    id,
    source,
    references,
    candidates
  };
}

function normalizeSource(source: unknown): string {
  if (typeof source !== "string") {
    throw new Error("source 必须是字符串。");
  }

  if (source === "") {
    throw new Error("source 不能为空。");
  }

  return source;
}

function normalizeReferences(references: unknown): string[] {
  if (references === undefined) {
    return [];
  }

  if (!Array.isArray(references)) {
    throw new Error("references 必须是字符串数组。");
  }

  return references.filter((reference, index) => {
    if (typeof reference !== "string") {
      throw new Error(`references[${index}] 必须是字符串。`);
    }

    return reference !== "";
  });
}

function normalizeCandidates(candidates: unknown, references: string[]): Candidate[] {
  if (!Array.isArray(candidates)) {
    throw new Error("candidates 必须是数组。");
  }

  if (candidates.length === 0) {
    throw new Error("至少需要一条候选句。");
  }

  const usedTargetIds = new Set(
    references.map((_, index) => `ref_${index + 1}`)
  );

  return candidates.map((candidate, index) =>
    normalizeCandidate(candidate, index, usedTargetIds)
  );
}

function normalizeCandidate(
  rawCandidate: unknown,
  index: number,
  usedTargetIds: Set<string>
): Candidate {
  if (!isJsonObject(rawCandidate)) {
    throw new Error(`candidates[${index}] 必须是对象。`);
  }

  const text = rawCandidate.text;
  if (typeof text !== "string") {
    throw new Error(`candidates[${index}].text 必须是字符串。`);
  }

  const baseId = normalizeOptionalId(
    rawCandidate.id,
    `candidate_${index + 1}`,
    `candidates[${index}].id`
  );

  return {
    id: makeUniqueId(baseId, usedTargetIds),
    text
  };
}

function normalizeOptionalId(
  id: unknown,
  fallback: string,
  fieldName: string
): string {
  if (id === undefined || id === "") {
    return fallback;
  }

  if (typeof id !== "string") {
    throw new Error(`${fieldName} 必须是字符串。`);
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

function sampleLabel(rawSample: unknown, index: number): string {
  const indexLabel = `第 ${index + 1} 个样本`;

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
