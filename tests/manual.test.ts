import { expect, it } from "vitest";
import {
  canSendGame,
  createGameState,
  getGameOriginal,
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

it("任務2のRLEは内容一致でも12 Bとなり、無圧縮は6 Bで成功する", () => {
  let state = createGameState(2);
  for (const letter of "ABCDEF") state = add(state, "1", letter);
  state = gameReducer(state, { type: "send" });
  expect(
    evaluateTransmission(
      getGameOriginal(state),
      state.received!.output,
      state.transmitted!,
      6,
    ),
  ).toMatchObject({
    success: false,
    withinBudget: false,
    exceededBytes: 6,
    comparison: { matches: true },
  });
  expect(state.transmitted).toHaveLength(12);
  state = gameReducer(state, { type: "method", method: "raw" });
  expect(state).toMatchObject({
    phase: "editing",
    playing: false,
    received: null,
    transmitted: null,
  });
  state = gameReducer(state, { type: "send" });
  expect(Array.from(state.transmitted!)).toEqual([65, 66, 67, 68, 69, 70]);
  expect(
    evaluateTransmission(
      getGameOriginal(state),
      state.received!.output,
      state.transmitted!,
      6,
    ).success,
  ).toBe(true);
  const copies = state.received!.steps.filter(
    (step) => step.event === "copy-byte",
  );
  expect(copies.map((step) => step.output.length)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(copies.map((step) => step.sourceOffset)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(state.received!.output).not.toBe(state.transmitted);
});

it("方式変更でRLEの誤答と未確定入力を保持し、無圧縮の送信には含めない", () => {
  let state = add(createGameState(2), "4", "Z");
  state = gameReducer(state, { type: "draft", field: "count", value: "256" });
  const draft = state.draft;
  state = gameReducer(state, { type: "method", method: "raw" });
  expect(canSendGame(state)).toBe(true);
  for (const type of ["add", "undo", "cancel"] as const)
    expect(gameReducer(state, { type })).toBe(state);
  state = gameReducer(state, { type: "send" });
  expect(String.fromCharCode(...state.received!.output)).toBe("ABCDEF");
  state = gameReducer(state, { type: "method", method: "rle" });
  expect(state.draft).toEqual(draft);
  expect(state.runs).toEqual([{ count: 4, value: 90 }]);
  expect(canSendGame(state)).toBe(false);
  expect(state.received).toBeNull();
  expect(state.transmitted).toBeNull();
});

it("方式変更前のタイマーを無視し、再挑戦しても任務番号とヒントを保つ", () => {
  let state = gameReducer(createGameState(2), {
    type: "method",
    method: "raw",
  });
  state = gameReducer(state, { type: "hint" });
  state = gameReducer(state, { type: "send" });
  const oldTick = {
    type: "tick",
    step: state.step,
    generation: state.generation,
  } as const;
  state = gameReducer(state, { type: "method", method: "rle" });
  state = gameReducer(state, { type: "method", method: "raw" });
  state = gameReducer(state, { type: "send" });
  expect(gameReducer(state, oldTick)).toBe(state);
  state = gameReducer(state, { type: "restart" });
  expect(state).toMatchObject({
    missionNumber: 2,
    method: "rle",
    phase: "editing",
    hintLevel: 1,
    runs: [],
    received: null,
    playing: false,
  });
  expect(getGameOriginal(state)).toEqual(
    Uint8Array.from([65, 66, 67, 68, 69, 70]),
  );
});

it("任務1はRLE固定で任務2の方式選択の影響を受けない", () => {
  expect(gameReducer(initialGameState, { type: "method", method: "raw" })).toBe(
    initialGameState,
  );
  expect(createGameState(1)).toMatchObject({
    method: "rle",
    missionNumber: 1,
    hintLevel: 0,
  });
});
