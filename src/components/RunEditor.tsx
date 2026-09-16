import { useRef } from "react";
import { getGameMission } from "../game/missions.js";
import type { Dispatch } from "react";
import { canSendGame, draftError, hasDraft } from "../game/manual.js";
import type { GameAction, GameState } from "../game/manual.js";

export function RunEditor({
  state,
  dispatch,
  budget,
  onSend,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  budget: number;
  onSend: () => void;
}) {
  const countInput = useRef<HTMLInputElement>(null);
  const mission = getGameMission(state.missionNumber);
  const repair = mission.initialRuns.length > 0;
  const error = draftError(state.draft);
  const dirty = hasDraft(state);
  return (
    <section className="run-editor" aria-labelledby="editor-heading">
      <div className="console-title">
        <h2 id="editor-heading">
          {repair ? "カプセルを修理する" : "カプセルを作る"}
        </h2>
        <span>YOUR TRANSMISSION</span>
      </div>
      {repair ? (
        <div className="repair-brief">
          <p className="eyebrow">REPAIR MISSION</p>
          <p>
            復元機に渡すデータの末尾が欠けています。最初に用意したのは(4,A)の1組だけ。
          </p>
          <p className="small">
            まず「地球へ送信」で不足を調べよう。結果を見たら、組を追加・編集して元どおりに届けます。1組は2
            Bです。
          </p>
        </div>
      ) : (
        <p className="small">
          編隊を見て、続く文字の個数と文字を入力しよう。1組は2 Bです。
        </p>
      )}
      <p className="editor-source">
        <span>送る元データ</span>
        <code>{mission.input}</code>
        <small>左から順番に</small>
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "add" });
          if (!error) countInput.current?.focus();
        }}
      >
        <div className="run-inputs">
          <div>
            <label htmlFor="run-count">
              個数 <small>1～255</small>
            </label>
            <div className="count-input">
              <button
                type="button"
                aria-label="個数を減らす"
                onClick={() => dispatch({ type: "adjust", delta: -1 })}
              >
                −
              </button>
              <input
                ref={countInput}
                id="run-count"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={state.draft.count}
                onChange={(e) =>
                  dispatch({
                    type: "draft",
                    field: "count",
                    value: e.target.value,
                  })
                }
                aria-describedby="draft-help"
              />
              <button
                type="button"
                aria-label="個数を増やす"
                onClick={() => dispatch({ type: "adjust", delta: 1 })}
              >
                ＋
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="run-letter">
              文字 <small>A～Zの1文字</small>
            </label>
            <input
              id="run-letter"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={state.draft.letter}
              onChange={(e) =>
                dispatch({
                  type: "draft",
                  field: "letter",
                  value: e.target.value,
                })
              }
              aria-describedby="draft-help"
            />
          </div>
          <div>
            <label htmlFor="letter-picker">文字を選ぶ</label>
            <select
              id="letter-picker"
              value={
                /^[A-Z]$/.test(state.draft.letter) ? state.draft.letter : ""
              }
              onChange={(e) =>
                dispatch({
                  type: "draft",
                  field: "letter",
                  value: e.target.value,
                })
              }
            >
              <option value="">未選択</option>
              {Array.from({ length: 26 }, (_, i) =>
                String.fromCharCode(65 + i),
              ).map((letter) => (
                <option key={letter}>{letter}</option>
              ))}
            </select>
          </div>
        </div>
        <p
          className={`small draft-help ${dirty && error ? "warning" : "muted"}`}
          id="draft-help"
          aria-live="polite"
        >
          {dirty
            ? (error ??
              "この組を確定するか、入力を取り消してから送信できます。")
            : repair
              ? "不足した分の個数と文字を決めて「組を追加」。入力は自分で確かめよう。"
              : "個数と文字を決めて「組を追加」。まだ答えは入っていません。"}
        </p>
        <div className="editor-buttons">
          <button type="submit" className="primary" disabled={error !== null}>
            {state.draft.index === null ? "組を追加" : "組の変更を保存"}
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => dispatch({ type: "cancel" })}
          >
            入力を取り消す
          </button>
        </div>
      </form>
      <ol className="run-list" aria-label="送信する組の一覧">
        {state.runs.map((run, index) => (
          <li key={index}>
            <span className="muted">{String(index + 1).padStart(2, "0")}</span>
            <strong>
              ({run.count}, {String.fromCharCode(run.value)})
            </strong>
            <small>2 B</small>
            <button
              disabled={dirty}
              aria-label={`組${index + 1}を編集`}
              onClick={() => {
                dispatch({ type: "edit", index });
                countInput.current?.focus();
              }}
            >
              編集
            </button>
          </li>
        ))}
      </ol>
      <div className="editor-buttons">
        <button
          disabled={state.runs.length === 0 || dirty}
          onClick={() => dispatch({ type: "undo" })}
        >
          最後の組を取り消す
        </button>
        <small className="muted">
          {state.runs.length}組 / 本体 {state.runs.length * 2} B
        </small>
      </div>
      {state.error && (
        <p className="error-message" role="alert">
          {state.error}
        </p>
      )}
      <div className="mission-actions">
        <button
          className="primary send-button"
          disabled={!canSendGame(state)}
          onClick={onSend}
        >
          {state.runs.length * 2 + (mission.hasMethodByte ? 1 : 0) > budget
            ? "予算を超えて試す"
            : "地球へ送信"}{" "}
          <span>TRANSMIT ↗</span>
        </button>
        <button className="quiet" onClick={() => dispatch({ type: "restart" })}>
          任務を最初から
        </button>
      </div>
    </section>
  );
}
