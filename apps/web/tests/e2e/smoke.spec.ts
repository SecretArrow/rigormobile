import { test, expect } from "@playwright/test";

/**
 * Smoke test: the home page renders all three primary tabs and the dashboard
 * shows the RigorChain network constants.
 */
test.describe("RigorMobile web app", () => {
  test("dashboard renders network constants", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    // Network constants card should mention RIGOR
    await expect(page.getByText("Chain").first()).toBeVisible();
    await expect(page.getByText("RIGOR", { exact: false })).toBeVisible();
    // Mining pipeline should mention the PoW tag
    await expect(page.getByText("RGRPOW01", { exact: false })).toBeVisible();
  });

  test("miner tab shows the start button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Miner" }).click();
    await expect(page.getByRole("heading", { name: "Miner" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Start mining/i }),
    ).toBeVisible();
  });

  test("wallet tab shows create / import options", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Wallet" }).click();
    await expect(page.getByRole("heading", { name: "Wallet" })).toBeVisible();
    await expect(page.getByText(/New|Import|Unlock/i).first()).toBeVisible();
  });

  test("API /api returns network info JSON", async ({ request }) => {
    const res = await request.get("/api");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.chain.name).toBe("RIGOR");
    expect(body.pow.tag).toBe("RGRPOW01");
  });

  test("footer links to GitHub repo", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "SecretArrow/rigormobile" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      "https://github.com/SecretArrow/rigormobile",
    );
  });
});
