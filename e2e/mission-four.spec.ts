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
    .getByRole("button", { name: "任務4：見えない1バイト", exact: true })
    .click();
}
async function add(page: Page, count: string, letter: string) {
  await page.getByLabel("個数 1～255", { exact: true }).fill(count);
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill(letter);
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
}

test("本体6 Bと方式1 Bを送り、地球が方式を読んでから12 Bへ復元する", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await expect(page.getByTestId("size-本体")).toHaveText("0 B");
  await expect(page.getByTestId("size-方式情報")).toHaveText("1 B");
  await expect(page.getByTestId("size-送信合計")).toHaveText("1 B");
  await expect(page.getByRole("button", { name: "地球へ送信" })).toBeDisabled();
  await add(page, "6", "A");
  await add(page, "4", "B");
  await add(page, "2", "C");
  await expect(page.getByTestId("size-本体")).toHaveText("6 B");
  await expect(page.getByTestId("size-送信合計")).toHaveText("7 B");
  await expect(
    page.getByLabel("方式情報：1、RLE、1バイト", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/この1 Bはゲーム独自の形式です/)).toBeVisible();
  const send = page.getByRole("button", { name: "地球へ送信" });
  if (info.project.name === "mobile-reduced-motion") await send.tap();
  else {
    await send.focus();
    await send.press("Enter");
  }
  await expect(page.getByRole("status")).toContainText(
    "先頭の方式情報1を読み取り、RLEで復元します",
  );
  await expect(page.getByRole("list", { name: "受信済みデータ" })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: info.outputPath("read-method.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("button", { name: "次へ →", exact: true }).click();
  await page.getByRole("button", { name: "← 前へ", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("先頭の方式情報1");
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText("00 / 20");
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "受信済みデータ" }).getByRole("listitem"),
  ).toHaveCount(12);
  await expect(page.getByText("7 Bを送り、12 Bを復元しました。")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "RLEの振り返り" }),
  ).toContainText("ABCABCABC");
  await expect(page.getByRole("button", { name: /任務5へ/ })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: info.outputPath("clear.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("button", { name: "もう一度挑戦", exact: true }).click();
  await expect(page.getByTestId("size-送信合計")).toHaveText("1 B");
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 1 / 4 CLEAR",
  );
  await expect(
    page.getByRole("button", { name: "任務4：見えない1バイト", exact: true }),
  ).toContainText("CLEAR");
  expect(errors).toEqual([]);
});

test("無圧縮13 Bの超過からRLEへ修正し、方式切替と任務移動で下書きを保持する", async ({
  page,
}, info) => {
  await enter(page);
  await add(page, "6", "A");
  await page.getByLabel("個数 1～255", { exact: true }).fill("4");
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("B");
  await page
    .getByRole("radio", { name: "無圧縮（そのまま送る）", exact: true })
    .check();
  await expect(page.getByTestId("size-本体")).toHaveText("12 B");
  await expect(page.getByTestId("size-送信合計")).toHaveText("13 B");
  await page.getByRole("button", { name: "予算を超えて試す" }).click();
  await expect(page.getByRole("status")).toContainText(
    "先頭の方式情報0を読み取り、無圧縮で復元します",
  );
  await page.getByRole("button", { name: "次へ →", exact: true }).click();
  await page.getByRole("button", { name: "次へ →", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "受信済みデータ" }).getByRole("listitem"),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("位置0：値A、1バイト", { exact: true }),
  ).toHaveClass(/active/);
  await expect(
    page.getByLabel("位置1：値A、1バイト", { exact: true }),
  ).not.toHaveClass(/active/);
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(page.getByText("復元：一致", { exact: true })).toBeVisible();
  await expect(
    page.getByText("送信合計13 B。上限7 Bを6 B超えています。"),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("raw-over-budget.png"),
    fullPage: true,
    scale: "css",
  });
  await page
    .getByRole("radio", { name: "RLE（個数と文字）", exact: true })
    .check();
  await expect(page.getByRole("heading", { name: "RETRY" })).toHaveCount(0);
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue(
    "4",
  );
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await page
    .getByRole("button", { name: "任務3：復元機を修理する", exact: true })
    .click();
  await expect(page.getByTestId("size-方式情報")).toHaveText("0 B");
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await enter(page);
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("B");
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
  await add(page, "2", "C");
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.getByText("困ったときのヒント", { exact: true }).click();
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText("00 / 20");
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
});

test("任務3から任務4に進み、誤答も方式込みで送って直せる", async ({ page }) => {
  await page
    .getByRole("button", { name: "任務3：復元機を修理する", exact: true })
    .click();
  await add(page, "2", "B");
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await page
    .getByRole("button", { name: "任務4へ：見えない1バイト", exact: true })
    .click();
  await add(page, "6", "B");
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(
    page.getByText("位置0：元はA、受信した文字はBです。"),
  ).toBeVisible();
  await expect(page.getByTestId("size-送信合計")).toHaveText("3 B");
  await page
    .getByRole("button", { name: "組を編集して再送", exact: true })
    .click();
  await page.getByRole("button", { name: "組1を編集", exact: true }).click();
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("A");
  await page
    .getByRole("button", { name: "組の変更を保存", exact: true })
    .click();
  await add(page, "4", "B");
  await add(page, "2", "C");
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 2 / 4 CLEAR",
  );
});
