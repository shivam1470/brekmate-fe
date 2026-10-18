import { it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Catalogue } from "../apps/staff/src/Management";
import { ApiClient } from "../packages/core/src/index";
afterEach(cleanup);
it("staff catalogue preserves the loaded revision and displays a concurrent edit error", async () => {
  const p = {
    sku: "meal",
    name: "Vegetarian meal",
    category: "Meals",
    pricePaise: 12000,
    stock: 2,
    available: true,
    vegetarian: true,
    addons: {},
    revision: 7,
  };
  const send = vi.fn(
    async (_: any, init?: RequestInit) =>
      new Response(
        JSON.stringify(
          init?.method === "PUT"
            ? { error: "product_changed" }
            : { items: [p] },
        ),
        { status: init?.method === "PUT" ? 409 : 200 },
      ),
  );
  const api = new ApiClient(
    "https://api.example.test",
    async () => "fixture-access",
    send,
  );
  render(<Catalogue api={api} />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Edit Vegetarian meal" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Save product" }));
  await screen.findByText(/stock changed/);
  const request = send.mock.calls.find((c) => c[1]?.method === "PUT")!;
  expect(JSON.parse(request[1]!.body as string).expectedVersion).toBe(7);
  expect(screen.getByRole("region", { name: "Product editor" })).toBeTruthy();
});
