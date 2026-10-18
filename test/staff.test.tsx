import { it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderCard, Orders } from "../apps/staff/src/Orders";
import { Dashboard } from "../apps/staff/src/Dashboard";
import {
  ApiClient,
  MutationJournal,
  Mutations,
  MemoryVault,
  type Order,
} from "../packages/core/src/index";
afterEach(cleanup);
const order: Order = {
  id: "order-12345678",
  customerId: "c",
  outletId: "main",
  lines: [
    {
      sku: "meal",
      name: "Vegetarian meal",
      quantity: 1,
      addons: [],
      instructions: "",
      unitPricePaise: 12000,
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
  createdAt: "2030-01-01T12:00:00Z",
  updatedAt: "2030-01-01T12:00:00Z",
};
function runtime(rows = [order]) {
  const send = vi.fn(
    async (_: any, init?: RequestInit) =>
      new Response(
        JSON.stringify(init?.method === "GET" ? { items: rows } : order),
      ),
  );
  const api = new ApiClient(
    "https://api.example.test",
    async () => "access",
    send,
  );
  return {
    api,
    send,
    mutations: new Mutations(
      api,
      new MutationJournal(new MemoryVault(), () => "test-stable-key"),
    ),
  };
}
it("manager order acceptance uses API and stable operation key", async () => {
  const r = runtime();
  render(
    <OrderCard
      {...r}
      order={order}
      user={{ id: "manager", roles: ["MANAGER"] }}
      refresh={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Accept order" }));
  await waitFor(() => expect(r.send).toHaveBeenCalled());
  const [url, request] = r.send.mock.calls[0]!;
  expect(url).toContain("/v1/orders/order-12345678/status");
  expect(JSON.parse(request!.body as string)).toEqual({ status: "accepted" });
  expect((request!.headers as any)["Idempotency-Key"]).toBe("test-stable-key");
});
it("kitchen cannot accept, assign or collect", () => {
  const r = runtime();
  render(
    <OrderCard
      {...r}
      order={order}
      user={{ id: "kitchen", roles: ["KITCHEN"] }}
      refresh={vi.fn()}
    />,
  );
  expect(screen.queryByRole("button", { name: "Accept order" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Assign" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Record cash collection" }),
  ).toBeNull();
});
it("cash collection needs explicit receipt confirmation and exact total", async () => {
  const r = runtime();
  render(
    <OrderCard
      {...r}
      order={{ ...order, status: "delivered" }}
      user={{ id: "manager", roles: ["MANAGER"] }}
      refresh={vi.fn()}
    />,
  );
  const button = screen.getByRole("button", {
    name: /Record cash collection/,
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  await userEvent.click(screen.getByRole("checkbox"));
  expect(button.disabled).toBe(false);
  await userEvent.click(button);
  await waitFor(() => expect(r.send).toHaveBeenCalled());
  expect(JSON.parse(r.send.mock.calls[0]![1]!.body as string)).toEqual({
    amountPaise: 12000,
  });
});
it("staff navigation hides manager and operator sections from riders", async () => {
  const r = runtime([]);
  render(
    <Dashboard
      {...r}
      user={{ id: "rider", roles: ["RIDER"] }}
      onSignOut={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Deliveries" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Menu & stock" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Celebrations" })).toBeNull();
});
it("orders errors are visible and do not become a fake empty success", async () => {
  const r = runtime();
  vi.spyOn(r.api, "orders").mockRejectedValue(
    new Error("Test network failure"),
  );
  render(<Orders {...r} user={{ id: "manager", roles: ["MANAGER"] }} />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("All caught up.")).toBeNull();
});
