import type { Dispatch } from "react";
import type { SizeMetrics } from "../core/metrics.js";
import type { GameAction, GameState } from "../game/manual.js";
import { firstGameMission } from "../game/missions.js";
import { SizePanel } from "./SizePanel.js";
import { Earth } from "./Sprites.js";

const hints = [
  "同じ文字が続いている部分を探そう。順番は変えずに送ります。",
  "個数と文字で1組2 B。上限6 Bには何組入るかな？",
  "先頭のAは4個なので、最初の組は(4,A)。次のまとまりも数えてみよう。",
];
export function MissionSidebar({
  state,
  dispatch,
  metrics,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  metrics: SizeMetrics;
}) {
  return (
    <aside className="instruments">
      <section className="instrument dispatch">
        <p className="eyebrow">YOUR MISSION / 01</p>
        <h2>
          <Earth />
          今回の任務
        </h2>
        <p>{firstGameMission.request}</p>
        <ul className="mission-conditions">
          <li>
            上限 <strong>6 B以内</strong>
          </li>
          <li>
            地球で <strong>元どおりに復元</strong>
          </li>
        </ul>
        <p className="small muted">
          1組以上できたら送信できます。間違えても組を直して何度でも再送できます。
        </p>
      </section>
      <SizePanel
        metrics={metrics}
        budget={firstGameMission.budget}
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
      <details className="instrument">
        <summary onClick={() => dispatch({ type: "pause" })}>
          通信士の豆知識
        </summary>
        <h3>RLE：ランレングス符号化</h3>
        <p className="small">
          Run Length
          Encodingの略。続いている同じ値を「個数」と「値」で表します。このゲームでは1組2
          Bです。
        </p>
        <p className="small">
          1文字だけでも1組にすると2
          B。圧縮すると必ず小さくなるわけではありません。
        </p>
        <p className="small muted">
          今回の「復元」は元のバイト列へ戻すこと。ZIPからファイルを取り出す「展開」とは区別して学びます。
        </p>
      </details>
    </aside>
  );
}
