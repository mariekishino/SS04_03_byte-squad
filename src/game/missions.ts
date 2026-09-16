/** ガイド付きチュートリアル（旧ミッション1）。 */
export const missionOne = {
  id: 1,
  title: "連続を数える",
  input: "AAAAAABBBBCC",
  budget: 8,
  method: "rle",
  hasMethodByte: false,
  request: "最初の観測データを8 B以内で地球へ届けよう。",
  response: "観測データを元どおり受信。通信回線の確認完了！",
} as const;

export const firstGameMission = {
  id: 2,
  number: 1,
  methods: ["rle"],
  hints: [
    "同じ文字が続いている部分を探そう。順番は変えずに送ります。",
    "個数と文字で1組2 B。上限6 Bには何組入るかな？",
    "先頭のAは4個なので、最初の組は(4,A)。次のまとまりも数えてみよう。",
  ],
  title: "自分でまとめる",
  input: "AAAABBCCCC",
  budget: 6,
  request: "次の観測データは6 Bまで。個数と文字でカプセルを作ろう。",
  response: "全10 Bを復元。編隊の情報が届きました！",
} as const;

export const secondGameMission = {
  id: 3,
  number: 2,
  title: "圧縮の逆効果",
  input: "ABCDEF",
  budget: 6,
  methods: ["rle", "raw"],
  request: "今回の信号には連続がない。6 B以内で送れる方法を選ぼう。",
  response: "全6 Bを受信。今回のデータに合った方法でした！",
  hints: [
    "隣り合う文字を見よう。同じ文字が続く場所はあるかな？",
    "RLEでは1文字だけでも個数と文字で2 B。6組作ると何Bになるかな？",
    "無圧縮なら個数を付けず、6文字をそのまま6 Bで送れます。方式を切り替えて比べよう。",
  ],
} as const;

export const gameMissions = [firstGameMission, secondGameMission] as const;
export type GameMissionNumber = (typeof gameMissions)[number]["number"];
export function getGameMission(number: GameMissionNumber) {
  return number === 2 ? secondGameMission : firstGameMission;
}
