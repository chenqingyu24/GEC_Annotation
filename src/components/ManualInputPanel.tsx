import {
  type ChangeEvent,
  type FormEvent,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

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
        <h2 id="manual-input-title">手动输入</h2>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor={sourceId}>
          <span className="field-label">原句</span>
          <AutoResizeTextarea
            id={sourceId}
            value={source}
            onValueChange={setSource}
            placeholder="输入 source"
          />
        </label>

        <DynamicTextList
          title="参考答案"
          itemName="reference"
          values={references}
          onChange={setReferences}
          canRemoveLast
        />

        <DynamicTextList
          title="候选句"
          itemName="candidate"
          values={candidates}
          onChange={setCandidates}
        />

        <div className="button-row">
          <button className="primary-button" type="submit">
            生成对齐结果
          </button>
          <button className="secondary-button" type="button" onClick={handleClear}>
            清空
          </button>
        </div>
      </form>
    </section>
  );
}

interface DynamicTextListProps {
  title: string;
  itemName: string;
  values: string[];
  onChange: (values: string[]) => void;
  canRemoveLast?: boolean;
}

function DynamicTextList({
  title,
  itemName,
  values,
  onChange,
  canRemoveLast = false
}: DynamicTextListProps) {
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
        <span className="field-label">{title}</span>
        <div className="field-group-actions">
          <button
            className="icon-text-button"
            type="button"
            onClick={() => onChange([...values, ""])}
          >
            添加
          </button>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={() => removeValue(values.length - 1)}
            disabled={!canRemove || values.length === 0}
          >
            删除
          </button>
        </div>
      </div>

      {values.length === 0 ? (
        <p className="empty-note">未添加参考答案。</p>
      ) : (
        <div className="dynamic-list">
          {values.map((value, index) => {
            const inputId = `${baseId}-${index}`;

            return (
              <div className="dynamic-row" key={inputId}>
                <label className="sr-only" htmlFor={inputId}>
                  {title} {index + 1}
                </label>
                <AutoResizeTextarea
                  id={inputId}
                  value={value}
                  onValueChange={(nextValue) => updateValue(index, nextValue)}
                  placeholder={`${itemName}_${index + 1}`}
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
