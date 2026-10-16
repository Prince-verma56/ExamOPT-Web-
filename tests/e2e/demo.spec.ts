import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { ADMIN_STATE } from "./clerk-users";

test.use({ storageState: ADMIN_STATE });

/** Screenshots for human review go to SHOTS_DIR when set. */
async function shot(page: Page, name: string) {
  if (process.env.SHOTS_DIR) await page.screenshot({ path: path.join(process.env.SHOTS_DIR, `${name}.png`), fullPage: false });
}

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true }).click();

test("guided demo: dataset to corrected, revalidated candidate, with the published timetable untouched", async ({ page }) => {
  const before = await (await page.request.get("/api/v1/scheduling/published")).json();

  await page.goto("/admin/demo-studio?guided=1&step=0");
  await expect(page.getByRole("heading", { name: "Meet the dataset" })).toBeVisible();
  await expect(page.getByText("What you are seeing")).toBeVisible();
  await expect(page.getByText("Examinations", { exact: true })).toBeVisible();
  await shot(page, "01-dataset");

  await next(page);
  await expect(page.getByRole("heading", { name: "Understand the conflict graph" })).toBeVisible();
  await expect(page.getByRole("group", { name: /examinations and \d+ shared-student relationships/ })).toBeVisible();
  await page.getByRole("button", { name: /^BCA-101,/ }).click();
  await expect(page.getByRole("heading", { name: "Shares students with" })).toBeVisible();
  await shot(page, "02-graph");

  await next(page);
  await page.getByRole("button", { name: "Run all strategies" }).click();
  await expect(page.getByText(/\/24 placed|\/\d+ placed/).first()).toBeVisible();
  await expect(page.getByText("First-Fit").first()).toBeVisible();
  // Trace controls on real recorded events.
  await expect(page.getByText(/Event 1 \/ \d+/)).toBeVisible();
  await page.getByRole("button", { name: "Step forward" }).click();
  await expect(page.getByText(/Event 2 \/ \d+/)).toBeVisible();
  await page.getByRole("button", { name: "Step backward" }).click();
  await expect(page.getByText(/Event 1 \/ \d+/)).toBeVisible();
  // Backtracking placed every exam without a dead end on this data, so its trace has no rejection; First-Fit's does.
  await page.getByRole("button", { name: "First-Fit", exact: true }).click();
  await page.getByRole("button", { name: "Next rejection" }).click();
  await expect(page.getByText(/Rejected|Forward check failed|Backtrack|Unscheduled/).first()).toBeVisible();
  await page.getByRole("radio", { name: "Conflict graph" }).click();
  await shot(page, "03-arena-trace");

  await next(page);
  await page.getByRole("button", { name: "Inject conflict" }).click();
  await expect(page.getByText(/was moved into/).first()).toBeVisible();
  await shot(page, "04-injected");

  await next(page);
  await expect(page.getByText(/Rule 2: No student sits overlapping examinations/)).toBeVisible();
  await expect(page.getByText("STUDENT_OVERLAP").first()).toBeVisible();
  await shot(page, "05-validator");

  await next(page);
  await page.getByRole("button", { name: "Apply and revalidate" }).click();
  await expect(page.getByText(/Re-placed only the tampered exam/)).toBeVisible();
  await shot(page, "06-correction");

  await next(page);
  await expect(page.getByText(/Violations\s*1\s*to\s*0/)).toBeVisible();
  await shot(page, "07-revalidated");

  await next(page);
  await expect(page.getByText("Published schedule", { exact: true })).toBeVisible();
  await expect(page.getByText(/is active and unchanged/)).toBeVisible();
  await shot(page, "08-publication");

  // Navigating back keeps the results; reset clears them.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText(/Violations\s*1\s*to\s*0/)).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("heading", { name: "Meet the dataset" })).toBeVisible();

  const after = await (await page.request.get("/api/v1/scheduling/published")).json();
  expect(after.data.publication).toEqual(before.data.publication);
  expect(after.data.assignments.map((a: { id: string }) => a.id)).toEqual(before.data.assignments.map((a: { id: string }) => a.id));
});

test("explore mode: scenario H proves a bottleneck before solving, unlike a search limit", async ({ page }) => {
  await page.goto("/admin/demo-studio?tab=simulator");
  await page.getByRole("radio", { name: /Scenario H/ }).click();
  await page.getByRole("button", { name: "Run the bottleneck scenario" }).click();
  await expect(page.getByText("STUDENT_CONFLICT_BOTTLENECK").first()).toBeVisible();
  await expect(page.getByText("proves infeasibility").first()).toBeVisible();
  await expect(page.getByText(/says nothing about whether a timetable exists/)).toBeVisible();
  await shot(page, "09-scenario-h");
});

test("explore mode: backlog scenario B shows a cross-cohort overlap", async ({ page }) => {
  await page.goto("/admin/demo-studio?tab=simulator&source=fixture");
  await page.getByRole("radio", { name: /Scenario B/ }).click();
  await page.getByRole("button", { name: "Inject conflict" }).click();
  await expect(page.getByText(/through a backlog or bridge enrollment/)).toBeVisible();
  await expect(page.getByText("STUDENT_OVERLAP").first()).toBeVisible();
});
