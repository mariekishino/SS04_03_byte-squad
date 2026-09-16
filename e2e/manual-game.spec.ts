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
    .getByRole("button", { name: "ゲーム：通信任務に挑戦", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /自分でまとめる/ }),
  ).toBeVisible();
}
async function add(page: Page, count: string, letter: string) {
  await page.getByLabel("個数 1～255", { exact: true }).fill(count);
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill(letter);
  await page.getByRole("button", { name: "組を追加", exact: true }).click();
}
async function send(page: Page, over = false) {
  await page
    .getByRole("button", { name: over ? "予算を超えて試す" : "地球へ送信" })
    .click();
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
}

test("目的説明から直接ゲームに入り、誤答を直してクリアする", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "宇宙の発見を、地球へ届けよう。" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "容量以内に収めて送り、地球で元どおりに戻せたらミッションクリア！",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "カプセルを作る" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
    scale: "css",
  });
  await enter(page);
  await expect(
    page.getByLabel("文字 A～Zの1文字", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("button", { name: "地球へ送信" })).toBeDisabled();
  await add(page, "4", "B");
  await add(page, "2", "B");
  await add(page, "4", "C");
  await page.screenshot({
    path: testInfo.outputPath("game-editing.png"),
    fullPage: true,
    scale: "css",
  });
  await send(page);
  await expect(page.getByRole("heading", { name: "RETRY" })).toBeVisible();
  await expect(
    page.getByText("位置0：元はA、受信した文字はBです。"),
  ).toBeVisible();
  await expect(page.getByText("容量：予算内", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("wrong-letter.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("button", { name: "組を編集して再送" }).click();
  await expect(
    page.getByRole("list", { name: "送信する組の一覧" }).getByRole("listitem"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "組1を編集", exact: true }).click();
  await page.getByLabel("文字 A～Zの1文字", { exact: true }).fill("A");
  await page.getByRole("button", { name: "組の変更を保存" }).click();
  await send(page);
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
  await expect(page.getByText("復元：一致", { exact: true })).toBeVisible();
  await expect(page.getByTestId("size-送信合計")).toHaveText("6 B");
  await page.getByRole("button", { name: "← 前へ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "STAGE CLEAR" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "↺ 再生をリセット" }).click();
  await expect(page.getByRole("list", { name: "受信済みデータ" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await expect(page.getByTestId("game-progress")).toHaveText(
    "ゲーム 1 / 3 CLEAR",
  );
  await expect(
    page.getByRole("button", { name: "チュートリアル：通信の練習" }),
  ).not.toContainText("練習済み");
  expect(errors).toEqual([]);
});

test("不足と余分を示し、容量超過の合法な答えも試せる", async ({ page }) => {
  await enter(page);
  await add(page, "4", "A");
  await send(page);
  await expect(page.getByText("位置4～9の6 Bが不足しています。")).toBeVisible();
  await page.getByRole("button", { name: "組を編集して再送" }).click();
  await add(page, "2", "B");
  await add(page, "5", "C");
  await send(page);
  await expect(
    page.getByText("位置10～10に1 B余分に届いています。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "組を編集して再送" }).click();
  await page
    .getByRole("button", { name: "任務を最初から", exact: true })
    .click();
  await add(page, "2", "A");
  await add(page, "2", "A");
  await add(page, "2", "B");
  await add(page, "4", "C");
  await send(page, true);
  await expect(page.getByText("復元：一致", { exact: true })).toBeVisible();
  await expect(page.getByText("容量：超過", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "組を編集して再送" }).click();
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: "最後の組を取り消す", exact: true })
      .click();
  await page.getByRole("button", { name: "組1を編集", exact: true }).click();
  await page.getByLabel("個数 1～255", { exact: true }).fill("4");
  await page.getByRole("button", { name: "組の変更を保存" }).click();
  await add(page, "2", "B");
  await add(page, "4", "C");
  await send(page);
  await expect(
    page.getByRole("heading", { name: "STAGE CLEAR" }),
  ).toBeVisible();
});

test("入力を補正せず検証し、キーボード・選択欄・タップで組を作れる", async ({
  page,
}, testInfo) => {
  await enter(page);
  const count = page.getByLabel("個数 1～255", { exact: true });
  const letter = page.getByLabel("文字 A～Zの1文字", { exact: true });
  await letter.fill("A");
  for (const invalid of ["0", "256", "1.5"]) {
    await count.fill(invalid);
    await expect(
      page.getByRole("button", { name: "組を追加", exact: true }),
    ).toBeDisabled();
    await expect(count).toHaveValue(invalid);
  }
  await count.fill("4");
  for (const invalid of ["a", "AB", "あ"]) {
    await letter.fill(invalid);
    await expect(
      page.getByRole("button", { name: "組を追加", exact: true }),
    ).toBeDisabled();
    await expect(letter).toHaveValue(invalid);
  }
  await page
    .getByRole("button", { name: "入力を取り消す", exact: true })
    .click();
  const field = page.getByRole("region", {
    name: "ゲームフィールド",
    exact: true,
  });
  await field.focus();
  await page.keyboard.press("ArrowRight");
  await expect(count).toHaveValue("1");
  await count.fill("4");
  await count.press("ArrowLeft");
  await expect(count).toHaveValue("4");
  await page.getByLabel("文字を選ぶ", { exact: true }).selectOption("A");
  const addButton = page.getByRole("button", { name: "組を追加", exact: true });
  if (testInfo.project.name === "mobile-reduced-motion") await addButton.tap();
  else {
    await addButton.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await count.fill("2");
  await expect(page.getByRole("button", { name: "地球へ送信" })).toBeDisabled();
  await page
    .getByRole("button", { name: "入力を取り消す", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "地球へ送信" })).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("下書きと進捗をモード間で分離し、ヒント・豆知識で再生を止める", async ({
  page,
}) => {
  await enter(page);
  await add(page, "4", "A");
  await page.getByLabel("個数 1～255", { exact: true }).fill("2");
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await page
    .getByRole("button", { name: "チュートリアル：通信の練習", exact: true })
    .click();
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await enter(page);
  await page.clock.runFor(5000);
  await expect(page.getByLabel("個数 1～255", { exact: true })).toHaveValue(
    "2",
  );
  await expect(page.getByTestId("size-本体")).toHaveText("2 B");
  await page
    .getByRole("button", { name: "入力を取り消す", exact: true })
    .click();
  await page.getByRole("button", { name: "地球へ送信" }).click();
  await page.clock.runFor(1100);
  await expect(page.getByTestId("step-count")).toHaveText("01 / 7");
  await page.getByText("困ったときのヒント", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeVisible();
  const before = await page.getByTestId("step-count").textContent();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await expect(page.getByText(/先頭のAは4個なので/)).toHaveCount(0);
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  await expect(
    page.getByText(/同じ文字が続いている部分を探そう/),
  ).toBeVisible();
  await expect(page.getByText(/先頭のAは4個なので/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "次のヒントを見る", exact: true })
    .click();
  await page
    .getByRole("button", { name: "次のヒントを見る", exact: true })
    .click();
  await expect(page.getByText(/先頭のAは4個なので/)).toBeVisible();
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByText("通信士の豆知識", { exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await expect(
    page.getByRole("heading", { name: "RLE：ランレングス符号化" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "▶ 自動再生", exact: true }).click();
  await page.getByRole("button", { name: "← ホーム", exact: true }).click();
  await page.clock.runFor(5000);
  await enter(page);
  await expect(page.getByTestId("step-count")).toHaveText(before!);
  await expect(
    page.getByRole("button", { name: "▶ 自動再生", exact: true }),
  ).toBeVisible();
});
