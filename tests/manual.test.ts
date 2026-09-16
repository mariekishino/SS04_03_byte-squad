import { expect, it } from "vitest";
import {
  canSendGame,
  draftError,
  gameOriginal,
  gameReducer,
  initialGameState,
} from "../src/game/manual.js";
import type { GameState } from "../src/game/manual.js";
import { evaluateTransmission } from "../src/core/metrics.js";

function add(state: GameState, count: string, letter: string) {
  state = gameReducer(state, { type: "draft", field: "count", value: count });
  state = gameReducer(state, { type: "draft", field: "letter", value: letter });
  return gameReducer(state, { type: "add" });
}
function result(state: GameState) {
  const sent = gameReducer(state, { type: "send" });
  return evaluateTransmission(
    gameOriginal,
    sent.received!.output,
    sent.transmitted!,
    6,
  );
}
it.each(["", "0", "256", "1.5", "-1", " 4", "４", "NaN"])(
  "個数%sを変換せず拒否する",
  (count) => {
    const state = add(initialGameState, count, "A");
    expect(state.runs).toHaveLength(0);
    expect(state.error).toContain("1～255");
  },
);
it.each(["", "a", "AB", "あ", " A", "A ", "1"])(
  "文字%sを自動修正しない",
  (letter) => {
    expect(draftError({ count: "1", letter, index: null })).not.toBeNull();
  },
);
it("文字の誤答はそのまま送信し、編集して直せる", () => {
  let state = add(initialGameState, "4", "B");
  state = add(state, "2", "B");
  state = add(state, "4", "C");
  const before = gameReducer(state, { type: "send" });
  expect(before.transmitted).toEqual(Uint8Array.from([4, 66, 2, 66, 4, 67]));
  expect(result(state).comparison.firstMismatch).toBe(0);
  state = gameReducer(before, { type: "edit", index: 0 });
  expect(state.received).toBeNull();
  expect(state.playing).toBe(false);
  state = gameReducer(state, { type: "draft", field: "letter", value: "A" });
  state = gameReducer(state, { type: "add" });
  expect(result(state).success).toBe(true);
  expect(before.transmitted?.[1]).toBe(66);
});
it("合法な不足・余分・容量超過を送って別々に判定する", () => {
  let state = add(initialGameState, "4", "A");
  expect(result(state)).toMatchObject({
    withinBudget: true,
    comparison: { missingRange: { start: 4, endExclusive: 10 } },
  });
  state = add(add(state, "2", "B"), "5", "C");
  expect(result(state).comparison.extraRange).toEqual({
    start: 10,
    endExclusive: 11,
  });
  state = add(
    add(add(add(initialGameState, "2", "A"), "2", "A"), "2", "B"),
    "4",
    "C",
  );
  expect(result(state)).toMatchObject({
    withinBudget: false,
    exceededBytes: 2,
    comparison: { matches: true },
  });
});
it("未確定の入力を送信に混ぜず、取消後に送信できる", () => {
  let state = add(initialGameState, "4", "A");
  state = gameReducer(state, { type: "draft", field: "count", value: "2" });
  expect(canSendGame(state)).toBe(false);
  expect(gameReducer(state, { type: "send" })).toBe(state);
  state = gameReducer(state, { type: "cancel" });
  expect(canSendGame(state)).toBe(true);
  state = gameReducer(state, { type: "undo" });
  expect(canSendGame(state)).toBe(false);
});
it("上限超過では復元結果を返さず、組を保持して理由を出す", () => {
  let state = initialGameState;
  for (let i = 0; i < 17; i++) state = add(state, "255", "A");
  state = gameReducer(state, { type: "send" });
  expect(state.received).toBeNull();
  expect(state.phase).toBe("editing");
  expect(state.runs).toHaveLength(17);
  expect(state.error).toContain("4096 B");
});
it("結果へ進んでも前に戻れ、ヒント・編集・再開後は旧タイマーを無視する", () => {
  let state = gameReducer(add(initialGameState, "4", "A"), { type: "send" });
  const oldTick = {
    type: "tick",
    generation: state.generation,
    step: state.step,
  } as const;
  state = gameReducer(state, { type: "hint" });
  expect(state.playing).toBe(false);
  expect(state.hintLevel).toBe(1);
  state = gameReducer(state, { type: "toggle" });
  expect(gameReducer(state, oldTick)).toBe(state);
  state = gameReducer(state, { type: "finish" });
  expect(state.phase).toBe("result");
  state = gameReducer(state, { type: "step", delta: -1 });
  expect(state.phase).toBe("decoding-review");
  state = gameReducer(state, { type: "edit-again" });
  expect(state.runs).toHaveLength(1);
  expect(state.received).toBeNull();
  expect(gameReducer(state, oldTick)).toBe(state);
});
