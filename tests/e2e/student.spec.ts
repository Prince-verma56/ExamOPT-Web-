import { expect, test } from "./fixtures";
import { STUDENT_STATE } from "./clerk-users";

test.use({ storageState: STUDENT_STATE });

test("a student sees their own published timetable", async ({ page }) => {
  await page.goto("/student");
  await expect(page.getByText("GLA26-BCA-0001").first()).toBeVisible();
  const own = await (await page.request.get("/api/v1/timetable/student")).json();
  expect(own.data.student.rollNo).toBe("GLA26-BCA-0001");
});

test("a student cannot reach the admin workspace, the Demo Studio API, imports or another student's timetable", async ({ page }) => {
  await page.goto("/admin/demo-studio");
  await expect(page).not.toHaveURL(/\/admin/);
  expect((await page.request.get("/api/v1/scheduling/demo/dataset?source=live")).status()).toBe(403);
  expect((await page.request.post("/api/v1/data/import/preview", { data: { entity: "rooms", mode: "insert", csv: "room_id,name,capacity,room_type\nX,Y,1,THEORY\n" } })).status()).toBe(403);
  expect((await page.request.get("/api/v1/timetable/student?rollNo=GLA26-BCA-0002")).status()).toBe(403);
});
