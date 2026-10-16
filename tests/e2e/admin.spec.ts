import { expect, test } from "./fixtures";
import { ADMIN_STATE } from "./clerk-users";

test.use({ storageState: ADMIN_STATE });

test("administrator navigates the workspace from the sidebar", async ({ page }) => {
  await page.goto("/admin");
  for (const [link, heading] of [["Subjects & Exams", /Subjects/], ["Rooms & Labs", /Rooms/], ["Time Slots", /time slots/i], ["Conflict Analysis", /Conflict Analysis/], ["Optimization Lab", /Optimization/]] as const) {
    await page.getByRole("link", { name: link, exact: true }).first().click();
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
  }
});

test("subjects show the laboratory requirement as Required / Not required", async ({ page }) => {
  await page.goto("/admin/data/subjects");
  const lab = page.getByRole("row").filter({ hasText: "BCA-104P" });
  await expect(lab.getByText("Required", { exact: true })).toBeVisible();
  const theory = page.getByRole("row").filter({ hasText: "BCA-101" }).first();
  await expect(theory.getByText("Not required")).toBeVisible();
  await expect(page.getByText("Inactive")).toHaveCount(0);
});

test("students and enrollments are retrieved from the database", async ({ page }) => {
  await page.goto("/admin/data/students");
  await expect(page.getByText("GLA26-BCA-0001").first()).toBeVisible();
});

test("an administrator can open a run's publication eligibility in the Timetable", async ({ page }) => {
  await page.goto("/admin/schedules");
  await expect(page.getByText(/Validation details|publish|Publish/).first()).toBeVisible();
});

test("the CSV export menu opens on the Timetable and Import pages", async ({ page }) => {
  for (const route of ["/admin/schedules", "/admin/import"]) {
    await page.goto(route);
    await page.getByRole("button", { name: "Export CSV" }).first().click();
    await expect(page.getByRole("menuitem", { name: /Room allocation/ })).toBeVisible();
    await page.keyboard.press("Escape");
  }
});
