import { expect, test } from "@playwright/test";

test("login page renders the Pancake entry", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "回到拍摄现场" })).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
});

test("signup page renders account creation", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "创建 Pancake 账号" })).toBeVisible();
  await expect(page.getByRole("button", { name: "注册并进入" })).toBeVisible();
});
