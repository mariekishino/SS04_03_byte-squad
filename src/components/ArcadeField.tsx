import { forwardRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { DecodeStep, EncodeStep } from "../core/types.js";
import { ByteStrip } from "./ByteStrip.js";
import { Earth, Ship } from "./Sprites.js";

interface Props {
  original: Uint8Array;
  payload: readonly number[];
  encodeStep: EncodeStep | null;
  decodeStep: DecodeStep | null;
  complete: boolean;
  manual?: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  children: ReactNode;
}

export const ArcadeField = forwardRef<HTMLElement, Props>(function ArcadeField(
  {
    original,
    payload,
    encodeStep,
    decodeStep,
    complete,
    onKeyDown,
    children,
    manual = false,
  },
  ref,
) {
  const receiving = decodeStep !== null;
  const confirmedCount = payload.reduce(
    (total, count, index) => (index % 2 === 0 ? total + count : total),
    0,
  );
  const flushed =
    encodeStep?.event === "flush-and-start" ||
    encodeStep?.event === "flush-final";
  const activePair = receiving
    ? decodeStep.pairIndex
    : flushed
      ? payload.length / 2 - 1
      : null;
  const lastRunCount = payload.at(-2) ?? 0;
  const selectedStart = receiving
    ? decodeStep.output.length - decodeStep.emittedFromRun
    : flushed
      ? confirmedCount - lastRunCount
      : confirmedCount;
  const selectedEnd = receiving
    ? decodeStep.output.length
    : flushed
      ? confirmedCount
      : (encodeStep?.nextReadIndex ?? 0);
  const displayedBytes = receiving ? decodeStep.output : Array.from(original);
  return (
    <section
      className={`arcade-field ${receiving ? "receiving" : ""}`}
      ref={ref}
      tabIndex={0}
      aria-label="ゲームフィールド"
      aria-describedby="keyboard-help"
      onKeyDown={onKeyDown}
    >
      <div className="field-topline">
        <span>
          SECTOR 01 / {receiving ? "EARTH RECEIVER" : "ORBITAL SCANNER"}
        </span>
        <span className="status-dot">
          {complete ? "COMPLETE" : receiving ? "RECEIVING" : "STANDBY"}
        </span>
      </div>
      <div className="route">
        <span className={!receiving ? "route-active" : ""}>
          <Ship /> 宇宙船 <small>TRANSMITTER</small>
        </span>
        <span className="route-line" aria-hidden="true">
          ··························· →
        </span>
        <span
          className={receiving ? "route-active earth-label" : "earth-label"}
        >
          <Earth /> 地球 <small>RECEIVER</small>
        </span>
      </div>
      <div className="formation">
        <div className="zone-heading">
          <h2>{receiving ? "地球で復元した編隊" : "観測データの編隊"}</h2>
          <span>
            {displayedBytes.length} B <small>/ 1機 = 1 B</small>
          </span>
        </div>
        <div className="formation-space">
          {displayedBytes.length > 0 ? (
            <ByteStrip
              bytes={displayedBytes.slice(0, 64)}
              label={receiving ? "受信済みデータ" : "元の編隊"}
              activeStart={selectedStart}
              activeEnd={selectedEnd}
              confirmedUntil={receiving || manual ? 0 : confirmedCount}
              cursor={
                receiving
                  ? decodeStep.event === "emit-byte"
                    ? decodeStep.output.length - 1
                    : null
                  : (encodeStep?.lastReadIndex ?? null)
              }
            />
          ) : (
            <p className="empty-formation">
              [ 受信待機中 ]
              <span>カプセルを読み、ここに1機ずつ復元します。</span>
            </p>
          )}
        </div>
        {displayedBytes.length > 64 && (
          <p className="small muted">
            編隊は先頭64 Bを表示中。全{displayedBytes.length}{" "}
            Bを復元・判定します。
          </p>
        )}
        <div className="scan-readout">
          {manual ? (
            <span>個数と文字で組を作り、元の順番を保って送ろう。</span>
          ) : receiving ? (
            <>
              <span>
                受信済み{" "}
                <b>
                  {decodeStep.output.length} / {original.length} B
                </b>
              </span>
              <span>
                現在の組から{" "}
                <b>
                  {decodeStep.emittedFromRun} /{" "}
                  {decodeStep.currentRun?.count ?? "—"} 機
                </b>
              </span>
            </>
          ) : (
            <>
              <span>
                最後に読んだ位置 <b>{encodeStep?.lastReadIndex ?? "—"}</b>
              </span>
              <span>
                次に読む位置{" "}
                <b>
                  {encodeStep && encodeStep.nextReadIndex < original.length
                    ? encodeStep.nextReadIndex
                    : "末尾"}
                </b>
              </span>
              <span>
                集計中{" "}
                <b>
                  {encodeStep?.currentRun
                    ? `${String.fromCharCode(encodeStep.currentRun.value)} × ${encodeStep.currentRun.count}`
                    : "—"}
                </b>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="communication-lane">
        <div className="zone-heading">
          <h2>{receiving ? "地球が受け取ったカプセル" : "確定したカプセル"}</h2>
          <span>
            {payload.length / 2} 組 <small>/ 1組 = 2 B</small>
          </span>
        </div>
        <div className="capsules" aria-label="符号化カプセル">
          {payload.length === 0 ? (
            <p className="lane-placeholder">
              [ COUNT ][ VALUE ]
              <span>
                {manual
                  ? "個数と文字を入力して組を追加しよう。"
                  : "連続するデータを数えると、ここに組ができます。"}
              </span>
            </p>
          ) : (
            Array.from({ length: payload.length / 2 }, (_, index) => (
              <div
                className={`capsule ${activePair === index ? "active" : ""}`}
                key={index}
                aria-label={`組${index + 1}：個数${payload[index * 2]}、値${String.fromCharCode(payload[index * 2 + 1]!)}、2バイト`}
              >
                <div>
                  <small>COUNT</small>
                  <strong>{payload[index * 2]}</strong>
                  <span>1 B</span>
                </div>
                <div>
                  <small>VALUE</small>
                  <strong>
                    {String.fromCharCode(payload[index * 2 + 1]!)}
                  </strong>
                  <span>1 B</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {receiving && (
        <div className="reference-data">
          <span>比較用の元データ</span>
          <code>{String.fromCharCode(...original)}</code>
          <small>受信バイト数には含めません</small>
        </div>
      )}
      <div className="pilot">
        <span>—</span>
        <Ship />
        <span>—</span>
        <small>
          {receiving ? "DOWNLINK / 地球で復元" : "SCAN / 宇宙船で圧縮"}
        </small>
      </div>
      {children}
    </section>
  );
});
