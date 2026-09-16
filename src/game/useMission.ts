import { useEffect, useReducer } from "react";
import { initialState, missionReducer } from "./state.js";

export function useMission() {
  const [state, dispatch] = useReducer(missionReducer, initialState);
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setTimeout(
      () =>
        dispatch({
          type: "tick",
          generation: state.generation,
          step: state.step,
          phase: state.phase,
        }),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [state.playing, state.step, state.phase, state.generation]);
  return { state, dispatch };
}
