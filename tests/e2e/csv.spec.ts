import { expect, test } from "./fixtures";
import { ADMIN_STATE } from "./clerk-users";

test.use({ storageState: ADMIN_STATE });

const ROOM = `ZZ-E2E-${Date.now().toString(36).toUpperCase()}`;

test("CSV: invalid rows are reported with line numbers and nothing can be committed", async ({ page }) => {
  await page.goto("/admin/import?entity=rooms");
  await page.getByLabel("CSV content").fill("room_id,name,capacity,room_type\nZZ-BAD-1,Bad Hall,abc,THEORY\nZZ-BAD-2,Bad Lab,40,AUDITORIUM\n");
  await page.getByRole("button", { name: "Validate (dry run)" }).click();
  await expect(page.getByText("Needs attention: fix the errors")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "INVALID_INTEGER" })).toContainText("2");
  await expect(page.getByRole("row").filter({ hasText: "INVALID_VALUE" })).toContainText("3");
  await expect(page.getByRole("button", { name: /Confirm import/ })).toHaveCount(0);
});

test("CSV: safe fixes show corrected data and row filters work", async ({ page }) => {
  const SUBJECT = `ZZ-E2E-${Date.now().toString(36).toUpperCase()}`;
  await page.goto("/admin/import?entity=subjects");
  await page.getByLabel("CSV content").fill(`subject_id,name,program,semester,duration_hours,requires_lab,fixed_slot,unavailable_slots,enrolled_students\n${SUBJECT},E2E Subject,BBA,1,3,false,,,0\n`);
  await page.getByRole("button", { name: "Validate (dry run)" }).click();
  await page.getByRole("radiogroup", { name: "Filter import rows" }).getByRole("radio", { name: /Problems \(1\)/ }).click();
  await expect(page.getByRole("row").filter({ hasText: "INVALID_VALUE" })).toBeVisible();
  await page.getByRole("button", { name: /Use BCA \(closest match\)/ }).click();

  await expect(page.getByText("Corrected data preview")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: SUBJECT })).toContainText("BCA");
  await page.getByRole("radiogroup", { name: "Filter import rows" }).getByRole("radio", { name: /New \(1\)/ }).click();
  await expect(page.getByRole("row").filter({ hasText: SUBJECT })).toBeVisible();
  await page.getByRole("radiogroup", { name: "Filter import rows" }).getByRole("radio", { name: /Updates \(0\)/ }).click();
  await expect(page.getByText("No rows match this filter.")).toBeVisible();
});

test("CSV: choosing the wrong table automatically keeps the table matching the CSV", async ({ page }) => {
  await page.goto("/admin/import");
  await page.getByLabel("CSV content").fill("subject_id,name,program,semester,duration_hours\nZZ-SELECT-1,Selection test,BCA,1,3\n");
  await page.getByRole("button", { name: "Validate (dry run)" }).click();
  await page.getByRole("radiogroup", { name: "Table to import" }).getByRole("radio", { name: "Time slots" }).click();
  await expect(page.getByRole("radiogroup", { name: "Table to import" }).getByRole("radio", { name: "Subjects" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Dry-run result: Subjects")).toBeVisible();
  await expect(page.getByText(/file has the Subjects columns/)).toBeVisible();
});

test("CSV: skipping the final conflict explains that no rows remain to import", async ({ page }) => {
  await page.goto("/admin/import?entity=rooms");
  await page.getByLabel("CSV content").fill("room_id,name,capacity,room_type\nAB11-103,Existing Hall,70,THEORY\n");
  await page.getByRole("button", { name: "Validate (dry run)" }).click();
  await page.getByRole("button", { name: /Skip this row/ }).click();
  await expect(page.getByText("No rows left to import")).toBeVisible();
  await expect(page.getByText("There are no data rows left in this file.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Confirm import/ })).toHaveCount(0);
});

test("CSV: preview, confirm, verified persistence, export round trip, then cleanup", async ({ page }) => {
  try {
    await page.goto("/admin/import?entity=rooms");
    await page.getByLabel("CSV content").fill(`room_id,name,building,capacity,room_type,unavailable_slots\n${ROOM},E2E Test Hall,,45,THEORY,\n`);
    await page.getByRole("button", { name: "Validate (dry run)" }).click();
    await expect(page.getByText("Ready to import")).toBeVisible();
    await page.getByRole("radiogroup", { name: "Filter import rows" }).getByRole("radio", { name: /New \(1\)/ }).click();
    await expect(page.getByRole("row").filter({ hasText: ROOM })).toBeVisible();
    // Nothing is written by the preview.
    expect((await (await page.request.get(`/api/v1/rooms?search=${ROOM}`)).json()).data.rooms).toHaveLength(0);

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Confirm import/ }).click();
    await expect(page.getByText("Imported and verified")).toBeVisible();

    const rooms = (await (await page.request.get(`/api/v1/rooms?search=${ROOM}`)).json()).data.rooms;
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({ code: ROOM, capacity: 45, roomType: "standard" });

    const exported = await (await page.request.get("/api/v1/data/export?entity=rooms")).json();
    expect(exported.data.csv).toContain(`${ROOM},E2E Test Hall,AB-XI CSED Block,45,THEORY,`);
    const replay = await (await page.request.post("/api/v1/data/import/preview", { data: { entity: "rooms", mode: "upsert", csv: exported.data.csv } })).json();
    expect(replay.data.summary).toMatchObject({ create: 0, update: 0 });
  } finally {
    const removed = await page.request.delete(`/api/v1/rooms/${ROOM}`);
    expect([200, 404]).toContain(removed.status());
  }
  expect((await (await page.request.get(`/api/v1/rooms?search=${ROOM}`)).json()).data.rooms).toHaveLength(0);
});
