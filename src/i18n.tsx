import { createContext, useContext, type ReactNode } from "react";
import type { AlignmentLine, RenderLine, Target } from "./types";

export type Locale = "zh" | "en";

export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_STORAGE_KEY = "gec-ui-locale";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type LabelLine = Pick<AlignmentLine | RenderLine | Target, "id" | "type">;

export const messages = {
  zh: {
    appTitle: "中文语法纠错多候选对齐工具",
    appSubtitle: "对齐待改句、参考答案和多个修改，快速检查同一位置的改动。",
    switchLanguage: "English",
    quickStartAria: "快速开始",
    quickStartTitle: "快速开始",
    quickStartIntro: "这个工具把待改句、参考答案和修改句按同一位置对齐，方便比较哪里删了、哪里替换了、哪里新增了。",
    quickStartItems: [
      "在“待改句”里填原始病句或待修改文本；在“修改”里填人类或模型改后的句子，参考答案可不填。",
      "点击“生成对齐结果”后，右侧会把不同句子切到同一组槽位，同一列表示原句同一位置的改动。",
      "“参考基准”决定新增和删除以哪条参考答案为标准；颜色表示替换、删除、新增，点击高亮块或编辑组可定位同一处修改。"
    ],
    inputOptionsAria: "输入选项",
    resultsTitle: "当前样本结果",
    emptySample: "还没有样本。请在左侧手动填写待改句/修改，或上传 JSON 文件生成对齐结果。",
    noEdits: "该样本没有检测到修改。",
    manualInputTitle: "手动输入",
    textToEdit: "待改句",
    textToEditPlaceholder: "输入待改句",
    textToEditHelp: "可能正确，也可能有误",
    references: "参考答案",
    revisions: "修改",
    referencesHelp: "可选，用作对照基准",
    revisionsHelp: "修改句是人类纠正的结果或者模型纠正的结果",
    add: "添加",
    delete: "删除",
    generateResult: "生成对齐结果",
    clear: "清空",
    noReferences: "未添加参考答案。",
    referenceLabel: (index: number, total: number) =>
      total === 1 ? "参考答案" : `参考答案${index + 1}`,
    revisionLabel: (index: number, total: number) =>
      total === 1 ? "修改句" : `修改${index + 1}`,
    referencePlaceholder: (index: number, total: number) =>
      total === 1 ? "输入参考答案" : `输入参考答案${index + 1}`,
    revisionPlaceholder: (index: number, total: number) =>
      total === 1 ? "输入修改句" : `输入修改${index + 1}`,
    jsonUploadTitle: "JSON 上传",
    chooseJsonFile: "选择 JSON 文件",
    noFileSelected: "未选择文件",
    largeFileWarning: "文件超过 10MB，解析和当前样本对齐可能较慢。",
    manySamplesWarning: "样本数量超过 3000 条，建议拆分文件以保持页面响应速度。",
    jsonParseFailure: (message: string) => `JSON 解析失败：${message}`,
    highlightTitle: "多行高亮",
    referenceBase: "参考基准",
    legacySymbols: "旧符号",
    legend: "图例",
    replace: "替换",
    shouldRemove: "应移除",
    removed: "已移除",
    inserted: "已新增",
    sampleText: "文本",
    insertionPoint: "插入位",
    insert: "新增",
    emptySlot: "空槽位",
    hideHighlight: "隐藏高亮",
    showHighlight: "显示高亮",
    hideAnalysisContent: "隐藏分析内容",
    showAnalysisContent: "显示分析内容",
    analysisLabel: "分析",
    analysisPending: "待分析",
    analysisLoading: "分析中",
    analysisFailed: "分析失败",
    analysisCorrect: "正确",
    analysisIncorrect: "不正确",
    analysisErrorType: "错误类型",
    analysisCorrection: "纠正句",
    analysisReason: "原因",
    analysisReferenceMismatch: "与参考答案不一致",
    analysisReferenceExplanation: "该句与参考答案存在差异，建议参考纠正句。",
    analysisMatchesReference: "该句与参考答案一致，未发现需要修改的差异。",
    analysisReferenceBaseline: "该句作为参考答案，未进行纠错判断。",
    analysisNoReference: "暂无参考答案，未进行对照判断。",
    editGroupTable: "编辑组表格",
    editGroup: "编辑组",
    slot: "槽位",
    sourcePosition: "原位",
    sourceFragment: "待改句片段",
    emptySlotLabel: "（空槽位）",
    sampleNavigatorAria: "样本切换",
    sampleNavigatorLabel: "样本:",
    previousSample: "上一条",
    nextSample: "下一条",
    selectSample: "选择样本",
    modelAnalysis: "模型分析",
    apiKeyLabel: "API Key",
    optional: "可留空",
    selectModel: "选择模型",
    refreshModelFirst: "请先刷新模型",
    textToAnalyze: "待分析文本",
    textToAnalyzePlaceholder: "输入待分析文本",
    refreshingModels: "刷新中...",
    refreshModels: "刷新模型",
    analyzing: "分析中...",
    analyzeWithModel: "大模型分析",
    batchAnalyzeWithModel: "批量分析",
    modelsLoaded: (count: number) => `已加载 ${count} 个模型。`,
    enterOrSelectText: "请输入或选中文本。",
    fillServiceUrl: "请先填写服务地址。",
    selectModelFirst: "请先选择模型。",
    selectedText: "选中文本",
    grammarError: "存在语法错误",
    noGrammarError: "无语法错误",
    correctedText: "纠正句",
    explanation: "解释",
    localRuleDemo: "本地规则演示",
    missingText: (text: string) => `缺失：${text}`
  },
  en: {
    appTitle: "Chinese GEC Multi-Candidate Alignment Tool",
    appSubtitle: "Align text to edit, references, and revisions to inspect edits at the same position.",
    switchLanguage: "中文",
    quickStartAria: "Quick start",
    quickStartTitle: "Quick Start",
    quickStartIntro: "This tool aligns the text to edit, references, and revisions by position so you can compare deletions, replacements, and insertions.",
    quickStartItems: [
      "Enter the original sentence in “Text to Edit”; enter human or model corrections in “Revisions”. References are optional.",
      "Click “Generate Alignment” to split the sentences into shared slots. Each column represents an edit around the same original position.",
      "“Reference Base” chooses which reference defines insertions and deletions. Colors mark replacements, deletions, and insertions; click a highlight or edit group to locate the same edit."
    ],
    inputOptionsAria: "Input options",
    resultsTitle: "Current Sample Result",
    emptySample: "No sample yet. Enter text to edit/revisions on the left, or upload a JSON file.",
    noEdits: "No edits were detected in this sample.",
    manualInputTitle: "Manual Input",
    textToEdit: "Text to Edit",
    textToEditPlaceholder: "Enter text to edit",
    textToEditHelp: "may be correct or contain errors",
    references: "References",
    revisions: "Revisions",
    referencesHelp: "optional comparison baseline",
    revisionsHelp: "revisions are corrections written by humans or models",
    add: "Add",
    delete: "Delete",
    generateResult: "Generate Alignment",
    clear: "Clear",
    noReferences: "No references added.",
    referenceLabel: (index: number, total: number) =>
      total === 1 ? "Reference" : `Reference ${index + 1}`,
    revisionLabel: (index: number, total: number) =>
      total === 1 ? "Revision" : `Revision ${index + 1}`,
    referencePlaceholder: (index: number, total: number) =>
      total === 1 ? "Enter Reference" : `Enter Reference ${index + 1}`,
    revisionPlaceholder: (index: number, total: number) =>
      total === 1 ? "Enter Revision" : `Enter Revision ${index + 1}`,
    jsonUploadTitle: "JSON Upload",
    chooseJsonFile: "Choose JSON File",
    noFileSelected: "No file selected",
    largeFileWarning: "File exceeds 10 MB. Parsing and alignment may be slow.",
    manySamplesWarning: "More than 3000 samples loaded. Split the file to keep the page responsive.",
    jsonParseFailure: (message: string) => `JSON parse failed: ${message}`,
    highlightTitle: "Multi-Line Highlight",
    referenceBase: "Reference Base",
    legacySymbols: "Legacy Symbols",
    legend: "Legend",
    replace: "Replace",
    shouldRemove: "Should Remove",
    removed: "Removed",
    inserted: "Inserted",
    sampleText: "Text",
    insertionPoint: "Insertion Point",
    insert: "Insert",
    emptySlot: "Empty Slot",
    hideHighlight: "Hide Highlight",
    showHighlight: "Show Highlight",
    hideAnalysisContent: "Hide Analysis",
    showAnalysisContent: "Show Analysis",
    analysisLabel: "Analysis",
    analysisPending: "Pending",
    analysisLoading: "Analyzing",
    analysisFailed: "Analysis Failed",
    analysisCorrect: "Correct",
    analysisIncorrect: "Incorrect",
    analysisErrorType: "Error Type",
    analysisCorrection: "Correction",
    analysisReason: "Reason",
    analysisReferenceMismatch: "Mismatch with reference",
    analysisReferenceExplanation: "This sentence differs from the reference. Use the correction as the suggested version.",
    analysisMatchesReference: "This sentence matches the reference. No required edit was found.",
    analysisReferenceBaseline: "This sentence is the reference baseline, so no correction judgment was applied.",
    analysisNoReference: "No reference is available, so no comparison judgment was applied.",
    editGroupTable: "Edit Group Table",
    editGroup: "Edit Group",
    slot: "Slot",
    sourcePosition: "Source Position",
    sourceFragment: "Text to Edit Fragment",
    emptySlotLabel: "(empty slot)",
    sampleNavigatorAria: "Sample navigation",
    sampleNavigatorLabel: "Sample:",
    previousSample: "Previous",
    nextSample: "Next",
    selectSample: "Select sample",
    modelAnalysis: "Model Analysis",
    apiKeyLabel: "API Key",
    optional: "Optional",
    selectModel: "Select Model",
    refreshModelFirst: "Refresh models first",
    textToAnalyze: "Text to Analyze",
    textToAnalyzePlaceholder: "Enter text to analyze",
    refreshingModels: "Refreshing...",
    refreshModels: "Refresh Models",
    analyzing: "Analyzing...",
    analyzeWithModel: "Analyze with LLM",
    batchAnalyzeWithModel: "Batch Analyze",
    modelsLoaded: (count: number) => `${count} models loaded.`,
    enterOrSelectText: "Enter or select text first.",
    fillServiceUrl: "Fill the service URL first.",
    selectModelFirst: "Select a model first.",
    selectedText: "Selected Text",
    grammarError: "Grammar Error Found",
    noGrammarError: "No Grammar Error",
    correctedText: "Corrected Text",
    explanation: "Explanation",
    localRuleDemo: "Local Rule Demo",
    missingText: (text: string) => `Missing: ${text}`
  }
} as const;

interface I18nContextValue {
  locale: Locale;
  messages: (typeof messages)[Locale];
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  messages: messages[DEFAULT_LOCALE]
});

export function I18nProvider({
  locale,
  children
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages: messages[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function nextLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

export function getStoredLocale(storage: StorageLike | undefined = browserStorage()): Locale {
  try {
    const storedLocale = storage?.getItem(LOCALE_STORAGE_KEY);
    return isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setStoredLocale(
  locale: Locale,
  storage: StorageLike | undefined = browserStorage()
): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore unavailable storage, for example private browsing or server rendering.
  }
}

export function formatLineLabel(
  line: LabelLine,
  allLines: LabelLine[],
  locale: Locale
): string {
  if (line.type === "source") {
    return locale === "zh" ? "待改句" : "Text to Edit";
  }

  if (line.type === "reference") {
    const index = referenceIndex(line, allLines);
    const references = allLines.filter((candidateLine) => candidateLine.type === "reference");
    const totalReferences = Math.max(1, references.length);

    if (locale === "zh") {
      return totalReferences === 1 ? "参考答案" : `参考答案${index}`;
    }

    return totalReferences === 1 ? "Reference" : `Reference ${index}`;
  }

  const candidates = allLines.filter((candidateLine) => candidateLine.type === "candidate");
  const candidateIndex = Math.max(1, candidates.findIndex((candidate) => candidate.id === line.id) + 1);
  const totalCandidates = Math.max(1, candidates.length);
  const base =
    locale === "zh"
      ? totalCandidates === 1
        ? "修改句"
        : `修改${candidateIndex}`
      : totalCandidates === 1
        ? "Revision"
        : `Revision ${candidateIndex}`;

  return isAutoCandidateId(line.id) ? base : `${base}(${line.id})`;
}

export function formatTargetLabel(target: Target, targets: Target[], locale: Locale): string {
  return formatLineLabel(target, targets, locale);
}

export function formatSampleLabel(sampleId: string, locale: Locale): string {
  if (sampleId === "manual_sample") {
    return locale === "zh" ? "手动样本" : "Manual Sample";
  }

  const generatedSampleMatch = /^sample_(\d+)$/.exec(sampleId);
  if (generatedSampleMatch) {
    return locale === "zh"
      ? `样本${generatedSampleMatch[1]}`
      : `Sample ${generatedSampleMatch[1]}`;
  }

  return sampleId;
}

export function formatEditGroupLabel(groupId: string, locale: Locale): string {
  const punctuationGroupMatch = /^edit_group_(\d+)_punct$/.exec(groupId);
  if (punctuationGroupMatch) {
    return locale === "zh"
      ? `编辑组${punctuationGroupMatch[1]}标点`
      : `Edit Group ${punctuationGroupMatch[1]} Punctuation`;
  }

  const generatedGroupMatch = /^edit_group_(\d+)$/.exec(groupId);
  if (generatedGroupMatch) {
    return locale === "zh"
      ? `编辑组${generatedGroupMatch[1]}`
      : `Edit Group ${generatedGroupMatch[1]}`;
  }

  return groupId;
}

function referenceIndex(line: LabelLine, allLines: LabelLine[]): number {
  const generatedReferenceMatch = /^ref_(\d+)$/.exec(line.id);
  if (generatedReferenceMatch) {
    return Number(generatedReferenceMatch[1]);
  }

  const references = allLines.filter((candidateLine) => candidateLine.type === "reference");
  const index = references.findIndex((reference) => reference.id === line.id);
  return index >= 0 ? index + 1 : 1;
}

function isAutoCandidateId(id: string): boolean {
  return /^candidate_\d+$/.test(id);
}

function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en";
}

function browserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}
