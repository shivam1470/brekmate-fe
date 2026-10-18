import { describe, it, expect } from "vitest";
import {
  ApiClient,
  ApiError,
  MutationJournal,
  MemoryVault,
  addItem,
  changeQuantity,
  checkoutBody,
  visibleMenu,
  bookingInput,
  parseRupees,
  allowedActions,
} from "../packages/core/src/index";
const product = {
  sku: "meal",
  name: "Meal",
  category: "Meals",
  pricePaise: 12000,
  stock: 2,
  available: true,
  vegetarian: true as const,
  addons: { cheese: 2000 },
};
describe("cart", () => {
  it("merges identical selections and caps quantity", () => {
    let c = addItem([], product, ["cheese"], "No chilli");
    c = addItem(c, product, ["cheese"], "No chilli");
    expect(c[0]?.quantity).toBe(2);
    expect(() => addItem(c, product, ["cheese"], "No chilli")).toThrow();
  });
  it("rejects conflicting configurations of the same SKU to match backend", () => {
    const c = addItem([], product, [], "");
    expect(() => addItem(c, product, ["cheese"], "")).toThrow(/different/);
  });
  it("removes zero quantity and does not mutate previous cart", () => {
    const c = addItem([], product, [], "");
    expect(changeQuantity(c, "meal", 0)).toEqual([]);
    expect(c[0]?.quantity).toBe(1);
  });
  it("never sends local prices or balance to checkout", () => {
    const c = addItem([], product, [], "");
    expect(checkoutBody(c, "pickup", false)).toEqual({
      lines: [{ sku: "meal", quantity: 1, addons: [], instructions: "" }],
      fulfilment: "pickup",
      useRewards: false,
      payment: "COD",
    });
  });
  it("filters unavailable and non-vegetarian entries before search", () =>
    expect(
      visibleMenu(
        [product, { ...product, sku: "sold", stock: 0 }],
        "me",
        "All",
      ).map((p) => p.sku),
    ).toEqual(["meal"]));
});
describe("money entry", () => {
  for (const [a, b] of [
    ["99", 9900],
    ["99.01", 9901],
    ["0.01", 1],
    ["0", 0],
  ] as const)
    it(`converts ${a} exactly`, () => expect(parseRupees(a)).toBe(b));
  for (const v of ["1.001", "-1", "1e3", "NaN", ""])
    it(`rejects ${v}`, () => expect(() => parseRupees(v)).toThrow());
});
describe("booking input", () => {
  it("converts explicit IST input to UTC and requires photo consent", () => {
    const b = bookingInput({
      occasion: "birthday",
      guests: "15",
      date: "2030-01-01",
      start: "17:30",
      end: "18:30",
      photoChannel: "none",
      photoContact: "",
      photoConsent: false,
      theme: "",
      cameraAssistanceRequested: false,
    });
    expect(b.startsAt).toBe("2030-01-01T12:00:00.000Z");
    expect(() => bookingInput({ ...b, guests: "21" } as any)).toThrow();
  });
});
describe("authorization hints", () => {
  it("kitchen cannot collect cash or accept orders", () =>
    expect(
      allowedActions(
        {
          status: "placed",
          fulfilment: "pickup",
          paymentStatus: "due",
          riderId: undefined,
        } as any,
        ["KITCHEN"],
        "staff",
      ),
    ).toEqual([]));
  it("rider cannot read another assignment through action hints", () =>
    expect(
      allowedActions(
        { status: "ready", fulfilment: "delivery", riderId: "other" } as any,
        ["RIDER"],
        "self",
      ),
    ).toEqual([]));
});
describe("transport", () => {
  it("rejects plaintext and untrusted URLs", () => {
    expect(
      () => new ApiClient("http://example.com", async () => "t"),
    ).toThrow();
    expect(
      () => new ApiClient("https://example.com/path", async () => "t"),
    ).toThrow();
  });
  it("does not send requests if token is missing", async () => {
    let called = false;
    const a = new ApiClient(
      "https://example.com",
      async () => null,
      async () => {
        called = true;
        return new Response("{}");
      },
    );
    await expect(a.get("/v1/menu")).rejects.toThrow(/sign in/i);
    expect(called).toBe(false);
  });
  it("encodes idempotency key and preserves typed errors", async () => {
    let request: RequestInit | undefined;
    const a = new ApiClient(
      "https://example.com",
      async () => "access",
      async (_, init) => {
        request = init;
        return new Response(
          JSON.stringify({ error: "insufficient_stock", requestId: "r1" }),
          { status: 409 },
        );
      },
    );
    await expect(
      a.mutate("POST", "/v1/orders", {}, "stable-key-01"),
    ).rejects.toBeInstanceOf(ApiError);
    expect((request?.headers as any)["Idempotency-Key"]).toBe("stable-key-01");
  });
});
describe("mutation journal", () => {
  it("persists same key over network uncertainty, including restart", async () => {
    const vault = new MemoryVault();
    let n = 0;
    const a = new MutationJournal(vault, () => `key-${++n}-000000`);
    const x = await a.prepare("checkout", { a: 1 });
    const b = new MutationJournal(vault, () => `key-${++n}-000000`);
    expect((await b.prepare("checkout", { a: 1 })).key).toBe(x.key);
    await expect(b.prepare("checkout", { a: 2 })).rejects.toThrow(/pending/);
    await b.complete("checkout");
    expect((await b.prepare("checkout", { a: 2 })).key).not.toBe(x.key);
  });
});
it("rejects impossible calendar dates instead of rolling into another month", () =>
  expect(() =>
    bookingInput({
      occasion: "birthday",
      guests: "15",
      date: "2030-02-30",
      start: "17:30",
      end: "18:30",
      photoChannel: "none",
      photoContact: "",
      photoConsent: false,
      theme: "",
      cameraAssistanceRequested: false,
    }),
  ).toThrow());
