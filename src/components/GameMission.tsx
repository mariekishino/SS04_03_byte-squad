import { useEffect, useRef } from "react";
import type { Dispatch, KeyboardEvent } from "react";
import { calculateMetrics, evaluateTransmission } from "../core/metrics.js";
import { runsToBytes } from "../core/rle.js";
import { gameOriginal, canSendGame } from "../game/manual.js";
import type { GameAction, GameState } from "../game/manual.js";
import { firstGameMission } from "../game/missions.js";
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
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onHome: () => void;
  onClear: () => void;
}) {
  const field = useRef<HTMLElement>(null);
  const isEditing = state.phase === "editing";
  const payload = isEditing ? runsToBytes(state.runs) : state.transmitted!;
  const metrics = calculateMetrics(gameOriginal, payload, false);
  const step = isEditing ? null : state.received!.steps[state.step]!;
  const success =
    state.phase === "result" &&
    evaluateTransmission(
      gameOriginal,
      state.received!.output,
      payload,
      firstGameMission.budget,
    ).success;
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (success) onClear();
  }, [success, onClear]);
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
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      dispatch({
        type: isEditing ? "adjust" : "step",
        delta: event.key === "ArrowLeft" ? -1 : 1,
      });
    }
    if (event.key === " " && !event.repeat) {
      event.preventDefault();
      dispatch({ type: isEditing ? "add" : "toggle" });
    }
    if (event.key.toLowerCase() === "z" && isEditing) {
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
          <p className="eyebrow">GAME / MISSION 01</p>
          <h1>
            自分でまとめる<span>君のカプセルで、地球へ届けよう。</span>
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
              STAGE <b>01</b>
            </span>
            <span>
              MODE <b>RLE</b>
            </span>
            <span>
              BYTES <b>{payload.length} B</b>
            </span>
            <span>
              LIMIT <b>6 B</b>
            </span>
          </div>
          <ArcadeField
            ref={field}
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
                transmitted={payload}
                budget={firstGameMission.budget}
              />
            )}
          </ArcadeField>
          <div className="console">
            {isEditing ? (
              <RunEditor
                state={state}
                dispatch={dispatch}
                budget={firstGameMission.budget}
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
                    ? "地球からの応答を確認し、必要なら組を直して再送しよう。"
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
                    組を編集して再送
                  </button>
                </div>
              </>
            )}
            <p className="key-help" id="keyboard-help">
              {isEditing
                ? "フィールド選択中：← → 個数の増減 / Space 組を追加 / Z 最後の組を取消 / Enter 送信"
                : "フィールド選択中：← → 前後のステップ / Space 再生・停止 / Esc 停止"}
              。入力欄では通常のキー操作が使えます。
            </p>
            {success && (
              <div className="game-complete">
                <p>通信任務1を達成！ 次の任務は今後追加予定です。</p>
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
