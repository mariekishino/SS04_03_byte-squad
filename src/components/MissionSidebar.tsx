import type { Dispatch } from "react";
import type { SizeMetrics } from "../core/metrics.js";
import type { GameAction, GameState } from "../game/manual.js";
import { getGameMission } from "../game/missions.js";
import { SizePanel } from "./SizePanel.js";
import { CompressionGuide } from "./CompressionGuide.js";
import { Earth } from "./Sprites.js";

export function MissionSidebar({
  state,
  dispatch,
  metrics,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  metrics: SizeMetrics;
}) {
  const mission = getGameMission(state.missionNumber);
  const hints = mission.hints;
  return (
    <aside className="instruments">
      <section className="instrument dispatch">
        <p className="eyebrow">
          YOUR MISSION / {String(mission.number).padStart(2, "0")}
        </p>
        <h2>
          <Earth />
          今回の任務
        </h2>
        <p>{mission.request}</p>
        <ul className="mission-conditions">
          <li>
            上限 <strong>{mission.budget} B以内</strong>
          </li>
          <li>
            地球で <strong>元どおりに復元</strong>
          </li>
        </ul>
        <p className="small muted">
          {state.method === "raw"
            ? "無圧縮では元データをそのまま送ります。地球で1バイトずつ受信する様子を確認しよう。"
            : "1組以上できたら送信できます。間違えても組を直して何度でも再送できます。"}
        </p>
      </section>
      <SizePanel
        metrics={metrics}
        budget={mission.budget}
        complete={state.phase !== "editing"}
        receiving={state.phase !== "editing"}
      />
      <details className="instrument">
        <summary onClick={() => dispatch({ type: "pause" })}>
          困ったときのヒント
        </summary>
        <p className="small muted">
          少しずつヒントを見られます。利用しても減点はありません。
        </p>
        <ol className="hint-list">
          {hints.slice(0, state.hintLevel).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ol>
        <button
          disabled={state.hintLevel === hints.length}
          onClick={() => dispatch({ type: "hint" })}
        >
          {state.hintLevel === 0
            ? "ヒントを見る"
            : state.hintLevel === hints.length
              ? "すべてのヒントを表示中"
              : "次のヒントを見る"}
        </button>
      </details>
      <CompressionGuide onRead={() => dispatch({ type: "pause" })} />
    </aside>
  );
}
