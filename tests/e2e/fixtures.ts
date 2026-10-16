import { test as base, expect } from "@playwright/test";

/**
 * Every test fails on an uncaught page error or a console error (for example
 * a React hydration error), not only on its own assertions. Expected HTTP
 * refusals that a test provokes on purpose are logged by the server, not the page.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [async ({ page }, use) => {
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      // The browser reports refused requests the test makes deliberately (403/404) as console errors.
      if (/Failed to load resource: the server responded with a status of (401|403|404)/.test(text)) return;
      problems.push(`console.error: ${text.slice(0, 300)}`);
    });
    await use();
    expect(problems, problems.join("\n")).toEqual([]);
  }, { auto: true }],
});

export { expect };
