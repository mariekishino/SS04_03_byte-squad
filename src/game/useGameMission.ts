import { useEffect, useReducer } from "react";
import { gameReducer, initialGameState } from "./manual.js";

/** モード移動でも下書きは保持し、表示中のときだけ再生する。 */
export function useGameMission(active: boolean) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  useEffect(() => {
    if (!active || !state.playing) return;
    const timer = window.setTimeout(
      () =>
        dispatch({
          type: "tick",
          generation: state.generation,
          step: state.step,
        }),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [active, state.playing, state.generation, state.step]);
  return { state, dispatch };
}
