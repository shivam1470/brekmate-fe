// Run with the prepared brekmate-be checkout next to brekmate-fe.
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { createApp } from "../../brekmate-be/src/app";
import { Service } from "../../brekmate-be/src/service";
import { MemoryStore } from "../../brekmate-be/src/store";
import { Fault } from "../../brekmate-be/src/errors";
import {
  ApiClient,
  MutationJournal,
  Mutations,
  MemoryVault,
  addItem,
  checkoutBody,
  bookingInput,
  type Order,
} from "../packages/core/src/index";
const manager = { kind: "staff" as const, id: "manager-1", roles: ["MANAGER"] };
const customer = { kind: "customer" as const, id: "customer-1", roles: [] };
let app: ReturnType<typeof createApp>;
let customerApi: ApiClient;
let staffApi: ApiClient;
let mutations: Mutations;
let n = 0;
beforeEach(async () => {
  const service = new Service(new MemoryStore(), {
    outletId: "main",
    latitude: 28.45,
    longitude: 77.02,
    radiusKm: 3,
    ordersEnabled: true,
    bookingEnabled: true,
    bookingMaxMinutes: 180,
    bookingBufferMinutes: 15,
    openingUtcHour: 0,
    closingUtcHour: 24,
    otpPepper: "integration-test-only-pepper-01234567890123456789",
    now: () => new Date("2029-01-01T00:00:00Z"),
  });
  await service.saveProduct(manager, {
    sku: "meal",
    name: "Vegetarian meal",
    category: "Meals",
    pricePaise: 12000,
    stock: 5,
    available: true,
    vegetarian: true,
    addons: { cheese: 2000 },
  });
  app = createApp(service, {
    async authenticate(header) {
      if (header === "Bearer customer") return customer;
      if (header === "Bearer manager") return manager;
      throw new Fault(401, "invalid_token");
    },
  });
  const transport: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url));
    const result = await app.inject({
      method: init?.method as any,
      url: parsed.pathname + parsed.search,
      headers: init?.headers as any,
      ...(init?.body ? { payload: JSON.parse(init.body as string) } : {}),
    });
    return new Response(result.body, {
      status: result.statusCode,
      headers: result.headers as any,
    });
  };
  customerApi = new ApiClient(
    "https://api.example.test",
    async () => "customer",
    transport,
  );
  staffApi = new ApiClient(
    "https://api.example.test",
    async () => "manager",
    transport,
  );
  mutations = new Mutations(
    customerApi,
    new MutationJournal(new MemoryVault(), () => `integration-key-${n++}`),
  );
});
afterEach(async () => {
  await app.close();
});
it("lost checkout response reconciles the accepted order without a new order", async () => {
  const raw = checkoutBody(
    addItem([], (await customerApi.menu())[0]!, [], ""),
    "pickup",
    false,
  );
  const { payment, ...basket } = raw;
  const body = {
    ...raw,
    quoteToken: (await customerApi.quote(basket)).quoteToken,
  };
  const original = customerApi.mutate.bind(customerApi);
  vi.spyOn(customerApi, "mutate").mockImplementationOnce(async (...args) => {
    await original(...args);
    throw new Error("Lost response after commit");
  });
  await expect(
    mutations.run("checkout", "POST", "/v1/orders", body),
  ).rejects.toThrow(/Lost response/);
  expect(await mutations.pending("checkout")).not.toBeNull();
  const result = await mutations.reconcileCheckout(true);
  expect(result.state).toBe("accepted");
  expect(result.orderId).toBe((await customerApi.orders())[0]?.id);
  expect(await mutations.pending("checkout")).toBeNull();
  expect((await customerApi.orders()).length).toBe(1);
});
it("delivery contact and early serviceability use actual backend contracts", async () => {
  const address = {
    line: "Synthetic office",
    latitude: 28.45,
    longitude: 77.02,
    recipientName: "Fixture Customer",
    phone: "+919876543210",
    floor: "2",
    landmark: "Reception",
  };
  expect(
    await customerApi.request("POST", "/v1/serviceability", {
      latitude: address.latitude,
      longitude: address.longitude,
    }),
  ).toMatchObject({ deliverable: true });
  await customerApi.request("PUT", "/v1/addresses/office", address);
  const raw = checkoutBody(
    addItem([], (await customerApi.menu())[0]!, [], ""),
    "delivery",
    false,
    address,
  );
  const { payment, ...basket } = raw;
  const order = await mutations.run<Order>("checkout", "POST", "/v1/orders", {
    ...raw,
    quoteToken: (await customerApi.quote(basket)).quoteToken,
  });
  expect((await customerApi.order(order.id)).address?.phone).toBe(
    address.phone,
  );
});
it("frontend cart and quote create an idempotent real backend COD order", async () => {
  const menu = await customerApi.menu();
  const cart = addItem([], menu[0]!, ["cheese"], "Less chilli");
  const body = checkoutBody(cart, "pickup", false);
  const { payment, ...basket } = body;
  const q = await customerApi.quote(basket);
  expect(q.totalPaise).toBe(14000);
  const accepted = { ...body, quoteToken: q.quoteToken };
  const prepared = await mutations.run<Order>(
    "checkout",
    "POST",
    "/v1/orders",
    accepted,
  );
  expect(prepared.totalPaise).toBe(14000);
  const replay = await customerApi.mutate<Order>(
    "POST",
    "/v1/orders",
    accepted,
    `integration-key-${n - 1}`,
  );
  expect(replay.id).toBe(prepared.id);
  expect((await customerApi.orders()).length).toBe(1);
});
it("staff lifecycle and exact COD collection work through real API contracts", async () => {
  const body = checkoutBody(
    addItem([], (await customerApi.menu())[0]!, [], ""),
    "pickup",
    false,
  );
  const { payment, ...basket } = body;
  const o = await mutations.run<Order>("checkout", "POST", "/v1/orders", {
    ...body,
    quoteToken: (await customerApi.quote(basket)).quoteToken,
  });
  for (const status of ["accepted", "preparing", "ready", "delivered"])
    await staffApi.mutate(
      "POST",
      `/v1/orders/${o.id}/status`,
      { status },
      `status-key-${status}`,
    );
  await staffApi.mutate(
    "POST",
    `/v1/orders/${o.id}/collection`,
    { amountPaise: 12000 },
    "collection-key",
  );
  expect((await customerApi.order(o.id)).paymentStatus).toBe("collected");
});
it("customer cannot invoke staff product management through the real backend", async () => {
  await expect(
    customerApi.request("PUT", "/v1/staff/products", { sku: "bad" }),
  ).rejects.toMatchObject({ status: 403, code: "forbidden" });
});
it("IST celebration enquiry creates a confirmable reservation and rejects overlap", async () => {
  const b = bookingInput({
    occasion: "birthday",
    guests: "15",
    date: "2030-01-01",
    start: "17:30",
    end: "18:30",
    theme: "",
    photoChannel: "none",
    photoContact: "",
    photoConsent: false,
    cameraAssistanceRequested: false,
  });
  const first = await mutations.run<{ id: string }>(
    "enquiry-one",
    "POST",
    "/v1/bookings",
    b,
  );
  const second = await mutations.run<{ id: string }>(
    "enquiry-two",
    "POST",
    "/v1/bookings",
    b,
  );
  await staffApi.mutate(
    "POST",
    `/v1/bookings/${first.id}/confirmation`,
    {},
    "confirm-first-key",
  );
  await expect(
    staffApi.mutate(
      "POST",
      `/v1/bookings/${second.id}/confirmation`,
      {},
      "confirm-second-key",
    ),
  ).rejects.toMatchObject({ code: "booking_overlap" });
});
it('frontend menu revisions round-trip to staff edits and reject stale stock saves', async () => {
 const loaded=(await staffApi.menu())[0]!;
 expect(loaded.revision).toBe(1);
 const {revision,...product}=loaded;
 await staffApi.request('PUT','/v1/staff/products',{...product,stock:4,expectedVersion:revision});
 await expect(staffApi.request('PUT','/v1/staff/products',{...product,stock:5,expectedVersion:revision})).rejects.toMatchObject({status:409,code:'product_changed'});
 expect((await customerApi.menu())[0]!.stock).toBe(4);
});
