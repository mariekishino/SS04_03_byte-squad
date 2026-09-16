import { expect, it } from "vitest";
import {
  canSend,
  initialState,
  lastStep,
  missionReducer,
} from "../src/game/state.js";

it("圧縮完了前の送信を拒否し、完了後は送信データから復元を始める", () => {
  expect(missionReducer(initialState, { type: "send" })).toBe(initialState);
  let state = initialState;
  while (!canSend(state))
    state = missionReducer(state, { type: "step", delta: 1 });
  state = missionReducer(state, { type: "send" });
  expect(state.transmitted).toEqual(Uint8Array.from([6, 65, 4, 66, 2, 67]));
  expect(state.received?.output).toHaveLength(12);
  expect(state.phase).toBe("decoding-review");
  expect(state.step).toBe(0);
});

it("リセットや手動移動の後に旧タイマーが到着しても進まない", () => {
  let state = missionReducer(initialState, { type: "toggle" });
  const oldTick = {
    type: "tick",
    generation: state.generation,
    phase: state.phase,
    step: state.step,
  } as const;
  state = missionReducer(state, { type: "restart" });
  state = missionReducer(state, { type: "toggle" });
  expect(missionReducer(state, oldTick)).toBe(state);
  const currentTick = { ...oldTick, generation: state.generation };
  state = missionReducer(state, { type: "step", delta: 1 });
  expect(state.playing).toBe(false);
  expect(missionReducer(state, currentTick)).toBe(state);
});

it("完了で自動再生が止まり、前へで結果から復元途中へ戻れる", () => {
  let state = { ...initialState, step: lastStep(initialState) };
  state = missionReducer(state, { type: "send" });
  state = missionReducer(state, { type: "toggle" });
  while (state.playing) {
    state = missionReducer(state, {
      type: "tick",
      generation: state.generation,
      phase: state.phase,
      step: state.step,
    });
  }
  expect(state.phase).toBe("result");
  state = missionReducer(state, { type: "step", delta: -1 });
  expect(state.phase).toBe("decoding-review");
  state = missionReducer(state, { type: "reset-playback" });
  expect(state.step).toBe(0);
  expect(state.received?.steps[state.step]?.output).toEqual([]);
});
