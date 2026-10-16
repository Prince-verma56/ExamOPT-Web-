import { expect, test as setup, type Page } from "@playwright/test";
import { ADMIN_STATE, readUsers, STUDENT_STATE, TEST_CODE, type E2EUser } from "./clerk-users";

/** Signs in through the real Clerk sign-in page, including the new-device email code step. */
async function signIn(page: Page, user: E2EUser) {
  await page.goto("/sign-in");
  await page.locator('input[name="identifier"]').fill(user.email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Clerk may ask for an emailed code on a new device; +clerk_test addresses accept the test code.
  const codeStep = page.getByText(/check your email|verification code|enter.*code/i).first();
  const landed = page.waitForURL(/\/(admin|student)/, { timeout: 30_000 });
  const which = await Promise.race([codeStep.waitFor({ timeout: 30_000 }).then(() => "code"), landed.then(() => "landed")]);
  if (which === "code") {
    await page.keyboard.type(TEST_CODE);
    await page.waitForURL(/\/(admin|student)/, { timeout: 30_000 });
  }
}

setup("administrator signs in through Clerk", async ({ page }) => {
  await signIn(page, readUsers().admin);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: /Judge Demo/ }).first()).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});

setup("student signs in through Clerk", async ({ page }) => {
  await signIn(page, readUsers().student);
  await page.context().storageState({ path: STUDENT_STATE });
});
