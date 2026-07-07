import {
  type ChangeEvent,
  type FormEvent,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { useI18n } from "../i18n";

export interface ManualInputPayload {
  source: string;
  references: string[];
  candidates: string[];
}

interface ManualInputPanelProps {
  onSubmit: (input: ManualInputPayload) => void;
  onClear: () => void;
}

export const AUTO_RESIZE_MAX_ROWS = 5;

interface AutoResizeTextareaElement {
  scrollHeight: number;
  style: {
    height: string;
    overflowY: string;
  };
}

interface ResizeAutoTextareaOptions {
  maxRows?: number;
  lineHeightPx?: number;
  paddingBlockPx?: number;
  minHeightPx?: number;
}

export function resizeAutoTextarea(
  textarea: AutoResizeTextareaElement,
  {
    maxRows = AUTO_RESIZE_MAX_ROWS,
    lineHeightPx = 24,
    paddingBlockPx = 20,
    minHeightPx = 44
  }: ResizeAutoTextareaOptions = {}
) {
  const maxHeight = lineHeightPx * maxRows + paddingBlockPx;
  textarea.style.height = "auto";

  const nextHeight = Math.max(minHeightPx, Math.min(textarea.scrollHeight, maxHeight));
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

export function ManualInputPanel({ onSubmit, onClear }: ManualInputPanelProps) {
  const { messages: m } = useI18n();
  const sourceId = useId();
  const [source, setSource] = useState("");
  const [references, setReferences] = useState<string[]>([""]);
  const [candidates, setCandidates] = useState<string[]>([""]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ source, references, candidates });
  };

  const handleClear = () => {
    setSource("");
    setReferences([""]);
    setCandidates([""]);
    onClear();
  };

  return (
    <section className="panel input-panel" aria-labelledby="manual-input-title">
      <div className="panel-header">
        <h2 id="manual-input-title">{m.manualInputTitle}</h2>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor={sourceId}>
          <span className="field-label">{m.textToEdit}</span>
          <AutoResizeTextarea
            id={sourceId}
            value={source}
            onValueChange={setSource}
            placeholder={m.textToEditPlaceholder}
          />
        </label>

        <DynamicTextList
          title={m.references}
          description={m.referencesHelp}
          emptyNote={m.noReferences}
          labelForIndex={(index, total) => m.referenceLabel(index, total)}
          placeholderForIndex={(index, total) => m.referencePlaceholder(index, total)}
          values={references}
          onChange={setReferences}
          canRemoveLast
        />

        <DynamicTextList
          title={m.revisions}
          description={m.revisionsHelp}
          emptyNote=""
          labelForIndex={(index, total) => m.revisionLabel(index, total)}
          placeholderForIndex={(index, total) => m.revisionPlaceholder(index, total)}
          values={candidates}
          onChange={setCandidates}
        />

        <div className="button-row">
          <button className="primary-button" type="submit">
            {m.generateResult}
          </button>
          <button className="secondary-button" type="button" onClick={handleClear}>
            {m.clear}
          </button>
        </div>
      </form>
    </section>
  );
}

interface DynamicTextListProps {
  title: string;
  description?: string;
  emptyNote: string;
  labelForIndex: (index: number, total: number) => string;
  placeholderForIndex: (index: number, total: number) => string;
  values: string[];
  onChange: (values: string[]) => void;
  canRemoveLast?: boolean;
}

function DynamicTextList({
  title,
  description,
  emptyNote,
  labelForIndex,
  placeholderForIndex,
  values,
  onChange,
  canRemoveLast = false
}: DynamicTextListProps) {
  const { locale, messages: m } = useI18n();
  const baseId = useId();
  const canRemove = canRemoveLast || values.length > 1;

  const updateValue = (index: number, value: string) => {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const removeValue = (index: number) => {
    const nextValues = values.filter((_, itemIndex) => itemIndex !== index);
    onChange(nextValues.length === 0 && !canRemoveLast ? [""] : nextValues);
  };

  return (
    <div className="field-group">
      <div className="field-group-header">
        <span className="field-title">
          <span className="field-label">{title}</span>
          {description ? (
            <span className="field-description">
              {locale === "zh" ? `（${description}）` : `(${description})`}
            </span>
          ) : null}
        </span>
      </div>

      <div className="field-group-actions field-group-actions-below">
        <button
          className="icon-text-button"
          type="button"
          onClick={() => onChange([...values, ""])}
        >
          {m.add}
        </button>
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => removeValue(values.length - 1)}
          disabled={!canRemove || values.length === 0}
        >
          {m.delete}
        </button>
      </div>

      {values.length === 0 ? (
        <p className="empty-note">{emptyNote}</p>
      ) : (
        <div className="dynamic-list">
          {values.map((value, index) => {
            const inputId = `${baseId}-${index}`;

            return (
              <div className="dynamic-row" key={inputId}>
                <label className="sr-only" htmlFor={inputId}>
                  {labelForIndex(index, values.length)}
                </label>
                <AutoResizeTextarea
                  id={inputId}
                  value={value}
                  onValueChange={(nextValue) => updateValue(index, nextValue)}
                  placeholder={placeholderForIndex(index, values.length)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AutoResizeTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "onChange" | "rows"> {
  onValueChange: (value: string) => void;
}

function AutoResizeTextarea({
  onValueChange,
  value,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      resizeAutoTextarea(textareaRef.current);
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.currentTarget.value);
    resizeAutoTextarea(event.currentTarget);
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className="auto-resize-textarea"
      value={value}
      onChange={handleChange}
      rows={1}
    />
  );
}
