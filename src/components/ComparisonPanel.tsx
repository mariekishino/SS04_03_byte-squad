import { evaluateTransmission } from "../core/metrics.js";

export function ComparisonPanel({
  original,
  restored,
  transmitted,
  budget,
  response,
  hasMethodByte = false,
}: {
  original: Uint8Array;
  restored: Uint8Array;
  transmitted: Uint8Array;
  budget: number;
  response: string;
  hasMethodByte?: boolean;
}) {
  const result = evaluateTransmission(original, restored, transmitted, budget);
  const { firstMismatch, missingRange, extraRange } = result.comparison;
  const mismatchIsValue =
    firstMismatch !== null &&
    firstMismatch < Math.min(original.length, restored.length);
  // 大きい合法な誤答でも全量は判定し、比較表の描画だけ先頭64バイトに限定する。
  const length = Math.max(original.length, restored.length);
  return (
    <section
      className={`result ${result.success ? "success" : "failure"}`}
      aria-label="通信結果"
    >
      <p className="eyebrow">EARTH ACKNOWLEDGEMENT</p>
      <h2>{result.success ? "STAGE CLEAR" : "RETRY"}</h2>
      <p>
        {result.success
          ? `ミッションクリア！ ${response}`
          : result.comparison.matches
            ? "内容は元に戻りました。送信サイズを確認し、送り方を見直そう。"
            : "再送しよう。入力した組と、地球に届いた編隊を比べてみよう。"}
      </p>
      <div className="result-checks">
        <strong>復元：{result.comparison.matches ? "一致" : "不一致"}</strong>
        <strong>容量：{result.withinBudget ? "予算内" : "超過"}</strong>
      </div>
      {!result.withinBudget && (
        <p className="warning">
          {hasMethodByte ? "送信合計" : "本体"}
          {transmitted.length} B。上限{budget} Bを{result.exceededBytes}{" "}
          B超えています。
        </p>
      )}
      {mismatchIsValue && (
        <p>
          位置{firstMismatch}：元は
          {String.fromCharCode(original[firstMismatch]!)}、受信した文字は
          {String.fromCharCode(restored[firstMismatch]!)}です。
        </p>
      )}
      {missingRange && (
        <p>
          位置{missingRange.start}～{missingRange.endExclusive - 1}の
          {missingRange.endExclusive - missingRange.start} Bが不足しています。
        </p>
      )}
      {extraRange && (
        <p>
          位置{extraRange.start}～{extraRange.endExclusive - 1}に
          {extraRange.endExclusive - extraRange.start} B余分に届いています。
        </p>
      )}
      <div className="comparison-scroll">
        <table className="comparison-table">
          <caption>元データと受信データの比較（位置は0始まり）</caption>
          <thead>
            <tr>
              <th scope="col">位置</th>
              {Array.from({ length: Math.min(length, 64) }, (_, i) => (
                <th scope="col" key={i}>
                  {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">元データ</th>
              {Array.from({ length: Math.min(length, 64) }, (_, i) => (
                <td key={i}>
                  {i < original.length
                    ? String.fromCharCode(original[i]!)
                    : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">受信</th>
              {Array.from({ length: Math.min(length, 64) }, (_, i) => (
                <td
                  key={i}
                  className={original[i] !== restored[i] ? "different" : ""}
                >
                  {i < restored.length
                    ? String.fromCharCode(restored[i]!)
                    : "不足"}
                  {i >= original.length && <small>余分</small>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {length > 64 && (
        <p className="small">
          表は先頭64 Bのみ。全{length} Bを比較して判定しています。
        </p>
      )}
      <p className="small">
        {transmitted.length} Bを送り、{restored.length} Bを復元しました。
      </p>
    </section>
  );
}
