import { type FormEvent, useId, useState } from "react";

export interface ManualInputPayload {
  source: string;
  references: string[];
  candidates: string[];
}

interface ManualInputPanelProps {
  onSubmit: (input: ManualInputPayload) => void;
  onClear: () => void;
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
          <textarea
            id={sourceId}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={1}
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
        <button
          className="icon-text-button"
          type="button"
          onClick={() => onChange([...values, ""])}
        >
          添加
        </button>
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
                <textarea
                  id={inputId}
                  value={value}
                  onChange={(event) => updateValue(index, event.target.value)}
                  rows={1}
                  placeholder={`${itemName}_${index + 1}`}
                />
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => removeValue(index)}
                  disabled={!canRemove}
                >
                  删除
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
