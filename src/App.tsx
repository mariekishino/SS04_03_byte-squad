import { useCallback, useState } from "react";
import { HomeScreen } from "./components/HomeScreen.js";
import { TutorialScreen } from "./components/TutorialScreen.js";
import { GameMission } from "./components/GameMission.js";
import { Ship } from "./components/Sprites.js";
import { useGameMission } from "./game/useGameMission.js";

type Mode = "home" | "tutorial" | "game";
export function App() {
  const [mode, setMode] = useState<Mode>("home");
  const [trained, setTrained] = useState(false);
  const [cleared, setCleared] = useState(false);
  const { state, dispatch } = useGameMission(mode === "game");
  const onTrained = useCallback(() => setTrained(true), []);
  const onClear = useCallback(() => setCleared(true), []);
  function navigate(next: Mode) {
    dispatch({ type: "pause" });
    setMode(next);
    window.scrollTo(0, 0);
  }
  return (
    <>
      <header className="site-header">
        <div className="brand">
          <Ship />
          <span>
            BYTE<span className="muted">/</span>SQUAD
          </span>
        </div>
        <span className="header-label">宇宙通信士の圧縮ラボ</span>
        <span className="connection">● LOCAL SIMULATION</span>
      </header>
      {mode === "home" && (
        <HomeScreen
          trained={trained}
          cleared={cleared}
          onTutorial={() => navigate("tutorial")}
          onGame={() => navigate("game")}
        />
      )}
      {mode === "tutorial" && (
        <TutorialScreen
          onExit={() => navigate("home")}
          onClear={onTrained}
          onGame={() => navigate("game")}
        />
      )}
      {mode === "game" && (
        <GameMission
          state={state}
          dispatch={dispatch}
          onHome={() => navigate("home")}
          onClear={onClear}
        />
      )}
      <footer className="site-footer">
        <span>BYTE SQUAD / COMMUNICATION TRAINING</span>
        <span>送信はブラウザ内のシミュレーションです。</span>
      </footer>
    </>
  );
}
