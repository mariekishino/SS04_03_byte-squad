import { runsToBytes } from "../core/rle.js";
import {
  packPayload,
  traceDecodePacket,
  traceDecodePayload,
} from "../core/packet.js";
import { ByteFormatError, parseLearningInput } from "../core/validation.js";
import type { DecodeStep, Method, Run, Trace } from "../core/types.js";
import { firstGameMission, getGameMission } from "./missions.js";

import type { GameMissionNumber } from "./missions.js";

export const gameOriginal = parseLearningInput(firstGameMission.input);
export interface Draft {
  readonly count: string;
  readonly letter: string;
  readonly index: number | null;
}
export interface GameState {
  readonly missionNumber: GameMissionNumber;
  readonly method: Method;
  readonly phase: "editing" | "decoding-review" | "result";
  readonly runs: readonly Run[];
  readonly draft: Draft;
  readonly received: Trace<DecodeStep> | null;
  readonly transmitted: Uint8Array | null;
  readonly step: number;
  readonly playing: boolean;
  readonly generation: number;
  readonly error: string | null;
  readonly hintLevel: number;
}
const emptyDraft: Draft = { count: "", letter: "", index: null };
export const initialGameState: GameState = {
  missionNumber: 1,
  method: "rle",
  phase: "editing",
  runs: [],
  draft: emptyDraft,
  received: null,
  transmitted: null,
  step: 0,
  playing: false,
  generation: 0,
  error: null,
  hintLevel: 0,
};
export function createGameState(missionNumber: GameMissionNumber): GameState {
  return {
    ...initialGameState,
    missionNumber,
    runs: getGameMission(missionNumber).initialRuns.map((run) => ({ ...run })),
  };
}
export function getGameOriginal(state: GameState): Uint8Array {
  return parseLearningInput(getGameMission(state.missionNumber).input);
}
/** 無圧縮は教材のコピー。保存中のRLE回答を送信へ混ぜない。 */
export function getGamePayload(state: GameState): Uint8Array {
  return state.method === "raw"
    ? getGameOriginal(state)
    : runsToBytes(state.runs);
}
/** 任務4では本体の前に方式情報を付け、実際に送るバイト列を返す。 */
export function getGameTransmission(state: GameState): Uint8Array {
  const payload = getGamePayload(state);
  return getGameMission(state.missionNumber).hasMethodByte
    ? packPayload(payload, state.method)
    : payload;
}
export function draftError(draft: Draft): string | null {
  if (
    !/^\d+$/.test(draft.count) ||
    !Number.isInteger(Number(draft.count)) ||
    Number(draft.count) < 1 ||
    Number(draft.count) > 255
  )
    return "個数は1～255の整数で入力してください。";
  if (!/^[A-Z]$/.test(draft.letter))
    return "文字は半角英大文字A～Zを1文字入力してください。";
  return null;
}
export function hasDraft(state: GameState): boolean {
  return (
    state.draft.count !== "" ||
    state.draft.letter !== "" ||
    state.draft.index !== null
  );
}
export function canSendGame(state: GameState): boolean {
  return (
    state.phase === "editing" &&
    (state.method === "raw" || (state.runs.length > 0 && !hasDraft(state)))
  );
}
export type GameAction =
  | { type: "method"; method: Method }
  | { type: "draft"; field: "count" | "letter"; value: string }
  | { type: "adjust"; delta: -1 | 1 }
  | { type: "edit"; index: number }
  | { type: "step"; delta: -1 | 1 }
  | { type: "tick"; generation: number; step: number }
  | {
      type:
        | "add"
        | "cancel"
        | "undo"
        | "send"
        | "pause"
        | "toggle"
        | "finish"
        | "reset-playback"
        | "edit-again"
        | "restart"
        | "hint";
    };

function editing(state: GameState): GameState {
  return {
    ...state,
    phase: "editing",
    received: null,
    transmitted: null,
    playing: false,
    step: 0,
    error: null,
    generation: state.generation + 1,
  };
}
function move(state: GameState, step: number, playing = false): GameState {
  if (!state.received) return state;
  const last = state.received.steps.length - 1;
  const bounded = Math.max(0, Math.min(last, step));
  return {
    ...state,
    step: bounded,
    phase: bounded === last ? "result" : "decoding-review",
    playing: playing && bounded < last,
  };
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  // RLE編集用ショートカットが無圧縮の下書きを変えないようにする。
  if (
    state.method === "raw" &&
    ["draft", "adjust", "add", "cancel", "edit", "undo"].includes(action.type)
  )
    return state;
  switch (action.type) {
    case "method": {
      const allowed: readonly Method[] = getGameMission(
        state.missionNumber,
      ).methods;
      if (state.method === action.method || !allowed.includes(action.method))
        return state;
      return { ...editing(state), method: action.method };
    }
    case "draft":
      return {
        ...editing(state),
        draft: { ...state.draft, [action.field]: action.value },
      };
    case "adjust": {
      const current = Number(state.draft.count);
      const count = Math.max(
        1,
        Math.min(
          255,
          (Number.isFinite(current) ? Math.trunc(current) : 0) + action.delta,
        ),
      );
      return {
        ...editing(state),
        draft: { ...state.draft, count: String(count) },
      };
    }
    case "add": {
      const error = draftError(state.draft);
      if (error) return { ...state, error };
      const run = {
        count: Number(state.draft.count),
        value: state.draft.letter.charCodeAt(0),
      };
      const runs = [...state.runs];
      if (state.draft.index === null) runs.push(run);
      else runs[state.draft.index] = run;
      return { ...editing(state), runs, draft: emptyDraft };
    }
    case "cancel":
      return { ...state, draft: emptyDraft, error: null };
    case "edit": {
      if (hasDraft(state)) return state;
      const run = state.runs[action.index];
      if (!run) return state;
      return {
        ...editing(state),
        draft: {
          count: String(run.count),
          letter: String.fromCharCode(run.value),
          index: action.index,
        },
      };
    }
    case "undo":
      return hasDraft(state)
        ? state
        : { ...editing(state), runs: state.runs.slice(0, -1) };
    case "send": {
      if (!canSendGame(state)) return state;
      const transmitted = getGameTransmission(state);
      try {
        const received = getGameMission(state.missionNumber).hasMethodByte
          ? traceDecodePacket(transmitted)
          : traceDecodePayload(transmitted, state.method);
        return {
          ...state,
          phase: "decoding-review",
          received,
          transmitted,
          step: 0,
          playing: true,
          error: null,
          generation: state.generation + 1,
        };
      } catch (error) {
        if (!(error instanceof ByteFormatError)) throw error;
        return {
          ...editing(state),
          error: `${error.message} ${error.source === "packet" ? "送信データ" : "本体"}の位置${error.offset}（0始まり）を確認してください。`,
        };
      }
    }
    case "step":
      return move(state, state.step + action.delta);
    case "tick":
      if (
        !state.playing ||
        state.generation !== action.generation ||
        state.step !== action.step
      )
        return state;
      return move(state, state.step + 1, true);
    case "pause":
      return { ...state, playing: false, generation: state.generation + 1 };
    case "toggle":
      return {
        ...state,
        playing: state.phase === "decoding-review" && !state.playing,
        generation: state.generation + 1,
      };
    case "finish":
      return move(state, state.received ? state.received.steps.length - 1 : 0);
    case "reset-playback":
      return move({ ...state, generation: state.generation + 1 }, 0);
    case "edit-again":
      return editing(state);
    case "restart":
      return {
        ...createGameState(state.missionNumber),
        hintLevel: state.hintLevel,
        generation: state.generation + 1,
      };
    case "hint":
      return {
        ...state,
        hintLevel: Math.min(
          getGameMission(state.missionNumber).hints.length,
          state.hintLevel + 1,
        ),
        playing: false,
        generation: state.generation + 1,
      };
  }
}
