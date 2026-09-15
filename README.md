# SS04_03_byte-squad

**BYTE SQUAD — 宇宙通信士の圧縮ラボ**

宇宙船から地球へデータを届けながら、圧縮と復元を学ぶ2Dレトロゲームです。
仕様の入口は[docs/00_README.md](docs/00_README.md)です。

## 現在の進捗

第1段階のコア処理を実装しました。ブラウザ画面は次の段階です。

1. **完了：コア処理** — RLE、無圧縮、方式パケット、ステップ記録、容量計算、比較・判定、自動テスト。
2. 次：ミッション1を圧縮から地球での復元・判定まで操作できる画面にする。
3. ミッション2～4の手動操作・方式選択・修理を実装する。
4. ミッション5、自由実験、用語カードを実装する。
5. キーボード・タッチ操作、狭い画面、演出を整える。
6. 全体の受け入れ確認を行う。

## セットアップと検証

Node.js 22.12以上とnpmを使用します。開発依存のバージョンは`package-lock.json`に固定しています。

```sh
npm ci
npm run check
```

| コマンド | 内容 |
| --- | --- |
| `npm test` | コアの自動テストを実行 |
| `npm run test:watch` | 変更時にテストを再実行 |
| `npm run typecheck` | TypeScriptの型検査 |
| `npm run build` | コアのJavaScriptと型定義を`dist/`へ出力 |
| `npm run check` | 型検査・テスト・ビルドを順に実行 |

現在はコアのみのビルドです。Webアプリの起動コマンドは第2段階で追加します。

## 圧縮から復元まで試す

`npm run build`の後、プロジェクトのルートで次を実行できます。

```sh
node --input-type=module <<'JS'
import { parseLearningInput } from './dist/core/validation.js';
import { encodeRle } from './dist/core/rle.js';
import { packPayload, decodePacket } from './dist/core/packet.js';
import { calculateMetrics, evaluateTransmission } from './dist/core/metrics.js';

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

第1段階で、型検査・自動テスト77件・コアのビルドが成功しました。
資料の境界値・異常系に加え、固定シードで生成した100入力の往復変換とトレースの一致を確認しています。
全5問の数値例、ミッション2の合法だが予算を超える組み方、ミッション4の欠損と修理も検証しています。

- ゲーム画面、操作状態、ミッション選択、演出は未実装です。ブラウザの動作確認はまだ行っていません。
- UI向け入力検証はA～Zの1～64文字。コアは0～255のバイトを扱います。
- 復元上限の既定値は4096 B。全スナップショットを持つトレースは短い教材データ向けです。
- 空データの縮小率は`null`を返します。画面では「—」として表示する予定です。
- 実ファイルの保存・読み込み、ZIPの作成・展開は今後の学習範囲です。
- 圧縮規則・ミッションの入力・予算は資料から変更していません。
