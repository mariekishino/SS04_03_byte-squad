/** 第2段階ではミッション1のみ。次の段階で他の操作タイプを追加する。 */
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
  title: "自分でまとめる",
  input: "AAAABBCCCC",
  budget: 6,
  request: "次の観測データは6 Bまで。個数と文字でカプセルを作ろう。",
  response: "全10 Bを復元。編隊の情報が届きました！",
} as const;
