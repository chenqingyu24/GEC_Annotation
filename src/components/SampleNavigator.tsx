import type { Sample } from "../types";
import { formatSampleLabel, useI18n } from "../i18n";

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
  const { locale, messages: m } = useI18n();

  if (samples.length === 0) {
    return null;
  }

  const currentSample = samples[currentIndex];
  const currentSampleLabel = currentSample
    ? formatSampleLabel(currentSample.id, locale)
    : "";

  return (
    <nav className="sample-navigator sample-navigator-strip" aria-label={m.sampleNavigatorAria}>
      <div className="sample-status">
        <span className="sample-navigator-label">{m.sampleNavigatorLabel}</span>
        <strong className="sample-current-chip">{currentSampleLabel}</strong>
        <span className="sample-count">
          {currentIndex + 1} / {samples.length}
        </span>
      </div>

      <div className="sample-navigation-actions">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => onChange(currentIndex - 1)}
          disabled={currentIndex <= 0}
        >
          {m.previousSample}
        </button>

        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => onChange(currentIndex + 1)}
          disabled={currentIndex >= samples.length - 1}
        >
          {m.nextSample}
        </button>
      </div>
    </nav>
  );
}
