import type { Sample } from "../types";
import { useI18n } from "../i18n";

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
  const { messages: m } = useI18n();

  if (samples.length === 0) {
    return null;
  }

  const currentSample = samples[currentIndex];

  return (
    <nav className="sample-navigator" aria-label={m.sampleNavigatorAria}>
      <button
        className="secondary-button compact-button"
        type="button"
        onClick={() => onChange(currentIndex - 1)}
        disabled={currentIndex <= 0}
      >
        {m.previousSample}
      </button>

      <div className="sample-status">
        <span className="sample-count">
          {currentIndex + 1} / {samples.length}
        </span>
        <strong>{currentSample?.id ?? ""}</strong>
      </div>

      <label className="select-label">
        <span className="sr-only">{m.selectSample}</span>
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
        {m.nextSample}
      </button>
    </nav>
  );
}
