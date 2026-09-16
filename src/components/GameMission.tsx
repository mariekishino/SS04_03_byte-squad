import { useEffect, useRef } from "react";
import type { Dispatch, KeyboardEvent } from "react";
import { calculateMetrics, evaluateTransmission } from "../core/metrics.js";
import {
  getGameOriginal,
  getGameTransmission,
  canSendGame,
} from "../game/manual.js";
import type { GameAction, GameState } from "../game/manual.js";
import { getGameMission, getNextGameMission } from "../game/missions.js";
import type { GameMissionNumber } from "../game/missions.js";
import { ArcadeField } from "./ArcadeField.js";
import { RunEditor } from "./RunEditor.js";
import { ComparisonPanel } from "./ComparisonPanel.js";
import { MissionSidebar } from "./MissionSidebar.js";
import { PlaybackControls } from "./PlaybackControls.js";

export function GameMission({
  state,
  dispatch,
  onHome,
  onClear,
  onNext,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onHome: () => void;
  onClear: (number: GameMissionNumber) => void;
  onNext?: (() => void) | undefined;
}) {
  const field = useRef<HTMLElement>(null);
  const mission = getGameMission(state.missionNumber);
  const nextMission = getNextGameMission(state.missionNumber);
  const gameOriginal = getGameOriginal(state);
  const isRaw = state.method === "raw";
  const isEditing = state.phase === "editing";
  const transmitted = isEditing
    ? getGameTransmission(state)
    : state.transmitted!;
  const payload = mission.hasMethodByte ? transmitted.subarray(1) : transmitted;
  const metrics = calculateMetrics(
    gameOriginal,
    payload,
    mission.hasMethodByte,
  );
  const step = isEditing ? null : state.received!.steps[state.step]!;
  const success =
    state.phase === "result" &&
    evaluateTransmission(
      gameOriginal,
      state.received!.output,
      transmitted,
      mission.budget,
    ).success;
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (success) onClear(mission.number);
  }, [success, onClear, mission.number]);
  function onKey(event: KeyboardEvent<HTMLElement>) {
    if (
      event.target !== event.currentTarget ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      dispatch({ type: "pause" });
    }
    if (
      (!isEditing || !isRaw) &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      dispatch({
        type: isEditing ? "adjust" : "step",
        delta: event.key === "ArrowLeft" ? -1 : 1,
      });
    }
    if ((!isEditing || !isRaw) && event.key === " " && !event.repeat) {
      event.preventDefault();
      dispatch({ type: isEditing ? "add" : "toggle" });
    }
    if (event.key.toLowerCase() === "z" && isEditing && !isRaw) {
      event.preventDefault();
      dispatch({ type: "undo" });
    }
    if (event.key === "Enter" && canSendGame(state)) {
      event.preventDefault();
      dispatch({ type: "send" });
    }
  }
  return (
    <main className="mission-page manual-game">
      <div className="mission-heading">
        <div>
          <p className="eyebrow">
            GAME / MISSION {String(mission.number).padStart(2, "0")}
          </p>
          <h1>
            {mission.title}
            <span>
              {isRaw
                ? "データをそのまま、地球へ届けよう。"
                : "君のカプセルで、地球へ届けよう。"}
            </span>
          </h1>
        </div>
        <button className="quiet" onClick={onHome}>
          ← ホーム
        </button>
      </div>
      <div className="mission-layout">
        <div className="game-column">
          <div className="hud">
            <span>
              STAGE <b>{String(mission.number).padStart(2, "0")}</b>
            </span>
            <span>
              MODE <b>{isRaw ? "無圧縮" : "RLE"}</b>
            </span>
            <span>
              BYTES <b>{metrics.transmittedBytes} B</b>
            </span>
            <span>
              LIMIT <b>{mission.budget} B</b>
            </span>
          </div>
          <ArcadeField
            ref={field}
            method={step?.method ?? state.method}
            methodByte={mission.hasMethodByte ? transmitted[0] : undefined}
            sector={mission.number}
            original={gameOriginal}
            payload={Array.from(payload)}
            encodeStep={null}
            decodeStep={step}
            manual={isEditing}
            complete={state.phase === "result"}
            onKeyDown={onKey}
          >
            {state.phase === "result" && (
              <ComparisonPanel
                original={gameOriginal}
                restored={state.received!.output}
                transmitted={transmitted}
                hasMethodByte={mission.hasMethodByte}
                budget={mission.budget}
                response={mission.response}
              />
            )}
          </ArcadeField>
          <div className="console">
            {mission.methods.length > 1 && (
              <fieldset className="method-picker">
                <legend>送信方式を選ぶ</legend>
                <div className="method-options">
                  <label>
                    <input
                      type="radio"
                      name="method"
                      value="rle"
                      checked={!isRaw}
                      onChange={() =>
                        dispatch({ type: "method", method: "rle" })
                      }
                    />
                    RLE（個数と文字）
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="method"
                      value="raw"
                      checked={isRaw}
                      onChange={() =>
                        dispatch({ type: "method", method: "raw" })
                      }
                    />
                    無圧縮（そのまま送る）
                  </label>
                </div>
                <p className="small muted">
                  {mission.hasMethodByte
                    ? "選んだ方式を先頭の1 Bで伝えます。"
                    : "方式は地球と共有済み。"}
                  切り替えると再生と結果をリセットします。RLEの組と入力途中の内容は保存されます。
                </p>
              </fieldset>
            )}
            {isEditing && isRaw ? (
              <section aria-labelledby="raw-heading">
                <div className="console-title">
                  <h2 id="raw-heading">そのまま送る</h2>
                  <span>UNCOMPRESSED DATA</span>
                </div>
                <p className="small">
                  個数を付けず、元データを1文字1
                  Bで送ります。地球では受信したバイトを1つずつコピーして元に戻します。
                </p>
                <p className="editor-source">
                  <span>送る元データ</span>
                  <code>{mission.input}</code>
                  <strong>{payload.length} B</strong>
                </p>
                <p className="small muted">
                  保存したRLEの組や入力途中の内容は、この送信には含まれません。
                </p>
                <div className="mission-actions">
                  <button
                    className="primary send-button"
                    onClick={() => {
                      dispatch({ type: "send" });
                      field.current?.focus({ preventScroll: true });
                    }}
                  >
                    {metrics.transmittedBytes > mission.budget
                      ? "予算を超えて試す"
                      : "地球へ送信"}{" "}
                    <span>TRANSMIT ↗</span>
                  </button>
                  <button
                    className="quiet"
                    onClick={() => dispatch({ type: "restart" })}
                  >
                    任務を最初から
                  </button>
                </div>
              </section>
            ) : isEditing ? (
              <RunEditor
                state={state}
                dispatch={dispatch}
                budget={mission.budget}
                onSend={() => {
                  dispatch({ type: "send" });
                  field.current?.focus({ preventScroll: true });
                }}
              />
            ) : (
              <>
                <div className="console-title">
                  <h2>復元のステップ</h2>
                  <span>EARTH RECEIVER</span>
                </div>
                <p className="communication-log" role="status">
                  {state.phase === "result"
                    ? "地球からの応答を確認し、必要なら送り方を見直そう。"
                    : step!.event === "read-method"
                      ? `先頭の方式情報${transmitted[0]}を読み取り、${step!.method === "rle" ? "RLE" : "無圧縮"}で復元します。この1 Bは元データに含めません。`
                      : `地球で復元中：${step!.output.length} B。途中で止めたり、結果まで進めたりできます。`}
                </p>
                <PlaybackControls
                  step={state.step}
                  last={state.received!.steps.length - 1}
                  playing={state.playing}
                  onPrevious={() => dispatch({ type: "step", delta: -1 })}
                  onNext={() => dispatch({ type: "step", delta: 1 })}
                  onToggle={() => dispatch({ type: "toggle" })}
                  onReset={() => dispatch({ type: "reset-playback" })}
                />
                <div className="mission-actions">
                  <button
                    className="primary"
                    disabled={state.phase === "result"}
                    onClick={() => dispatch({ type: "finish" })}
                  >
                    結果を見る
                  </button>
                  <button
                    onClick={() => {
                      dispatch({ type: "edit-again" });
                    }}
                  >
                    {isRaw ? "送り方を見直す" : "組を編集して再送"}
                  </button>
                </div>
              </>
            )}
            <p className="key-help" id="keyboard-help">
              {isEditing
                ? isRaw
                  ? "フィールド選択中：Enter 送信"
                  : "フィールド選択中：← → 個数の増減 / Space 組を追加 / Z 最後の組を取消 / Enter 送信"
                : "フィールド選択中：← → 前後のステップ / Space 再生・停止 / Esc 停止"}
              。入力欄では通常のキー操作が使えます。
            </p>
            {success && (
              <div className="game-complete">
                <p>
                  通信任務{mission.number}を達成！ {mission.debrief}
                </p>
                {mission.hasMethodByte && (
                  <section aria-label="RLEの振り返り">
                    <h2>今回学んだこと</h2>
                    <ul>
                      <li>
                        表現を変えて小さくしても、元どおりに戻せることが大切。
                      </li>
                      <li>データによっては、圧縮すると大きくなる。</li>
                      <li>読み方を伝える方式情報も、送信容量に含まれる。</li>
                    </ul>
                    <p>
                      次のデータが<code>ABCABCABC</code>なら？
                      同じ文字は続かなくても、同じ並びが繰り返されています。
                    </p>
                    <p className="small muted">
                      自由実験と用語カードは準備中です。その後は並びを使い回すLZ77の考え方へ進み、実ファイルの保存やZIPの展開につなげます。
                    </p>
                  </section>
                )}
                {onNext && nextMission && (
                  <button className="primary" onClick={onNext}>
                    任務{nextMission.number}へ：{nextMission.title}
                  </button>
                )}
                <button onClick={onHome}>ホームへ戻る</button>
                <button onClick={() => dispatch({ type: "restart" })}>
                  もう一度挑戦
                </button>
              </div>
            )}
          </div>
        </div>
        <MissionSidebar state={state} dispatch={dispatch} metrics={metrics} />
      </div>
    </main>
  );
}
