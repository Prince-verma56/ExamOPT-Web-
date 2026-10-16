import path from "node:path";
import { expect, test } from "./fixtures";
import { ADMIN_STATE } from "./clerk-users";

test.use({ storageState: ADMIN_STATE });

const VIEWPORTS = [
  { name: "laptop", width: 1366, height: 768 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  for (const route of ["/admin/demo-studio?guided=1&step=1", "/admin/demo-studio?tab=simulator", "/admin/import"]) {
    test(`${vp.name} ${route}: no horizontal page overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      const { overflow, culprits } = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        // The outermost elements that stick out past the viewport, to make a failure actionable.
        const culprits = [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((el) => el.getBoundingClientRect().right > width + 1 && !(el.parentElement && el.parentElement.getBoundingClientRect().right > width + 1))
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 4).join(".")} right=${Math.round(el.getBoundingClientRect().right)}`);
        return { overflow: document.documentElement.scrollWidth - width, culprits };
      });
      expect(overflow, culprits.join(" | ")).toBeLessThanOrEqual(1);
      if (process.env.SHOTS_DIR) await page.screenshot({ path: path.join(process.env.SHOTS_DIR, `r-${vp.name}-${route.replace(/[^a-z]+/g, "-")}.png`) });
    });
  }
}
