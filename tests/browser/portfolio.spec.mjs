import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("主要コンテンツ・画像・レイアウトを表示できる", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const pageErrors = [];
  const localRequestErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.hostname === "127.0.0.1" && response.status() >= 400) {
      localRequestErrors.push(`${response.status()} ${responseUrl.pathname}`);
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/札幌のWeb制作・コーディング/);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();

  for (const sectionId of ["hero", "about", "works", "service", "flow", "faq", "contact"]) {
    await expect(page.locator(`#${sectionId}`), `${sectionId} セクション`).toHaveCount(1);
  }

  await page.locator("img").evaluateAll((images) => {
    for (const image of images) {
      image.loading = "eager";
    }
  });

  await page.evaluate(async () => {
    const pause = () => new Promise((resolve) => window.setTimeout(resolve, 40));
    const step = Math.max(window.innerHeight * 0.8, 600);
    for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
      window.scrollTo(0, top);
      await pause();
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await pause();
  });

  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, { timeout: 10_000 });

  const brokenImages = await page.locator("img").evaluateAll((images) => images
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.getAttribute("src")));
  expect(brokenImages, "読み込めない画像").toEqual([]);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow, "横方向の意図しないはみ出し").toBeLessThanOrEqual(1);
  expect(localRequestErrors, "ローカルファイルのHTTPエラー").toEqual([]);
  expect(pageErrors, "ページ内JavaScriptエラー").toEqual([]);

  const visibilitySelectors = [
    ".about .section-body",
    "[data-work-card] h3",
    "[data-service-card] h3",
    "[data-flow-step] h3",
    ".faq-question",
    "#contact-name"
  ];
  const hiddenContent = await page.evaluate((selectors) => selectors.flatMap((selector) => {
    const element = document.querySelector(selector);
    if (!element) return [`${selector}: 要素がありません`];

    const isHidden = (() => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width === 0 || rect.height === 0;
    })();

    return isHidden ? [`${selector}: ${element.outerHTML.slice(0, 160)}`] : [];
  }), visibilitySelectors);
  expect(hiddenContent, "表示されていない主要コンテンツ").toEqual([]);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-hero.png`) });
});

test("スマホの主要セクションを実画面で撮影できる", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "スマホの全ページ撮影をセクション単位で補完する検品です");

  const visualChecks = [
    { name: "about", hash: "about", content: ".about .section-body" },
    { name: "works", hash: "works", content: "[data-work-card] h3" },
    { name: "service", hash: "service", content: "[data-service-card] h3" },
    { name: "flow", hash: "flow", content: "[data-flow-step] h3" },
    { name: "faq", hash: "faq", content: ".faq-question" },
    { name: "contact", hash: "contact", content: "#contact-name" }
  ];

  for (const visualCheck of visualChecks) {
    await page.goto(`/?browser-qa=${visualCheck.name}#${visualCheck.hash}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(visualCheck.content).first(), `${visualCheck.name} の主要コンテンツ`).toBeVisible();
    await page.waitForTimeout(180);
    await page.screenshot({ path: testInfo.outputPath(`mobile-${visualCheck.name}.png`) });
  }
});

test("ナビゲーションとFAQを操作できる", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  if (testInfo.project.name === "mobile") {
    const menuButton = page.locator(".menu-toggle");
    await expect(menuButton).toHaveAccessibleName("メニューを開く");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(menuButton).toHaveAccessibleName("メニューを閉じる");
    await expect(page.locator("#mobile-menu")).toHaveAttribute("aria-hidden", "false");
    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menuButton).toHaveAccessibleName("メニューを開く");
  } else {
    await expect(page.getByRole("navigation", { name: "メインナビゲーション" })).toBeVisible();
  }

  const faq = page.locator("#faq details").first();
  await faq.locator("summary").click();
  await expect(faq).toHaveAttribute("open", "");
});

test("お問い合わせフォームを外部送信せず検証できる", async ({ page }) => {
  await page.route("https://formspree.io/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.locator("#contact-name").fill("ブラウザ検品");
  await page.locator("#contact-email").fill("qa@example.com");
  await page.locator("#contact-message").fill("自動検品のテスト送信です。");
  await page.getByRole("checkbox", { name: /個人情報の取り扱いに同意する/ }).check();
  await page.getByRole("button", { name: /無料で相談する/ }).click();

  await expect(page.locator("[data-form-status]")).toHaveText("送信が完了しました。2営業日以内にご返信いたします。");
});
