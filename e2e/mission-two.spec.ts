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
async function open(page: Page, number: 1 | 2) {
  await page
    .getByRole("button", {
      name: number === 2 ? "任務2：圧縮の逆効果" : "任務1：自分でまとめる",
      exact: true,
    })
    .click();
}
async function add(page: Page, count: string, letter: string) {
  await page.getByLabel("個数 1～255", { exact: true }).fill(count);
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill(letter);
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
}
const home = (page: Page) =>
  page.getByRole("button", { name: "← ホーム", exact: true }).click();

test("任務2のRLE12 Bから無圧縮6 Bへ切り替え、1バイトずつ復元して成功する", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, 2);
  await expect(
    page.getByRole("heading", { name: /圧縮の逆効果/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "RLE（個数と文字）", exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId("size-元データ")).toHaveText("6 B");
  for (const letter of "ABCDEF") await add(page, "1", letter);
  await expect(page.getByTestId("size-本体")).toHaveText("12 B");
  await page.getByRole("button", { name: "予算を超えて試す" }).click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(page.getByRole("heading", { name: "RETRY" })).toBeVisible();
  await expect(page.getByText("復元：一致", { exact: true })).toBeVisible();
  await expect(page.getByText("容量：超過", { exact: true })).toBeVisible();
  await expect(
    page.getByText("本体12 B。上限6 Bを6 B超えています。"),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("rle-over-budget.png"),
    fullPage: true,
    scale: "css",
  });
  const raw = page.getByRole("radio", {
    name: "無圧縮（そのまま送る）",
    exact: true,
  });
  if (testInfo.project.name === "mobile-reduced-motion") await raw.tap();
  else {
    await raw.focus();
    await raw.press("Space");
  }
  await expect(raw).toBeChecked();
  await expect(page.getByRole("heading", { name: "RETRY" })).toHaveCount(0);
  await expect(page.getByTestId("size-本体")).toHaveText("6 B");
  await expect(page.getByTestId("size-方式情報")).toHaveText("0 B");
  await expect(
    page.getByLabel("無圧縮の送信バイト").getByText("1 B", { exact: true }),
  ).toHaveCount(6);
  await expect(page.getByText("COUNT", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.clock.runFor(1100);
  await expect(
    page
      .getByRole("list", { name: "受信済みデータ", exact: true })
      .getByRole("listitem"),
  ).toHaveCount(1);
  await page.getByText("通信士の豆知識", { exact: true }).click();
  const step = await page.getByTestId("step-count").textContent();
  await page.clock.runFor(2500);
  await expect(page.getByTestId("step-count")).toHaveText(step!);
  await page.getByRole("button", { name: "次へ →", exact: true }).click();
  await expect(
    page
      .getByRole("list", { name: "受信済みデータ", exact: true })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
  await expect(
    page.getByText(/全6 Bを受信。今回のデータに合った方法でした/),
  ).toBeVisible();
  await expect(page.getByText("容量：予算内", { exact: true })).toBeVisible();
  await expect(page.getByTestId("size-送信合計")).toHaveText("6 B");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("raw-clear.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("button", { name: "← 前へ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "STAGE CLEAR" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "↺ 再生をリセット" }).click();
  await expect(
    page.getByRole("list", { name: "受信済みデータ", exact: true }),
  ).toHaveCount(0);
  await home(page);
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 1 / 3 CLEAR",
  );
  await expect(
    page.getByRole("button", { name: "任務1：自分でまとめる", exact: true }),
  ).toContainText("READY");
  await expect(
    page.getByRole("button", { name: "任務2：圧縮の逆効果", exact: true }),
  ).toContainText("CLEAR");
  expect(errors).toEqual([]);
});

test("方式・任務の切替で下書きとヒントを保持し、古い再生を止める", async ({
  page,
}) => {
  await open(page, 2);
  await add(page, "4", "Z");
  await page.getByLabel("個数 1～255", { exact: true }).fill("256");
  await page.getByText("困ったときのヒント", { exact: true }).click();
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  await page
    .getByRole("radio", { name: "無圧縮（そのまま送る）", exact: true })
    .check();
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.clock.runFor(1100);
  await page
    .getByRole("radio", { name: "RLE（個数と文字）", exact: true })
    .check();
  await page.clock.runFor(5000);
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue(
    "256",
  );
  await expect(page.getByTestId("step-count")).toHaveCount(0);
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await expect(page.getByRole("button", { name: "地球へ送信" })).toBeDisabled();
  await home(page);
  await open(page, 1);
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue("");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("B");
  await page.getByText("困ったときのヒント", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ヒントを見る", exact: true }),
  ).toBeVisible();
  await home(page);
  await open(page, 2);
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue(
    "256",
  );
  await page.getByText("困ったときのヒント", { exact: true }).click();
  await expect(page.getByText(/隣り合う文字を見よう/)).toBeVisible();
  await expect(page.getByText(/同じ文字が続いている部分を探そう/)).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "次のヒントを見る", exact: true })
    .click();
  await page
    .getByRole("button", { name: "次のヒントを見る", exact: true })
    .click();
  await expect(page.getByText(/無圧縮なら個数を付けず/)).toBeVisible();
  await page
    .getByRole("radio", { name: "無圧縮（そのまま送る）", exact: true })
    .check();
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.clock.runFor(1100);
  const step = await page.getByTestId("step-count").textContent();
  await home(page);
  await open(page, 1);
  await page.clock.runFor(5000);
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("B");
  await home(page);
  await open(page, 2);
  await expect(page.getByTestId("step-count")).toHaveText(step!);
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeVisible();
});

test("任務1のクリアから任務2に進み、別々にクリアを記録する", async ({
  page,
}) => {
  await open(page, 1);
  await add(page, "4", "A");
  await add(page, "2", "B");
  await add(page, "4", "C");
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await page
    .getByRole("button", { name: "任務2へ：圧縮の逆効果", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /圧縮の逆効果/ }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "無圧縮（そのまま送る）", exact: true })
    .check();
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "もう一度挑戦", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "RLE（個数と文字）", exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId("size-本体")).toHaveText("0 B");
  await expect(page.getByTestId("size-元データ")).toHaveText("6 B");
  await home(page);
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 2 / 3 CLEAR",
  );
  await expect(
    page.getByRole("button", {
      name: "チュートリアル：通信の練習",
      exact: true,
    }),
  ).not.toContainText("練習済み");
});
