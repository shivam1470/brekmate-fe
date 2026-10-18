import { it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery } from "../packages/core/src/react";
import { Orders } from "../apps/staff/src/Orders";
import { Cash } from "../apps/staff/src/Cash";
import {
  ApiClient,
  Mutations,
  MemoryVault,
  MutationJournal,
} from "../packages/core/src";
afterEach(cleanup);
it("query key changes never expose the previous order", async () => {
  let finish: (v: string) => void = () => {};
  function Item({ id }: { id: string }) {
    const q = useQuery(
      () =>
        id === "one"
          ? Promise.resolve("Order one")
          : new Promise<string>((r) => {
              finish = r;
            }),
      [id],
    );
    return <div>{q.data ?? "Loading"}</div>;
  }
  const view = render(<Item id="one" />);
  await screen.findByText("Order one");
  view.rerender(<Item id="two" />);
  expect(screen.queryByText("Order one")).toBeNull();
  await act(async () => finish("Order two"));
  await screen.findByText("Order two");
});
it("delivered cash-due orders remain in default work queue", async () => {
  const o = {
    id: "unpaid-order",
    status: "delivered",
    payment: "COD",
    paymentStatus: "due",
    fulfilment: "pickup",
    lines: [],
    totalPaise: 12000,
    createdAt: "2029-01-01T00:00:00Z",
  };
  const api = new ApiClient(
    "https://api.test",
    async () => "token",
    vi.fn(async () => new Response(JSON.stringify({ items: [o] }))) as any,
  );
  const mutations = new Mutations(
    api,
    new MutationJournal(new MemoryVault(), () => crypto.randomUUID()),
  );
  render(
    <Orders
      api={api}
      mutations={mutations}
      user={{ id: "manager", roles: ["MANAGER"] }}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Record cash collection/ }),
    ).toBeTruthy(),
  );
});
it("daily cash check displays difference against recorded collection", async () => {
  const send = vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          items: [
            {
              orderId: "order-1",
              actorId: "rider-1",
              amountPaise: 12000,
              collectedAt: "2029-01-01T10:00:00Z",
              fulfilment: "delivery",
            },
          ],
        }),
      ),
  );
  const api = new ApiClient("https://api.test", async () => "token", send);
  render(<Cash api={api} />);
  expect(await screen.findAllByText("₹120")).toHaveLength(2);
  await userEvent.type(screen.getByLabelText("Cash counted in rupees"), "100");
  expect(screen.getByText("Difference: -₹20")).toBeTruthy();
  expect(String(send.mock.calls[0]?.[0])).toMatch(
    /\/v1\/staff\/cash\/\d{4}-\d{2}-\d{2}/,
  );
});
it("unknown reconciliation retains original checkout", async () => {
  const j = new MutationJournal(new MemoryVault(), () => "reconcile-key");
  await j.prepare("checkout", { payment: "COD" });
  const api = new ApiClient(
    "https://api.test",
    async () => "t",
    vi.fn(async () => new Response('{"state":"unknown"}')) as any,
  );
  const m = new Mutations(api, j);
  expect((await m.reconcileCheckout()).state).toBe("unknown");
  expect((await m.pending("checkout"))?.key).toBe("reconcile-key");
});
it("server-confirmed abandonment clears the local attempt", async () => {
  const j = new MutationJournal(new MemoryVault(), () => "abandon-key");
  await j.prepare("checkout", { payment: "COD" });
  const api = new ApiClient(
    "https://api.test",
    async () => "t",
    vi.fn(async () => new Response('{"state":"abandoned"}')) as any,
  );
  const m = new Mutations(api, j);
  await m.reconcileCheckout(true);
  expect(await m.pending("checkout")).toBeNull();
});
it("old completion cannot remove a newer action", async () => {
  let n = 0;
  const j = new MutationJournal(new MemoryVault(), () => `action-key-${++n}`);
  const first = await j.prepare("checkout", { v: 1 });
  await j.complete("checkout", first.key);
  const next = await j.prepare("checkout", { v: 2 });
  await j.complete("checkout", first.key);
  expect((await j.current("checkout"))?.key).toBe(next.key);
});
