import { test, expect } from "@playwright/test";

test("competitor analysis happy path through export", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-task").click();
  await expect(page).toHaveURL(/\/projects\/new/);

  await page.getByPlaceholder("例如：智能记账App竞品分析").fill("智能协作套件竞品分析");
  await page.getByPlaceholder("输入你要研究的产品、公司或行业").fill("飞书");
  await page.getByTestId("submit-objective").click();

  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("checkbox").check();
  await page.getByTestId("mock-login").click();

  await expect(page).toHaveURL(/\/projects\/new/);
  await page.getByTestId("submit-objective").click();

  await expect(page).toHaveURL(/\/projects\/.+\/plan/);
  await page.getByTestId("plan-ready").waitFor({ timeout: 60_000 });
  await page.getByTestId("confirm-plan").click();

  await expect(page).toHaveURL(/\/competitors/);
  await page.getByTestId("confirm-competitors").waitFor({ timeout: 60_000 });
  await page.getByTestId("confirm-competitors").click();

  await expect(page).toHaveURL(/\/sources/);
  await page.getByTestId("continue-sources").waitFor({ timeout: 90_000 });
  await expect(page.getByTestId("continue-sources")).toBeEnabled({ timeout: 90_000 });
  await page.getByTestId("continue-sources").click();

  await expect(page).toHaveURL(/\/dimensions/);
  await page.getByTestId("confirm-dimensions").waitFor({ timeout: 60_000 });
  await page.getByTestId("confirm-dimensions").click();

  await expect(page).toHaveURL(/\/matrix/);
  await page.getByRole("link", { name: /判断/ }).first().click();

  await expect(page).toHaveURL(/\/decisions/);
  await page.getByTestId("submit-judgments").waitFor({ timeout: 90_000 });
  const areas = page.locator("textarea");
  const count = await areas.count();
  for (let i = 0; i < count; i++) {
    await areas.nth(i).fill(`这是第${i + 1}条用户确认过的核心判断，内容足够十个字符。`);
  }
  await page.getByTestId("submit-judgments").click();

  await expect(page).toHaveURL(/\/preview/);
  await page.getByTestId("pay-standard").waitFor({ timeout: 90_000 });
  await page.getByTestId("pay-standard").click();

  await expect(page).toHaveURL(/\/report/, { timeout: 60_000 });

  await page.getByTestId("open-citations").click();
  await expect(page.getByTestId("citation-drawer")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByTestId("citation-drawer")).toBeHidden();

  await page.getByTestId("export-pdf").click();
  // Soft-gate dialog appears after POST returns QUALITY_WARNING (async after "正在生成…")
  const force = page.getByTestId("export-force-confirm");
  if (
    await force
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await force.click();
  }
  await expect(page.getByText(/导出完成|正在生成/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("导出完成")).toBeVisible({ timeout: 45_000 });
});
