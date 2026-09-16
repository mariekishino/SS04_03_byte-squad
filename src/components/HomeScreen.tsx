import { Ship, Earth } from "./Sprites.js";

export function HomeScreen({
  onTutorial,
  onGame,
  trained,
  cleared,
}: {
  onTutorial: () => void;
  onGame: () => void;
  trained: boolean;
  cleared: boolean;
}) {
  return (
    <main className="start-page">
      <section className="hero">
        <div className="hero-top">
          <span>ORBITAL COMMUNICATION LAB</span>
          <span>EST. 2086 / SECTOR 01</span>
        </div>
        <div className="hero-main">
          <div className="hero-copy">
            <p className="eyebrow">小さく送って、そのまま届ける。</p>
            <h1>
              BYTE
              <br />
              <span>SQUAD</span>
              <i aria-hidden="true">_</i>
            </h1>
            <p className="hero-subtitle">宇宙通信士の圧縮ラボ</p>
            <h2 className="intro-title">宇宙の発見を、地球へ届けよう。</h2>
            <p className="hero-description">
              あなたは宇宙船の通信士。
              <br />
              集めた観測データを地球へ送りたいけれど、そのままでは通信容量の上限を超えてしまいます。
            </p>
            <p className="hero-description">
              データの並びから規則を見つけて、小さくまとめましょう。
              <br />
              ただし、情報を失ってはいけません。
            </p>
            <p className="intro-goal">
              <strong>
                容量以内に収めて送り、地球で元どおりに戻せたらミッションクリア！
              </strong>
            </p>
            <p className="small muted">
              時間制限なし。自分のペースで、何度でも。
            </p>
          </div>
          <div
            className="hero-diagram"
            aria-label="宇宙船でA6機を2バイトにまとめ、地球で復元する通信のイメージ"
          >
            <div className="diagram-label">01 / SCAN & ENCODE</div>
            <div className="demo-squad">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <Ship variant="data" />
                  <b>A</b>
                </div>
              ))}
            </div>
            <div className="diagram-flow">
              <span>6 B</span>
              <span>↓</span>
            </div>
            <div className="demo-packet">
              <div>
                <small>COUNT</small>
                <b>6</b>
                <small>1 B</small>
              </div>
              <div>
                <small>VALUE</small>
                <b>A</b>
                <small>1 B</small>
              </div>
              <span>2 B</span>
            </div>
            <div className="diagram-path">
              <Ship />
              <span>······················ →</span>
              <Earth />
            </div>
            <div className="diagram-label">02 / RESTORE ON EARTH</div>
            <div className="restored-demo">
              A A A A A A <span>6 B</span>
            </div>
            <p className="small muted">表現を変える。情報は失わない。</p>
          </div>
        </div>
        <div className="hero-bottom">
          <span>01 — SCAN</span>
          <span>02 — COMPRESS</span>
          <span>03 — TRANSMIT</span>
          <span>04 — RESTORE</span>
        </div>
      </section>
      <section className="mode-selection" aria-labelledby="mode-heading">
        <div className="section-heading">
          <h2 id="mode-heading">
            SELECT MODE <span>どちらからでも始められます</span>
          </h2>
          <span data-testid="game-progress">
            ゲーム {cleared ? "1" : "0"} / 1 CLEAR
          </span>
        </div>
        <div className="mode-buttons">
          <button
            className="mode-choice"
            onClick={onTutorial}
            aria-label="チュートリアル：通信の練習"
          >
            <span className="eyebrow">
              GUIDED TRAINING {trained ? " / 練習済み" : ""}
            </span>
            <strong>
              チュートリアル：通信の練習 <span>→</span>
            </strong>
            <span>ガイドと一緒に、圧縮と復元の仕組みを体験しよう。</span>
          </button>
          <button
            className="mode-choice game-choice"
            onClick={onGame}
            aria-label="ゲーム：通信任務に挑戦"
          >
            <span className="eyebrow">
              MISSION 01 {cleared ? " / CLEAR" : " / READY"}
            </span>
            <strong>
              ゲーム：通信任務に挑戦 <span>↗</span>
            </strong>
            <span>自分でデータをまとめ、限られた容量で地球へ届けよう。</span>
          </button>
        </div>
        <p className="small muted">
          ゲーム任務1「自分でまとめる」をプレイできます。チュートリアルを飛ばして挑戦できます。
        </p>
        <div className="upcoming-stages">
          <span>今後の任務</span>
          <p>
            02 圧縮の逆効果 <i>/</i> 03 復元機を修理する <i>/</i> 04
            見えない1バイト
          </p>
          <small>自由実験とあわせて準備中</small>
        </div>
      </section>
      <p className="scope-note">
        今回は文字データの圧縮・復元の基礎を体験します。実ファイルの保存やZIPの展開は、今後の学習範囲です。
      </p>
    </main>
  );
}
