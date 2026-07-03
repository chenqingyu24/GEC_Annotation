import type { Sample } from "../types";

interface SampleNavigatorProps {
  samples: Sample[];
  currentIndex: number;
  onChange: (index: number) => void;
}

export function SampleNavigator({
  samples,
  currentIndex,
  onChange
}: SampleNavigatorProps) {
  if (samples.length === 0) {
    return null;
  }

  const currentSample = samples[currentIndex];

  return (
    <nav className="sample-navigator" aria-label="样本切换">
      <button
        className="secondary-button compact-button"
        type="button"
        onClick={() => onChange(currentIndex - 1)}
        disabled={currentIndex <= 0}
      >
        上一条
      </button>

      <div className="sample-status">
        <span className="sample-count">
          {currentIndex + 1} / {samples.length}
        </span>
        <strong>{currentSample?.id ?? ""}</strong>
      </div>

      <label className="select-label">
        <span className="sr-only">选择样本</span>
        <select
          value={currentIndex}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {samples.map((sample, index) => (
            <option value={index} key={`${sample.id}-${index}`}>
              {index + 1}. {sample.id}
            </option>
          ))}
        </select>
      </label>

      <button
        className="secondary-button compact-button"
        type="button"
        onClick={() => onChange(currentIndex + 1)}
        disabled={currentIndex >= samples.length - 1}
      >
        下一条
      </button>
    </nav>
  );
}
