import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "宇宙の発見を、地球へ届けよう。" }),
  ).toBeVisible();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
});

// 各描画後に次のタイマーが予約されるので、表示を確認しながら時計を進める。
async function finishPlayback(page: Page) {
  const nextButton = page.getByRole("button", { name: "次へ →", exact: true });
  for (let i = 0; i < 30 && !(await nextButton.isDisabled()); i++) {
    await page.clock.runFor(1100);
    await page.getByTestId("step-count").textContent();
  }
  await expect(nextButton).toBeDisabled();
}

async function start(page: Page) {
  await page
    .getByRole("button", { name: "チュートリアル：通信の練習" })
    .click();
  await expect(
    page.getByRole("heading", { name: "圧縮のステップ" }),
  ).toBeVisible();
}

async function next(page: Page, count: number) {
  for (let i = 0; i < count; i++)
    await page.getByRole("button", { name: "次へ →", exact: true }).click();
}

test("編隊を圧縮して地球で復元し、6 B・完全一致でクリアする", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.screenshot({
    path: testInfo.outputPath("start.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "チュートリアル：通信の練習" })
    .click();
  await expect(page.getByRole("button", { name: "地球へ送信" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "← 前へ", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("size-本体")).toHaveText("0 B");
  await next(page, 6);
  await expect(page.getByTestId("size-本体")).toHaveText("0 B");
  await next(page, 1);
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await expect(page.getByLabel("組1：個数6、値A、2バイト")).toBeVisible();
  await page.getByRole("button", { name: "← 前へ", exact: true }).click();
  await expect(page.getByTestId("size-本体")).toHaveText("0 B");
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await finishPlayback(page);
  await expect(
    page.getByRole("button", { name: "次へ →", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("size-本体")).toHaveText("6 B");
  await expect(page.getByTestId("size-方式情報")).toHaveText("0 B");
  await page.screenshot({
    path: testInfo.outputPath("encoded.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await expect(
    page.getByRole("heading", { name: "復元のステップ" }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "受信済みデータ" })).toHaveCount(
    0,
  );
  await next(page, 2);
  await expect(
    page.getByRole("list", { name: "受信済みデータ" }).getByRole("listitem"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "← 前へ", exact: true }).click();
  await expect(page.getByRole("list", { name: "受信済みデータ" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await finishPlayback(page);
  await expect(
    page.getByRole("heading", { name: "TRAINING COMPLETE" }),
  ).toBeVisible();
  await expect(page.getByText("復元：一致", { exact: true })).toBeVisible();
  await expect(page.getByText("容量：予算内", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "受信済みデータ" }).getByRole("listitem"),
  ).toHaveCount(12);
  await expect(page.getByTestId("size-送信合計")).toHaveText("6 B");
  await page.screenshot({
    path: testInfo.outputPath("clear.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "← 前へ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "TRAINING COMPLETE" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "↺ 再生をリセット" }).click();
  await expect(page.getByRole("list", { name: "受信済みデータ" })).toHaveCount(
    0,
  );
  await page.clock.runFor(5000);
  await expect(page.getByTestId("step-count")).toHaveText("00 / 19");
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await finishPlayback(page);
  await page
    .getByRole("button", { name: "通信任務に挑戦", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /自分でまとめる/ }),
  ).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByTestId("size-元データ")).toHaveText("10 B");
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 0 / 2 CLEAR",
  );
  await expect(
    page.getByRole("button", { name: "チュートリアル：通信の練習" }),
  ).toContainText("練習済み");
  expect(errors).toEqual([]);
});

test("手動操作・リセット・画面移動が自動再生を停止する", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByTestId("step-count")).toHaveText("01 / 14");
  await page.clock.runFor(1100);
  await expect(page.getByTestId("step-count")).toHaveText("02 / 14");
  await page.getByRole("button", { name: "次へ →", exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText("03 / 14");
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByRole("button", { name: "もう一度練習", exact: true }).click();
  await page.clock.runFor(4000);
  await expect(page.getByTestId("step-count")).toHaveText("00 / 14");
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByText("このステージのヒント", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText("00 / 14");
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await page
    .getByRole("button", { name: "チュートリアル：通信の練習" })
    .click();
  await page.clock.runFor(5000);
  await expect(page.getByTestId("step-count")).toHaveText("00 / 14");
});

test("キーボードと通常ボタンの操作を両立し、画面幅に収まる", async ({
  page,
}, testInfo) => {
  await start(page);
  const field = page.getByRole("region", {
    name: "ゲームフィールド",
    exact: true,
  });
  await field.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("step-count")).toHaveText("01 / 14");
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await page.keyboard.press("Escape");
  await page.clock.runFor(2000);
  await expect(page.getByTestId("step-count")).toHaveText("02 / 14");
  const nextButton = page.getByRole("button", { name: "次へ →", exact: true });
  await nextButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("step-count")).toHaveText("03 / 14");
  await page.keyboard.press("Space");
  await page.clock.runFor(2000);
  await expect(page.getByTestId("step-count")).toHaveText("04 / 14");
  await next(page, 10);
  await field.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "復元のステップ" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  if (testInfo.project.name === "mobile-reduced-motion") {
    await nextButton.tap();
    await expect(page.getByTestId("step-count")).toHaveText("01 / 19");
  }
  for (const name of ["▶ 自動再生", "次へ →", "↺ 再生をリセット"]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
  }
});
