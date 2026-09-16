import { useCallback, useState } from "react";
import { HomeScreen } from "./components/HomeScreen.js";
import { TutorialScreen } from "./components/TutorialScreen.js";
import { GameMission } from "./components/GameMission.js";
import { Ship } from "./components/Sprites.js";
import { useGameMission } from "./game/useGameMission.js";

import { getNextGameMission } from "./game/missions.js";
import type { GameMissionNumber } from "./game/missions.js";

type Mode = "home" | "tutorial" | "game";
export function App() {
  const [mode, setMode] = useState<Mode>("home");
  const [trained, setTrained] = useState(false);
  const [cleared, setCleared] = useState<readonly GameMissionNumber[]>([]);
  const [selectedMission, setSelectedMission] = useState<GameMissionNumber>(1);
  const first = useGameMission(mode === "game" && selectedMission === 1, 1);
  const second = useGameMission(mode === "game" && selectedMission === 2, 2);
  const third = useGameMission(mode === "game" && selectedMission === 3, 3);
  const fourth = useGameMission(mode === "game" && selectedMission === 4, 4);
  const sessions = { 1: first, 2: second, 3: third, 4: fourth };
  const { state, dispatch } = sessions[selectedMission];
  const nextMission = getNextGameMission(selectedMission);
  const onTrained = useCallback(() => setTrained(true), []);
  const onClear = useCallback((number: GameMissionNumber) => {
    setCleared((previous) =>
      previous.includes(number) ? previous : [...previous, number],
    );
  }, []);
  function openGame(number: GameMissionNumber = 1) {
    first.dispatch({ type: "pause" });
    second.dispatch({ type: "pause" });
    third.dispatch({ type: "pause" });
    fourth.dispatch({ type: "pause" });
    setSelectedMission(number);
    setMode("game");
    window.scrollTo(0, 0);
  }
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
          onGame={openGame}
        />
      )}
      {mode === "tutorial" && (
        <TutorialScreen
          onExit={() => navigate("home")}
          onClear={onTrained}
          onGame={() => openGame(1)}
        />
      )}
      {mode === "game" && (
        <GameMission
          key={selectedMission}
          onNext={nextMission ? () => openGame(nextMission.number) : undefined}
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
