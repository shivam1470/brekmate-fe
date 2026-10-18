import React from "react";
import { AppState } from "react-native";
import {
  render,
  screen,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react-native";
import { OrderDetail } from "../apps/mobile/Orders";
import { CustomerContext } from "../apps/mobile/context";

// Mocked transport and OS lifecycle; this is not physical-device evidence.
const appStateDescriptor = Object.getOwnPropertyDescriptor(
  AppState,
  "currentState",
)!;
beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  Object.defineProperty(AppState, "currentState", appStateDescriptor);
});
it.each([
  ["delivery", "resume"],
  ["pickup", "resume"],
  ["delivery", "poll"],
  ["pickup", "poll"],
])(
  "%s delivered cash-due order refreshes collection on %s without remounting",
  async (fulfilment, trigger) => {
    const order = {
      id: "order-cash-due",
      createdAt: "2026-10-18T09:00:00Z",
      status: "delivered",
      fulfilment,
      paymentStatus: "pending",
      totalPaise: 12000,
      rewardUsedPaise: 0,
      lines: [],
    };
    const load = jest
      .fn()
      .mockResolvedValueOnce(order)
      .mockResolvedValue({ ...order, paymentStatus: "collected" });
    let resume: ((state: string) => void) | undefined;
    const remove = jest.fn();
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_, callback) => {
        resume = callback;
        return { remove };
      });
    const intervals = jest.spyOn(global, "setInterval");
    const c: any = {
      screen: "order",
      id: order.id,
      api: { order: load },
      cart: [],
      go: jest.fn(),
    };
    await render(
      <CustomerContext.Provider value={c}>
        <OrderDetail />
      </CustomerContext.Provider>,
    );
    expect(await screen.findByText(/Cash due/)).toBeTruthy();
    expect(intervals.mock.calls.some((call) => call[1] === 15000)).toBe(true);
    expect(resume).toBeDefined();
    if (trigger === "resume") {
      await act(async () => {
        resume?.("active");
      });
    } else {
      const poll = intervals.mock.calls.find(
        (call) => call[1] === 15000,
      )![0] as () => void;
      Object.defineProperty(AppState, "currentState", {
        configurable: true,
        writable: true,
        value: "background",
      });
      await act(async () => poll());
      expect(load).toHaveBeenCalledTimes(1);
      Object.defineProperty(AppState, "currentState", {
        configurable: true,
        writable: true,
        value: "active",
      });
      await act(async () => poll());
    }
    expect(await screen.findByText(/Cash received/)).toBeTruthy();
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(load).toHaveBeenCalledTimes(2);
  },
);
it.each(["cancelled", "rejected"])(
  "%s order does not poll an uncollectable balance",
  async (status) => {
    const listener = jest.spyOn(AppState, "addEventListener");
    const c: any = {
      screen: "order",
      id: "closed-order",
      api: {
        order: jest.fn().mockResolvedValue({
          id: "closed-order",
          status,
          fulfilment: "pickup",
          paymentStatus: "pending",
          totalPaise: 12000,
          rewardUsedPaise: 0,
          lines: [],
        }),
      },
      cart: [],
      go: jest.fn(),
    };
    await render(
      <CustomerContext.Provider value={c}>
        <OrderDetail />
      </CustomerContext.Provider>,
    );
    await screen.findByText(status);
    expect(listener).not.toHaveBeenCalled();
  },
);
