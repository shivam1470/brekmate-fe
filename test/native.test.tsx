import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Menu } from "../apps/mobile/Menu";
import { Cart } from "../apps/mobile/Cart";
import { Addresses } from "../apps/mobile/DeliveryAddresses";
import { currentPosition } from "../apps/mobile/location";
jest.mock("../apps/mobile/location", () => ({
  currentPosition: jest.fn(),
  searchAddress: jest.fn(),
}));
import {
  CustomerContext,
  type CustomerContextValue,
} from "../apps/mobile/context";
import {
  ApiClient,
  MutationJournal,
  Mutations,
  MemoryVault,
} from "../packages/core/src/index";
const p = {
  sku: "meal",
  name: "Vegetarian meal",
  category: "Meals",
  pricePaise: 12000,
  stock: 2,
  available: true,
  vegetarian: true,
  addons: { cheese: 2000 },
};
function context(): CustomerContextValue {
  const vault = new MemoryVault();
  const api = new ApiClient(
    "https://api.example.test",
    async () => "token",
    jest.fn(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).includes("/menu") ? { items: [p] } : { items: [] },
          ),
        ),
    ) as any,
  );
  return {
    api,
    vault,
    mutations: new Mutations(
      api,
      new MutationJournal(vault, () => "native-action-key"),
    ),
    user: { id: "customer", roles: [] },
    cart: [],
    setCart: jest.fn(),
    go: jest.fn(),
    signOut: jest.fn(),
    closeSession: jest.fn(),
  };
}
it("native menu loads actual API products and adds configured item through the sheet", async () => {
  const c = context();
  await render(
    <CustomerContext.Provider value={c}>
      <Menu />
    </CustomerContext.Provider>,
  );
  expect(await screen.findByText("Vegetarian meal")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Add +" }));
  await fireEvent.press(screen.getByRole("button", { name: "Add to basket" }));
  await waitFor(() => expect(c.setCart).toHaveBeenCalled());
  expect((c.setCart as jest.Mock).mock.calls[0][0][0].sku).toBe("meal");
});
it("native empty basket has a working menu action and no place-order action", async () => {
  const c = context();
  await render(
    <CustomerContext.Provider value={c}>
      <Cart />
    </CustomerContext.Provider>,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Explore the menu" }),
  );
  expect(c.go).toHaveBeenCalledWith("home");
  expect(screen.queryByTestId("place-order")).toBeNull();
});

it("native checkout uses the current server quote and sends a COD request without client prices", async () => {
  const c = context();
  c.cart = [
    {
      sku: "meal",
      name: "Meal",
      quantity: 1,
      addons: [],
      instructions: "",
      unitPricePaise: 12000,
      addOnPaise: 0,
    },
  ];
  const calls: any[] = [];
  c.api = new ApiClient(
    "https://api.example.test",
    async () => "token",
    jest.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      const result = String(url).endsWith("/outlet")
        ? { open: true, pickupAddress: "Synthetic fixture café", radiusKm: 3 }
        : String(url).endsWith("/addresses")
          ? { items: [] }
          : String(url).endsWith("/quotes")
            ? {
                subtotalPaise: 12000,
                quoteToken: "fixture-quote-token",
                expiresAt: Math.floor(Date.now() / 1000) + 600,
                deliveryFeePaise: 0,
                rewardUsedPaise: 0,
                totalPaise: 12000,
                quoteToken: "fixture-quote-token",
                expiresAt: Math.floor(Date.now() / 1000) + 600,
              }
            : { id: "created-order" };
      return new Response(JSON.stringify(result));
    }) as any,
  );
  c.mutations = new Mutations(
    c.api,
    new MutationJournal(c.vault, () => "native-checkout-key"),
  );
  await render(
    <CustomerContext.Provider value={c}>
      <Cart />
    </CustomerContext.Provider>,
  );
  const place = await screen.findByTestId("place-order");
  await waitFor(() =>
    expect(place.props.accessibilityState?.disabled).toBe(false),
  );
  await fireEvent.press(place);
  await waitFor(() =>
    expect(c.go).toHaveBeenCalledWith("order", "created-order"),
  );
  const request = calls.find((r) => r.url.endsWith("/orders"));
  expect(JSON.parse(request.init.body)).toEqual({
    lines: [{ sku: "meal", quantity: 1, addons: [], instructions: "" }],
    fulfilment: "pickup",
    useRewards: false,
    payment: "COD",
    quoteToken: "fixture-quote-token",
  });
  expect(request.init.headers["Idempotency-Key"]).toBe("native-checkout-key");
});

it("native checkout keeps an uncertain request recoverable without creating a second key", async () => {
  const c = context();
  c.cart = [
    {
      sku: "meal",
      name: "Meal",
      quantity: 1,
      addons: [],
      instructions: "",
      unitPricePaise: 12000,
      addOnPaise: 0,
    },
  ];
  let attempted = 0;
  const keys: string[] = [];
  c.api = new ApiClient(
    "https://api.example.test",
    async () => "token",
    jest.fn(async (url, init) => {
      if (String(url).endsWith("/orders")) {
        keys.push((init?.headers as any)["Idempotency-Key"]);
        if (attempted++ === 0) throw new Error("Connection lost");
        return new Response('{"id":"recovered-order"}');
      }
      return new Response(
        JSON.stringify(
          String(url).endsWith("/outlet")
            ? {
                open: true,
                pickupAddress: "Synthetic fixture café",
                radiusKm: 3,
              }
            : String(url).endsWith("/addresses")
              ? { items: [] }
              : {
                  subtotalPaise: 12000,
                  quoteToken: "fixture-quote-token",
                  expiresAt: Math.floor(Date.now() / 1000) + 600,
                  deliveryFeePaise: 0,
                  rewardUsedPaise: 0,
                  totalPaise: 12000,
                  quoteToken: "fixture-quote-token",
                  expiresAt: Math.floor(Date.now() / 1000) + 600,
                },
        ),
      );
    }) as any,
  );
  c.mutations = new Mutations(
    c.api,
    new MutationJournal(c.vault, () => "native-recovery-key"),
  );
  await render(
    <CustomerContext.Provider value={c}>
      <Cart />
    </CustomerContext.Provider>,
  );
  const button = await screen.findByTestId("place-order");
  await waitFor(() =>
    expect(button.props.accessibilityState?.disabled).toBe(false),
  );
  await fireEvent.press(button);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Recover previous checkout" }),
  );
  await waitFor(() =>
    expect(c.go).toHaveBeenCalledWith("order", "recovered-order"),
  );
  expect(keys).toEqual(["native-recovery-key", "native-recovery-key"]);
});

it("denied location permission keeps a manual fallback available", async () => {
  const c = context();
  (currentPosition as jest.Mock).mockRejectedValue(
    new Error("Location permission was denied."),
  );
  await render(
    <CustomerContext.Provider value={c}>
      <Addresses />
    </CustomerContext.Provider>,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Use my current location" }),
  );
  expect(
    await screen.findByText("Location permission was denied."),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Enter map coordinates manually" }),
  );
  expect(screen.getByLabelText("Latitude")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Save address" }).props
      .accessibilityState.disabled,
  ).toBe(true);
});
it("address saves recipient contact only after confirmed serviceable location", async () => {
  const c = context();
  const calls: any[] = [];
  c.api = new ApiClient(
    "https://api.example.test",
    async () => "token",
    jest.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify(
          String(url).endsWith("/serviceability")
            ? { deliverable: true, distanceKm: 0, radiusKm: 3 }
            : { items: [] },
        ),
      );
    }) as any,
  );
  (currentPosition as jest.Mock).mockResolvedValue({
    latitude: 28.45,
    longitude: 77.02,
  });
  await render(
    <CustomerContext.Provider value={c}>
      <Addresses />
    </CustomerContext.Provider>,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Recipient name"),
    "Customer",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Recipient phone with country code"),
    "+919876543210",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Building, street and delivery instructions"),
    "Office, Sector 23, Gurugram",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Use my current location" }),
  );
  await fireEvent(
    await screen.findByRole("switch", {
      name: "I confirm this is the delivery location",
    }),
    "valueChange",
    true,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save address" }).props
        .accessibilityState.disabled,
    ).toBe(false),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Save address" }));
  await waitFor(() =>
    expect(calls.some((c) => c.init?.method === "PUT")).toBe(true),
  );
  expect(
    JSON.parse(calls.find((c) => c.init?.method === "PUT").init.body).phone,
  ).toBe("+919876543210");
});
