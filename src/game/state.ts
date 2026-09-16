import { traceEncodeRle } from "../core/rle.js";
import { traceDecodePayload } from "../core/packet.js";
import { parseLearningInput } from "../core/validation.js";
import type { DecodeStep, Trace } from "../core/types.js";
import { missionOne } from "./missions.js";

export const original = parseLearningInput(missionOne.input);
export const encoding = traceEncodeRle(original);

export interface MissionState {
  readonly phase: "encoding-review" | "decoding-review" | "result";
  readonly step: number;
  readonly playing: boolean;
  readonly received: Trace<DecodeStep> | null;
  readonly transmitted: Uint8Array | null;
  /** リセット前に予約されたタイマーを無効にする世代番号。 */
  readonly generation: number;
}

export const initialState: MissionState = {
  phase: "encoding-review",
  step: 0,
  playing: false,
  received: null,
  transmitted: null,
  generation: 0,
};

export type MissionAction =
  | { type: "step"; delta: -1 | 1 }
  | {
      type: "tick";
      generation: number;
      step: number;
      phase: MissionState["phase"];
    }
  | {
      type:
        | "toggle"
        | "pause"
        | "send"
        | "reset-playback"
        | "restart"
        | "review-encoding";
    };

export function lastStep(state: MissionState): number {
  return (
    (state.phase === "encoding-review"
      ? encoding.steps.length
      : state.received!.steps.length) - 1
  );
}

export function canSend(state: MissionState): boolean {
  return state.phase === "encoding-review" && state.step === lastStep(state);
}

function move(
  state: MissionState,
  delta: number,
  playing: boolean,
): MissionState {
  const step = Math.max(0, Math.min(lastStep(state), state.step + delta));
  const complete = step === lastStep(state);
  const phase =
    state.phase === "encoding-review"
      ? state.phase
      : complete
        ? "result"
        : "decoding-review";
  return { ...state, step, phase, playing: playing && !complete };
}

export function missionReducer(
  state: MissionState,
  action: MissionAction,
): MissionState {
  switch (action.type) {
    case "step":
      return move(state, action.delta, false);
    case "tick":
      if (
        !state.playing ||
        action.generation !== state.generation ||
        action.phase !== state.phase ||
        action.step !== state.step
      )
        return state;
      return move(state, 1, true);
    case "toggle":
      return {
        ...state,
        playing: state.step < lastStep(state) && !state.playing,
      };
    case "pause":
      return { ...state, playing: false };
    case "send": {
      if (!canSend(state)) return state;
      const transmitted = encoding.output.slice();
      // 地球側は送信した本体と共有済みの方式だけから復元する。
      const received = traceDecodePayload(transmitted, missionOne.method);
      return {
        ...state,
        phase: "decoding-review",
        step: 0,
        playing: false,
        transmitted,
        received,
        generation: state.generation + 1,
      };
    }
    case "reset-playback":
      return {
        ...state,
        step: 0,
        playing: false,
        phase:
          state.phase === "encoding-review"
            ? "encoding-review"
            : "decoding-review",
        generation: state.generation + 1,
      };
    case "review-encoding":
      return { ...initialState, generation: state.generation + 1 };
    case "restart":
      return { ...initialState, generation: state.generation + 1 };
  }
}
