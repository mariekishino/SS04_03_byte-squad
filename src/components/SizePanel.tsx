import type { SizeMetrics } from "../core/metrics.js";

export function SizePanel({
  metrics,
  budget,
  complete,
  receiving,
}: {
  metrics: SizeMetrics;
  budget: number;
  complete: boolean;
  receiving: boolean;
}) {
  const rows = [
    ["元データ", metrics.originalBytes],
    ["本体", metrics.payloadBytes],
    ["方式情報", metrics.metadataBytes],
    ["送信合計", metrics.transmittedBytes],
    ["上限", budget],
  ] as const;
  return (
    <section className="instrument size-panel" aria-labelledby="size-heading">
      <p className="eyebrow">TRANSMISSION BUDGET</p>
      <h2 id="size-heading">通信容量</h2>
      <div className="capacity-number">
        <strong>{metrics.transmittedBytes}</strong>
        <span>/ {budget} B</span>
      </div>
      <div
        className="capacity-slots"
        style={{ gridTemplateColumns: `repeat(${budget}, 1fr)` }}
        aria-hidden="true"
      >
        {Array.from({ length: budget }, (_, index) => (
          <i
            key={index}
            className={index < metrics.transmittedBytes ? "filled" : ""}
          />
        ))}
      </div>
      <p className="small muted">
        {receiving
          ? "送信したバイト数"
          : complete
            ? "送信準備完了"
            : "確定済みの本体を計測中"}
      </p>
      {metrics.transmittedBytes > budget && (
        <p className="warning small">
          上限を{metrics.transmittedBytes - budget} B超過。試験通信は可能です。
        </p>
      )}
      <dl>
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd data-testid={`size-${name}`}>
              {value} <span>B</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="small muted">
        方式は送受信側で共有済み。
        <br />
        このステージは本体だけを数えます。
      </p>
      {complete && (
        <div className="saving">
          {Math.abs(metrics.savedBytes)} B{" "}
          {metrics.savedBytes < 0 ? "増加" : "削減"}{" "}
          <span>
            {metrics.reductionPercent === null
              ? "—"
              : `${metrics.reductionPercent < 0 ? "+" : "−"}${Math.abs(metrics.reductionPercent).toFixed(0)}%`}
          </span>
        </div>
      )}
    </section>
  );
}
