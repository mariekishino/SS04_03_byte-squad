# SS04_03_byte-squad

**BYTE SQUAD — 宇宙通信士の圧縮ラボ**

宇宙船から地球へデータを届けながら、圧縮と復元を学ぶ2Dレトロゲームです。
仕様の入口は[docs/00_README.md](docs/00_README.md)です。

## 現在の進捗

ホームの目的説明、チュートリアル、手入力で挑戦するゲーム任務1まで実装しています。旧ミッション1はチュートリアル、旧ミッション2はゲーム任務1として分離しました。詳細は[ゲーム仕様](docs/02_game_design.md)を参照してください。

1. **完了：コア処理** — RLE、無圧縮、方式パケット、ステップ記録、容量計算、比較・判定。
2. **完了：ホームとチュートリアル** — 目的・成功条件の説明、モード選択、ガイド付きの圧縮・復元。練習完了とゲームのクリアを別々に記録。
3. **完了：ゲーム任務1** — 個数・文字の手入力、組の編集、送信、復元、誤答の比較と修正。段階的ヒントとRLEの豆知識。
4. **次：ゲーム任務2～4** — 無圧縮の選択、修理、方式情報を追加。
5. 自由実験、用語カード、出典を確認した歴史などの豆知識を追加。
6. 全体の受け入れ確認を行う。

## セットアップと検証

Node.js 22.12以上とnpmを使用します。開発依存のバージョンは`package-lock.json`に固定しています。

```sh
npm ci
npm run dev
```

表示されたURL（通常は`http://localhost:5173`）をブラウザで開き、「チュートリアル：通信の練習」または「ゲーム：通信任務に挑戦」を選んでください。リモートVMではIDEのポート転送で5173番を開けます。外部素材やAPIを使わず、ゲーム処理はブラウザ内で完結します。

```sh
npm run check
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Viteの開発サーバーを起動 |
| `npm test` | コアとゲーム状態の自動テストを実行 |
| `npm run test:watch` | 変更時にテストを再実行 |
| `npm run typecheck` | TypeScriptの型検査 |
| `npm run build` | 型検査後、Webアプリを`dist/`へ出力 |
| `npm run preview` | ビルドしたWebアプリをローカルで確認 |
| `npm run build:core` | コアのJavaScriptと型定義を`dist-core/`へ出力 |
| `npm run test:e2e` | ChromiumでPC・スマートフォン幅の操作を検証 |
| `npm run check` | 型検査・テスト・ビルドを順に実行 |

ブラウザテストは初回に`npx playwright install chromium`でブラウザを用意してから実行します。Playwrightが4173番でテスト用サーバーを起動し、終了時に停止します。

このVMでの検証ではブラウザを一時フォルダに置いています。同じ環境では次のコマンドで実行できます。

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/byte-squad-browsers npm run test:e2e
```

## チュートリアルの操作

1. ホームで「チュートリアル：通信の練習」を選ぶと、元データ`AAAAAABBBBCC`の12機が現れます。
2. 「次へ」か「自動再生」で同じ文字の連続を数えます。確定した個数・値の2マスごとに本体が2 B増えます。
3. 圧縮完了後に「地球へ送信」。本体6 Bを地球側へ渡します。
4. 復元のステップを進めると、受信した組から1機ずつ再出現します。
5. 元データとの完全一致と上限8 B以内を確認するとTRAINING COMPLETE（練習完了）です。「通信任務に挑戦」からゲームへ進めます。

前へ・次へ・再生リセットは圧縮と復元の両方で使えます。フィールドにフォーカスがあるときは、左右キーで前後のステップ、Spaceで再生・停止、Enterで送信、Escで停止できます。

## ゲーム任務1の操作

1. ホームで「ゲーム：通信任務に挑戦」を選びます。チュートリアル未完了でも挑戦できます。
2. 元データ`AAAABBCCCC`を見て、個数（1～255の整数）と文字（半角A～Zの1文字）を入力し、「組を追加」で送信するカプセルを作ります。＋／−や文字選択も使えます。
3. 確定した組は個別に編集でき、最後の組を取り消すこともできます。入力途中の組は追加か取消をしてから送信します。
4. 「地球へ送信」で、自分が作ったデータの復元が始まります。一時停止・前後移動・リセット・「結果を見る」で過程と結果を確認できます。
5. 元データと完全一致し、送信合計が6 B以内ならSTAGE CLEARです。間違いや不足・余分は比較表で確認し、「組を編集して再送」で修正できます。容量超過の組も「予算を超えて試す」で試せます。

任務条件、段階的ヒント、RLEの方式名・仕組みを紹介する豆知識をサイドバーに置いています。狭い画面では下へスクロールすると読めます。ヒント利用による減点はありません。

フィールド選択中の編集操作は左右キーで個数の増減、Spaceで組の追加、Zで最後の組の取消、Enterで送信です。復元中は左右キーで前後移動、Spaceで再生・停止、Escで停止できます。入力欄や通常のボタンでは標準のキー操作を使えます。スマートフォンでは画面のボタンで操作できます。

ヒント・豆知識を開く操作や画面移動で再生は停止します。ゲームの下書き・確定した組・再生位置は、ホームやチュートリアルを経由して戻っても保持します。練習完了とゲームのクリアは別々に記録し、ページの再読み込みでリセットされます。

## 圧縮から復元まで試す

画面を使わずコアだけ試す場合は、`npm run build:core`の後、プロジェクトのルートで次を実行できます。

```sh
node --input-type=module <<'JS'
import { parseLearningInput } from './dist-core/core/validation.js';
import { encodeRle } from './dist-core/core/rle.js';
import { packPayload, decodePacket } from './dist-core/core/packet.js';
import { calculateMetrics, evaluateTransmission } from './dist-core/core/metrics.js';

const original = parseLearningInput('AAAAAABBBBCC');
const payload = encodeRle(original);
const packet = packPayload(payload, 'rle');
const restored = decodePacket(packet);

console.log('送信バイト:', [...packet]);
console.log('地球で復元:', String.fromCharCode(...restored));
console.log('容量:', calculateMetrics(original, payload, true));
console.log('判定:', evaluateTransmission(original, restored, packet, 7));
JS
```

送信バイトは`[1, 6, 65, 4, 66, 2, 67]`、本体6 B＋方式情報1 B＝7 Bです。
地球側で`AAAAAABBBBCC`へ復元し、内容一致・予算内で成功します。
この例は方式情報ありのコア実験です。チュートリアルとゲーム任務1の画面は方式を事前共有する設定なので、方式情報は0 Bです。

## 画面の構成

| ファイル | 責務 |
| --- | --- |
| [src/App.tsx](src/App.tsx) | モードの切替と独立した進捗・ゲーム状態の保持 |
| [src/components/HomeScreen.tsx](src/components/HomeScreen.tsx) | 目的説明とモード選択 |
| [src/components/TutorialScreen.tsx](src/components/TutorialScreen.tsx) | ガイド付きの圧縮・復元と練習完了 |
| [src/components/GameMission.tsx](src/components/GameMission.tsx) | ゲーム任務1の編集・復元・結果 |
| [src/game/missions.ts](src/game/missions.ts) | チュートリアルとゲーム任務1の教材・予算・依頼 |
| [src/game/state.ts](src/game/state.ts) / [useMission.ts](src/game/useMission.ts) | チュートリアルの状態遷移と再生タイマー |
| [src/game/manual.ts](src/game/manual.ts) / [useGameMission.ts](src/game/useGameMission.ts) | 手入力の検証・編集・送信・復元と再生タイマー |
| [src/components/RunEditor.tsx](src/components/RunEditor.tsx) | 個数・文字の入力と組の編集 |
| [src/components/ComparisonPanel.tsx](src/components/ComparisonPanel.tsx) | 実際の復元結果と元データの比較 |
| [src/components/MissionSidebar.tsx](src/components/MissionSidebar.tsx) | 任務条件・段階的ヒント・豆知識 |
| [src/components/ArcadeField.tsx](src/components/ArcadeField.tsx) | 編隊・カプセル・自機・地球の描画 |
| [src/components/PlaybackControls.tsx](src/components/PlaybackControls.tsx) | ステップ再生のボタン |
| [src/components/SizePanel.tsx](src/components/SizePanel.tsx) | 実際の本体から導出した容量計器 |
| [e2e/mission-one.spec.ts](e2e/mission-one.spec.ts) / [manual-game.spec.ts](e2e/manual-game.spec.ts) | チュートリアルとゲームのブラウザ操作検証 |

## コアの構成

| ファイル | 責務 |
| --- | --- |
| [src/core/rle.ts](src/core/rle.ts) | RLE圧縮・復元、対応するステップ記録、手動の組の数値検証 |
| [src/core/packet.ts](src/core/packet.ts) | 無圧縮のコピー、方式バイトの付加・解釈、受信ステップ |
| [src/core/metrics.ts](src/core/metrics.ts) | 実バイト数による容量計算、不一致・不足・余分の比較、通信判定 |
| [src/core/types.ts](src/core/types.ts) | 方式、組、再生スナップショットの型 |
| [src/core/validation.ts](src/core/validation.ts) | 位置と理由を持つエラー、復元上限、教材入力の検証 |
| [tests/core.test.ts](tests/core.test.ts) | 形式仕様、ステップ記録、全5問の計算例、異常系のテスト |

通常の変換とステップ記録は同じ処理を共有します。通常変換では履歴を保持せず、コアはReactやDOMへ依存しません。

ステップの`output`は、その時点までに確定したバイトの読み取り専用コピーです。
圧縮の`nextReadIndex`と`lastReadIndex`はそれぞれ次に読む位置と最後に読んだ位置です。
復元の`sourceOffset`は参照元の位置で、パケットのトレースでは方式バイトも含めて数えます。
`complete`では入力末尾の次を指します。復元結果の比較範囲は0始まりで、`endExclusive`は含みません。

不正形式は`ByteFormatError`で理由・位置・位置の対象を返します。復元できない場合は通信成功の判定へ進めません。
復元関数は元データを受け取らず、受信したバイトから出力を生成します。

## 検証結果と制約

型検査・自動テスト100件（コア77件＋チュートリアル状態3件＋手入力ゲーム20件）・ブラウザテスト14件・Webアプリとコアのビルドがすべて成功しました。
資料の境界値・異常系に加え、固定シードで生成した100入力の往復変換とトレースの一致を確認しています。旧5問の数値例、合法だが予算を超える組み方、欠損と修理もコアで検証しています。

- 操作できるのはホーム、チュートリアル、ゲーム任務1です。ゲーム任務2～4、自由実験、用語カードは未実装です。豆知識はRLEの方式名・仕組みを掲載しています。
- PlaywrightではPC幅と390pxのスマートフォン幅（動きを減らす設定）で、モード選択、誤答・不足・余分・容量超過から修正してクリアする流れ、入力検証、下書き保持、再生停止、キーボードとタップ操作を確認しました。スクリーンショットは`test-results/`へ出力されます。
- ブラウザ検証の対象はChromiumです。実機スマートフォン・Safari・Firefoxでの確認はまだ行っていません。
- ゲームの回答は個数1～255と半角A～Zの組を扱います。元データを入力する自由実験用の検証関数はA～Zの1～64文字。コアは0～255のバイトを扱います。
- 復元上限は4096 B。超過する送信は出力確保前にエラーとし、組を保持します。復元編隊と比較表は先頭64 Bまで表示し、完全一致は全バイトを比較します。全スナップショットを持つトレースは短い教材データ向けです。
- 空データの縮小率は`null`を返します。自由実験の画面では「—」として表示する予定です。
- 実ファイルの保存・読み込み、ZIPの作成・展開は今後の学習範囲です。
