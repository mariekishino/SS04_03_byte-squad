interface Props {
  step: number;
  last: number;
  playing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggle: () => void;
  onReset: () => void;
}

export function PlaybackControls({
  step,
  last,
  playing,
  onPrevious,
  onNext,
  onToggle,
  onReset,
}: Props) {
  return (
    <div className="playback">
      <div className="playback-caption">
        <span>
          STEP{" "}
          <b data-testid="step-count">
            {String(step).padStart(2, "0")} / {last}
          </b>
        </span>
        <span>
          {playing
            ? "自動再生中 · 1秒 / ステップ"
            : step === last
              ? "完了"
              : "操作を待っています"}
        </span>
      </div>
      <div className="playback-buttons">
        <button onClick={onPrevious} disabled={step === 0}>
          ← 前へ
        </button>
        <button
          onClick={onToggle}
          disabled={step === last}
          className="play-toggle"
        >
          {playing ? "Ⅱ 一時停止" : "▶ 自動再生"}
        </button>
        <button onClick={onNext} disabled={step === last}>
          次へ →
        </button>
        <button onClick={onReset} className="quiet">
          ↺ 再生をリセット
        </button>
      </div>
    </div>
  );
}
