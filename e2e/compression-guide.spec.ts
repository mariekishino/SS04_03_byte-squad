import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "宇宙の発見を、地球へ届けよう。" }),
  ).toBeVisible();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
});

test("ホームの解説をオフラインで読み、キーボードとタップで歴史を開ける", async ({
  page,
  context,
}, testInfo) => {
  await context.setOffline(true);
  const summary = page.getByText("通信士の豆知識", { exact: true });
  if (testInfo.project.name === "mobile-reduced-motion") await summary.tap();
  else {
    await summary.focus();
    await summary.press("Enter");
  }
  await page.getByText("なぜ最初にRLEを学ぶの？", { exact: true }).click();
  await expect(page.getByText(/これは本ゲームの学習順です/)).toBeVisible();
  await page.getByText("RLEはどんな位置づけの技術？", { exact: true }).click();
  await expect(
    page.getByText(/RLEの発明年を示すものではありません/),
  ).toBeVisible();
  await page.getByText("圧縮技術の歴史をたどる", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "DEFLATE：工夫を組み合わせる" }),
  ).toBeVisible();
  await expect(page.locator(".compression-timeline > li")).toHaveCount(5);
  const sources = page.locator(".compression-timeline a");
  for (const source of await sources.all()) {
    await expect(source).toHaveAttribute("href", /^https:\/\//);
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("rel", "noopener noreferrer");
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page
    .locator(".home-guide")
    .screenshot({
      path: testInfo.outputPath("compression-guide.png"),
      scale: "css",
    });
  await page
    .getByRole("button", { name: "チュートリアル：通信の練習", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "ゲームフィールド", exact: true }),
  ).toBeVisible();
});

test("チュートリアルとゲームで記事を開くと停止し、入力・再生位置を保つ", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "チュートリアル：通信の練習", exact: true })
    .click();
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByText("通信士の豆知識", { exact: true }).click();
  const before = await page.getByTestId("step-count").textContent();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByText("圧縮技術の歴史をたどる", { exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await page
    .getByRole("button", { name: "任務1：自分でまとめる", exact: true })
    .click();
  await page.getByLabel("個数 1～255", { exact: true }).fill("4");
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("A");
  await page.getByText("通信士の豆知識", { exact: true }).click();
  await page.getByText("なぜ最初にRLEを学ぶの？", { exact: true }).click();
  await page.getByText("通信士の豆知識", { exact: true }).click();
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue(
    "4",
  );
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("A");
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.clock.runFor(1100);
  await page.getByText("通信士の豆知識", { exact: true }).click();
  const received = await page.getByTestId("step-count").textContent();
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByText("圧縮技術の歴史をたどる", { exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText(received!);
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
});
