import { test, expect } from "@playwright/test";
test("native menu component preview adds an item and obtains a server quote", async ({
  page,
}) => {
  page.on("pageerror", (e) => console.log("UI_ERROR", e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://api.brekmate.test/**", async (r) => {
    const request = r.request(),
      url = request.url();
    if (request.method() === "OPTIONS") {
      await r.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST",
          "access-control-allow-headers":
            "authorization,content-type,idempotency-key",
        },
      });
      return;
    }
    const data = url.endsWith("/outlet")
      ? { open: true, pickupAddress: "Synthetic fixture café", radiusKm: 3 }
      : url.endsWith("/menu")
        ? {
            items: [
              {
                sku: "poha",
                name: "Fresh poha",
                category: "Breakfast",
                pricePaise: 6000,
                stock: 10,
                available: true,
                vegetarian: true,
                addons: { peanuts: 1000 },
              },
              {
                sku: "chai",
                name: "Masala chai",
                category: "Beverages",
                pricePaise: 3000,
                stock: 10,
                available: true,
                vegetarian: true,
                addons: {},
              },
            ],
          }
        : url.endsWith("/quotes")
          ? {
              subtotalPaise: 6000,
              quoteToken: "fixture-quote-token",
              expiresAt: Math.floor(Date.now() / 1000) + 600,
              deliveryFeePaise: 0,
              rewardUsedPaise: 0,
              totalPaise: 6000,
              quoteToken: "fixture-quote-token",
              expiresAt: Math.floor(Date.now() / 1000) + 600,
            }
          : { items: [] };
    await r.fulfill({
      json: data,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.goto("/test/native-preview.html");
  await expect(page.getByText("Fresh poha", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/customer-menu-preview.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add +", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await page.getByRole("button", { name: "Basket · 1" }).click();
  await expect(page.getByTestId("place-order")).toBeEnabled();
  await expect(page.getByText("Pay in cash")).toBeVisible();
  expect(
    await page.locator("body").evaluate((e) => e.scrollWidth <= innerWidth),
  ).toBe(true);
});
