import { test, expect, type Page } from "@playwright/test";
const base = {
  id: "7acd9264-b8c4-4e2d-ac1c-0df3880ac145",
  customerId: "fixture-customer",
  outletId: "main",
  lines: [
    {
      sku: "meal",
      name: "Vegetarian breakfast",
      quantity: 2,
      addons: [],
      instructions: "Less chilli, please",
      unitPricePaise: 6000,
      addOnPaise: 0,
    },
  ],
  subtotalPaise: 12000,
  deliveryFeePaise: 0,
  rewardUsedPaise: 0,
  totalPaise: 12000,
  fulfilment: "pickup",
  status: "placed",
  payment: "COD",
  paymentStatus: "due",
  createdAt: "2030-01-01T06:30:00Z",
  updatedAt: "2030-01-01T06:30:00Z",
};
async function mock(page: Page, initial: Record<string, unknown>) {
  let order = { ...base, ...initial };
  const actions: any[] = [];
  await page.route("https://api.brekmate.test/**", async (r) => {
    const req = r.request();
    if (req.method() === "OPTIONS") {
      await r.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PUT,DELETE",
          "access-control-allow-headers":
            "authorization,content-type,idempotency-key",
        },
      });
      return;
    }
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      actions.push({
        url: req.url(),
        body,
        key: req.headers()["idempotency-key"],
      });
      if (req.url().endsWith("/status"))
        order = { ...order, status: body.status };
      if (req.url().endsWith("/collection"))
        order = { ...order, paymentStatus: "collected" };
      await r.fulfill({
        json: order,
        headers: { "access-control-allow-origin": "*" },
      });
    } else
      await r.fulfill({
        json: { items: [order] },
        headers: { "access-control-allow-origin": "*" },
      });
  });
  return actions;
}
test("manager can accept an order, kitchen action follows server state", async ({
  page,
}) => {
  const actions = await mock(page, {});
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/test/browser.html");
  await expect(
    page.getByRole("button", { name: "Accept order" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/staff-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Accept order" }).click();
  await expect(
    page.getByRole("button", { name: "Start preparing" }),
  ).toBeVisible();
  expect(actions[0].body).toEqual({ status: "accepted" });
  expect(actions[0].key).toBeTruthy();
});
test("rider handoff requires a six-digit code and cash is recorded separately", async ({
  page,
}) => {
  const actions = await mock(page, {
    status: "out_for_delivery",
    fulfilment: "delivery",
    riderId: "rider-1",
    address: {
      line: "Synthetic fixture office, Gurugram",
      latitude: 28.45,
      longitude: 77.02,
    },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test/browser.html?role=rider");
  const handoff = page.getByRole("button", { name: "Complete handoff" });
  await expect(handoff).toBeDisabled();
  await page.getByLabel("Customer delivery code").fill("123456");
  await expect(handoff).toBeEnabled();
  await page.screenshot({ path: "artifacts/rider-mobile.png", fullPage: true });
  await handoff.click();

  await expect(
    page.getByRole("button", { name: /Record cash collection/ }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Record cash collection/ }).click();
  await expect(
    page.getByRole("button", { name: /Record cash collection/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "delivered", exact: true }).click();
  await expect(page.getByText("COD · collected")).toBeVisible();
  expect(actions.at(-1).body).toEqual({ amountPaise: 12000 });
  expect(
    await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBe(true);
});
test("rider navigation excludes manager controls", async ({ page }) => {
  await mock(page, {
    status: "ready",
    fulfilment: "delivery",
    riderId: "rider-1",
  });
  await page.goto("/test/browser.html?role=rider");
  await expect(page.getByRole("button", { name: "Menu & stock" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Outlet settings" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Deliveries", exact: true }),
  ).toBeVisible();
});

test("unpaid handoffs stay visible in default queue and Cash due filter", async ({
  page,
}) => {
  await mock(page, { status: "delivered", paymentStatus: "due" });
  await page.goto("/test/browser.html");
  await expect(
    page.getByRole("button", { name: /Record cash collection/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cash due", exact: true }).click();
  await expect(
    page.getByText("Handoff complete — cash still needs to be recorded."),
  ).toBeVisible();
});
