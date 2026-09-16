import { CompressionGuide } from "./CompressionGuide.js";
import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { ArcadeField } from "./ArcadeField.js";
import { PlaybackControls } from "./PlaybackControls.js";
import { SizePanel } from "./SizePanel.js";
import { Earth, Ship } from "./Sprites.js";
import { calculateMetrics, evaluateTransmission } from "../core/metrics.js";
import type { DecodeStep, EncodeStep } from "../core/types.js";
import { missionOne } from "../game/missions.js";
import { canSend, encoding, lastStep, original } from "../game/state.js";
import { useMission } from "../game/useMission.js";

function encodeLog(step: EncodeStep): string {
  const run = step.currentRun;
  switch (step.event) {
    case "initial":
      return "「次へ」でスキャン開始。同じ文字が何機続くか数えよう。";
    case "read-first":
      return `${String.fromCharCode(run!.value)}を発見。連続する機体を数えます。現在1機。`;
    case "extend-run":
      return `同じ${String.fromCharCode(run!.value)}が続いています。現在${run!.count}機。`;
    case "flush-and-start":
      return `${String.fromCharCode(step.output.at(-1)!)}を${step.output.at(-2)}機読み取り、個数と値の2 Bに確定。次は${String.fromCharCode(run!.value)}です。`;
    case "flush-final":
      return `入力の末尾です。最後の${String.fromCharCode(step.output.at(-1)!)}も${step.output.at(-2)}機の組として確定します。`;
    case "complete":
      return `${original.length} Bの編隊が${step.output.length} Bの本体に。準備完了、地球へ送信しよう。`;
  }
}

function decodeLog(step: DecodeStep): string {
  switch (step.event) {
    case "initial":
      return "地球がカプセルを受信。「次へ」で個数と値を読み取ろう。";
    case "read-pair":
      return `個数${step.currentRun!.count}・値${String.fromCharCode(step.currentRun!.value)}。この組から${step.currentRun!.count}機を復元します。`;
    case "emit-byte":
      return `${String.fromCharCode(step.currentRun!.value)}を1機復元。この組から${step.emittedFromRun} / ${step.currentRun!.count}機が戻りました。`;
    case "advance-pair":
      return "この組の復元が完了。次の組、または入力の末尾を確認します。";
    case "complete":
      return "全カプセルの復元が完了。内容と通信容量をそれぞれ確認しました。";
    default:
      return "受信データを読み取っています。";
  }
}

export function TutorialScreen({
  onExit,
  onClear,
  onGame,
}: {
  onExit: () => void;
  onClear: () => void;
  onGame: () => void;
}) {
  const { state, dispatch } = useMission();
  const field = useRef<HTMLElement>(null);
  const isEncoding = state.phase === "encoding-review";
  const encodeStep = isEncoding ? encoding.steps[state.step]! : null;
  const decodeStep = !isEncoding ? state.received!.steps[state.step]! : null;
  const payload = isEncoding
    ? encodeStep!.output
    : Array.from(state.transmitted!);
  const metrics = calculateMetrics(
    original,
    Uint8Array.from(payload),
    missionOne.hasMethodByte,
  );
  const result =
    state.phase === "result"
      ? evaluateTransmission(
          original,
          state.received!.output,
          state.transmitted!,
          missionOne.budget,
        )
      : null;
  const log = isEncoding ? encodeLog(encodeStep!) : decodeLog(decodeStep!);
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (result?.success) onClear();
  }, [result?.success, onClear]);

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    // 通常のボタン・入力欄の操作を奪わず、フィールド自身のフォーカス時だけ扱う。
    if (
      event.target !== event.currentTarget ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        dispatch({ type: "step", delta: -1 });
        break;
      case "ArrowRight":
        event.preventDefault();
        dispatch({ type: "step", delta: 1 });
        break;
      case " ":
        event.preventDefault();
        if (!event.repeat) dispatch({ type: "toggle" });
        break;
      case "Enter":
        event.preventDefault();
        dispatch({ type: "send" });
        break;
      case "Escape":
        event.preventDefault();
        dispatch({ type: "pause" });
        break;
    }
  }

  return (
    <main className="mission-page">
      <div className="mission-heading">
        <div>
          <p className="eyebrow">TUTORIAL / チュートリアル</p>
          <h1>
            連続を数える<span>地球への、最初の通信。</span>
          </h1>
        </div>
        <button className="quiet" onClick={onExit}>
          ← ホーム
        </button>
      </div>
      <div className="mission-layout">
        <div className="game-column">
          <div className="hud">
            <span>
              TUTORIAL <b>練習</b>
            </span>
            <span>
              MODE <b>RLE</b>
            </span>
            <span>
              BYTES <b>{metrics.transmittedBytes} B</b>
            </span>
            <span>
              LIMIT <b>{missionOne.budget} B</b>
            </span>
          </div>
          <ArcadeField
            ref={field}
            original={original}
            payload={payload}
            encodeStep={encodeStep}
            decodeStep={decodeStep}
            complete={state.step === lastStep(state)}
            onKeyDown={handleKey}
          >
            {result && (
              <section
                className={`result ${result.success ? "success" : "failure"}`}
                aria-label="通信結果"
              >
                <p className="eyebrow">EARTH ACKNOWLEDGEMENT</p>
                <h2>{result.success ? "TRAINING COMPLETE" : "RETRY"}</h2>
                <p>
                  {result.success
                    ? missionOne.response
                    : "内容と容量を確認して、もう一度試そう。"}
                </p>
                <div className="result-checks">
                  <strong>
                    復元：{result.comparison.matches ? "一致" : "不一致"}
                  </strong>
                  <strong>
                    容量：{result.withinBudget ? "予算内" : "超過"}
                  </strong>
                </div>
                <p className="small">
                  {metrics.transmittedBytes} Bを送り、
                  {state.received!.output.length} Bを復元しました。
                </p>
              </section>
            )}
          </ArcadeField>
          <div className="console">
            <div className="console-title">
              <h2>{isEncoding ? "圧縮" : "復元"}のステップ</h2>
              <span>{isEncoding ? "ENCODING" : "DECODING"}</span>
            </div>
            <p className="communication-log" role="status">
              <span aria-hidden="true">&gt;_</span>
              {log}
            </p>
            <PlaybackControls
              step={state.step}
              last={lastStep(state)}
              playing={state.playing}
              onPrevious={() => dispatch({ type: "step", delta: -1 })}
              onNext={() => dispatch({ type: "step", delta: 1 })}
              onToggle={() => dispatch({ type: "toggle" })}
              onReset={() => dispatch({ type: "reset-playback" })}
            />
            <div className="mission-actions">
              {isEncoding ? (
                <button
                  className="primary send-button"
                  disabled={!canSend(state)}
                  onClick={() => {
                    dispatch({ type: "send" });
                    field.current?.focus({ preventScroll: true });
                  }}
                >
                  地球へ送信 <span>TRANSMIT ↗</span>
                </button>
              ) : (
                <button onClick={() => dispatch({ type: "review-encoding" })}>
                  圧縮から見直す
                </button>
              )}
              <button
                className="quiet"
                onClick={() => dispatch({ type: "restart" })}
              >
                もう一度練習
              </button>
            </div>
            <p className="key-help" id="keyboard-help">
              フィールドを選ぶと <kbd>←</kbd>
              <kbd>→</kbd> 前後のステップ · <kbd>Space</kbd> 再生 / 停止 ·{" "}
              <kbd>Enter</kbd> 送信 · <kbd>Esc</kbd> 停止
            </p>
          </div>
        </div>
        <aside className="instruments">
          <SizePanel
            metrics={metrics}
            budget={missionOne.budget}
            complete={canSend(state) || !isEncoding}
            receiving={!isEncoding}
          />
          <section className="instrument dispatch">
            <p className="eyebrow">MESSAGE FROM EARTH</p>
            <h2>
              <Earth />
              地球の管制室
            </h2>
            <p>{missionOne.request}</p>
            <p className="small muted">
              データを一つも失わず、
              <br />
              通信容量の中に収めよう。
            </p>
          </section>
          <details className="instrument">
            <summary onClick={() => dispatch({ type: "pause" })}>
              このステージのヒント
            </summary>
            <p className="small">
              連続するAを6機数えたら、「個数6」と「値A」の2
              Bで表せます。地球では「Aを6個出す」と読んで元に戻します。
            </p>
            <p className="small muted">
              この入力は半角英大文字なので1文字＝1
              Bです。日本語や絵文字では同じとは限りません。
            </p>
          </details>
          <details className="instrument">
            <summary onClick={() => dispatch({ type: "pause" })}>
              実際のバイトを見る
            </summary>
            <p className="small muted">確定した本体・十進数表示</p>
            <code className="byte-values">[{payload.join(", ")}]</code>
            <p className="small muted">
              個数6は数値6のバイトです。括弧やカンマは送信しません。
            </p>
          </details>
          <CompressionGuide onRead={() => dispatch({ type: "pause" })} />
          {result?.success && (
            <div className="next-note">
              <span>練習完了</span>
              <p>
                次は自分で編隊をまとめます。
                <br />
                ゲームでは個数と文字を自分で決めよう。
              </p>
              <button className="primary" onClick={onGame}>
                通信任務に挑戦
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
