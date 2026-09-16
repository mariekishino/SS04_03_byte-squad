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
  initialRuns: [],
  debrief: "個数と文字でまとめ、元どおりに届けられました。",
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
  initialRuns: [],
  debrief: "圧縮すると大きくなるデータもあります。データに合う送り方を選ぼう。",
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

/** 末尾の組を意図的に省いた教材。通常のエンコーダーとは独立している。 */
export const thirdGameMission = {
  id: 4,
  number: 3,
  title: "復元機を修理する",
  input: "AAAABB",
  budget: 4,
  methods: ["rle"],
  initialRuns: [{ count: 4, value: 65 }],
  request: "受信データの末尾が不足。欠けた組を補って4 B以内で再送しよう。",
  response: "末尾のBを2個確認。全データがそろいました！",
  debrief: "最後のまとまりも送信に含めると、地球で元どおりに復元できます。",
  hints: [
    "まず今あるカプセルを送って、元データと受信データの末尾を比べよう。",
    "最後のまとまりの後には、別の文字が来ません。入力終了時にも、最後のまとまりを組として出力する必要があります。",
    "元データの末尾はBが2個。今ある(4,A)の後ろに(2,B)を追加すると、本体4 Bで全部届きます。",
  ],
} as const;

export const gameMissions = [
  firstGameMission,
  secondGameMission,
  thirdGameMission,
] as const;
export type GameMissionNumber = (typeof gameMissions)[number]["number"];
export function getGameMission(number: GameMissionNumber) {
  return gameMissions.find((mission) => mission.number === number)!;
}

export function getNextGameMission(number: GameMissionNumber) {
  const index = gameMissions.findIndex((mission) => mission.number === number);
  return gameMissions[index + 1];
}
