import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "宇宙の発見を、地球へ届けよう。" }),
  ).toBeVisible();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
});
async function enter(page: Page) {
  await page
    .getByRole("button", { name: "任務3：復元機を修理する", exact: true })
    .click();
}
async function result(page: Page, over = false) {
  await page
    .getByRole("button", { name: over ? "予算を超えて試す" : "地球へ送信" })
    .click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
}
async function add(page: Page, count: string, letter: string) {
  await page.getByLabel("個数 1～255", { exact: true }).fill(count);
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill(letter);
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
}
const home = (page: Page) =>
  page.getByRole("button", { name: "← ホーム", exact: true }).click();
const edit = (page: Page) =>
  page.getByRole("button", { name: "組を編集して再送", exact: true }).click();

test("任務3の不足を送信で調べ、誤った修理を直してクリアする", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enter(page);
  await expect(
    page.getByRole("heading", { name: "カプセルを修理する", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await expect(page.getByTestId("size-元データ")).toHaveText("6 B");
  await expect(page.getByTestId("size-上限")).toHaveText("4 B");
  await expect(
    page.getByRole("list", { name: "送信する組の一覧" }).getByRole("listitem"),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("");
  await result(page);
  await expect(page.getByText("位置4～5の2 Bが不足しています。")).toBeVisible();
  await expect(page.getByText("容量：予算内", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RETRY" })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("missing-tail.png"),
    fullPage: true,
    scale: "css",
  });
  await edit(page);
  await add(page, "2", "C");
  await result(page);
  await expect(
    page.getByText("位置4：元はB、受信した文字はCです。"),
  ).toBeVisible();
  await edit(page);
  await page.getByRole("button", { name: "組2を編集", exact: true }).click();
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("B");
  const save = page.getByRole("button", {
    name: "組の変更を保存",
    exact: true,
  });
  if (testInfo.project.name === "mobile-reduced-motion") await save.tap();
  else {
    await save.focus();
    await save.press("Enter");
  }
  await result(page);
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
  await expect(
    page.getByText(/末尾のBを2個確認。全データがそろいました/),
  ).toBeVisible();
  await expect(page.getByTestId("size-送信合計")).toHaveText("4 B");
  await expect(
    page.getByRole("list", { name: "受信済みデータ" }).getByRole("listitem"),
  ).toHaveCount(6);
  await expect(page.getByRole("button", { name: /任務4へ/ })).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("repair-clear.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("button", { name: "もう一度挑戦", exact: true }).click();
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await result(page);
  await expect(page.getByText("位置4～5の2 Bが不足しています。")).toBeVisible();
  await home(page);
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 1 / 4 CLEAR",
  );
  await expect(
    page.getByRole("button", { name: "任務3：復元機を修理する", exact: true }),
  ).toContainText("CLEAR");
  await expect(
    page.getByRole("button", { name: "任務2：圧縮の逆効果", exact: true }),
  ).toContainText("READY");
  expect(errors).toEqual([]);
});

test("余分と容量超過から修正でき、再開・ヒント・下書きを任務別に保持する", async ({
  page,
}) => {
  await enter(page);
  await add(page, "3", "B");
  await result(page);
  await expect(
    page.getByText("位置6～6に1 B余分に届いています。"),
  ).toBeVisible();
  await edit(page);
  await page
    .getByRole("button", { name: "最後の組を取り消す", exact: true })
    .click();
  await add(page, "1", "B");
  await add(page, "1", "B");
  await result(page, true);
  await expect(page.getByText("復元：一致", { exact: true })).toBeVisible();
  await expect(page.getByText("容量：超過", { exact: true })).toBeVisible();
  await edit(page);
  await page
    .getByRole("button", { name: "任務を最初から", exact: true })
    .click();
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.clock.runFor(1100);
  await page.getByText("困ったときのヒント", { exact: true }).click();
  const before = await page.getByTestId("step-count").textContent();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  await page
    .getByRole("button", { name: "次のヒントを見る", exact: true })
    .click();
  await expect(
    page.getByText(/入力終了時にも、最後のまとまりを組として出力/),
  ).toBeVisible();
  await expect(page.getByText(/今ある\(4,A\)の後ろに\(2,B\)/)).toHaveCount(0);
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await home(page);
  await page.clock.runFor(5000);
  await enter(page);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeVisible();
  await edit(page);
  await page.getByLabel("個数 1～255", { exact: true }).fill("2");
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("B");
  await home(page);
  await page
    .getByRole("button", { name: "任務1：自分でまとめる", exact: true })
    .click();
  await expect(page.getByTestId("size-本体")).toHaveText("0 B");
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("");
  await home(page);
  await enter(page);
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue(
    "2",
  );
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("B");
  await page.getByText("困ったときのヒント", { exact: true }).click();
  await expect(
    page.getByText(/入力終了時にも、最後のまとまりを組として出力/),
  ).toBeVisible();
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
  await result(page);
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
});

test("任務2クリア後から任務3の欠損教材へ進める", async ({ page }) => {
  await page
    .getByRole("button", { name: "任務2：圧縮の逆効果", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "無圧縮（そのまま送る）", exact: true })
    .check();
  await result(page);
  await page
    .getByRole("button", { name: "任務3へ：復元機を修理する", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "カプセルを修理する", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await home(page);
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 1 / 4 CLEAR",
  );
  await expect(
    page.getByRole("button", { name: "任務2：圧縮の逆効果", exact: true }),
  ).toContainText("CLEAR");
  await expect(
    page.getByRole("button", { name: "任務3：復元機を修理する", exact: true }),
  ).toContainText("READY");
});
