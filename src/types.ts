export type EditOp = "replace" | "delete" | "insert" | "equal" | "anchor";

export interface Candidate {
  id: string;
  text: string;
}

export interface Sample {
  id: string;
  source: string;
  references: string[];
  candidates: Candidate[];
}

export interface Target {
  id: string;
  type: "reference" | "candidate";
  text: string;
}

export interface Edit {
  op: "replace" | "delete" | "insert";
  source_start: number;
  source_end: number;
  source_text: string;
  target_start: number;
  target_end: number;
  target_text: string;
  target_id?: string;
  target_type?: "reference" | "candidate";
}

export interface EditGroupItemSegment {
  text: string;
  op: EditOp;
}

export interface EditGroupItem {
  text: string;
  op: EditOp;
  segments: EditGroupItemSegment[];
}

export interface EditGroup {
  group_id: string;
  source_start: number;
  source_end: number;
  source_text: string;
  items: Record<string, EditGroupItem>;
}

export type SegmentType = "plain" | "replace" | "delete" | "insert" | "anchor";

export interface RenderSegment {
  text: string;
  type: SegmentType;
  group_id?: string;
  op?: EditOp;
}

export interface RenderLine {
  id: string;
  type: "source" | "reference" | "candidate";
  label: string;
  text: string;
  segments: RenderSegment[];
}

export interface DiffView {
  id: string;
  source: string;
  targets: Target[];
  edit_groups: EditGroup[];
  render_lines: RenderLine[];
}

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  models: ModelOption[];
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  requires_api_key: boolean;
}

export interface GrammarCheckRequest {
  text: string;
  model: string;
}

export interface GrammarCheckResult {
  has_error: boolean;
  corrected_text?: string;
  explanation?: string;
}
