import type { Vault } from "./storage";
import { MutationJournal } from "./storage";
import type {
  Product,
  Page,
  Order,
  Booking,
  Address,
  Quote,
  Wallet,
  Profile,
  Basket,
} from "./models";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public requestId?: string,
  ) {
    super(
      messages[code] ??
        "This action could not be completed. Please refresh and try again.",
    );
  }
}
const messages: Record<string, string> = {
  product_changed:
    "This product or its stock changed. Close the editor, refresh the catalogue and review the current values before saving.",
  rider_not_active: "Your rider access is inactive. Contact the café manager.",
  quote_required: "Refresh your total before ordering.",
  quote_changed:
    "Prices, options or rewards changed. Refresh your total and confirm again.",
  quote_expired: "Your quote expired. Refresh and confirm the total again.",
  invalid_quote: "Refresh your total before ordering.",
  checkout_abandoned: "This attempt was safely closed. You can order again.",
  delivery_contact_required:
    "Add the recipient name and phone to this address.",
  otp_unavailable: "The café has not issued a delivery code yet.",
  otp_still_active:
    "The current code is still valid. Ask the customer to refresh their order.",

  insufficient_stock: "An item has sold out. Refresh your basket.",
  product_unavailable: "An item is no longer available.",
  outside_delivery_area: "This address is outside our delivery area.",
  outlet_closed: "The café is currently closed.",
  online_payment_unavailable:
    "Online payment is not available yet. Choose cash on delivery.",
  invalid_otp: "That delivery code is incorrect.",
  otp_expired_or_locked:
    "The delivery code has expired or is locked. Contact the café.",
  booking_overlap: "This time is no longer available. Choose another slot.",
  booking_policy_not_configured:
    "Please contact the café to confirm this celebration.",
  account_deleted: "This account is disabled.",
  forbidden: "You do not have access to this action.",
  invalid_collection_amount: "The collection must match the exact order total.",
  authentication_required: "Please sign in again.",
  invalid_token: "Please sign in again.",
  idempotency_conflict:
    "This action was already submitted with different details.",
  orders_disabled: "Ordering is not available yet. Please try later.",
};
export class ApiClient {
  readonly base: string;
  constructor(
    base: string,
    private token: () => Promise<string | null>,
    private transport: typeof fetch = fetch,
    private allowLocal = false,
  ) {
    const u = new URL(base);
    if (
      u.pathname !== "/" ||
      u.search ||
      u.hash ||
      u.username ||
      u.password ||
      !(
        u.protocol === "https:" ||
        (allowLocal &&
          u.protocol === "http:" &&
          ["127.0.0.1", "localhost", "10.0.2.2"].includes(u.hostname))
      )
    )
      throw new Error(
        "Configure an HTTPS API origin; local HTTP requires explicit development mode.",
      );
    this.base = u.origin;
  }
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    key?: string,
  ): Promise<T> {
    if (
      !/^\/v1\/[a-zA-Z0-9_/%?.=&:#-]+$/.test(path) ||
      path.includes("://") ||
      path.includes("..")
    )
      throw new Error("Invalid API path");
    const access = await this.token();
    if (!access) throw new Error("Please sign in again.");
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${access}`,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (key) headers["Idempotency-Key"] = key;
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await this.transport.call(globalThis, this.base + path, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
      });
      let result: any;
      try {
        result = await r.json();
      } catch {
        throw new ApiError(r.status, "invalid_response");
      }
      if (!r.ok)
        throw new ApiError(
          r.status,
          result.error ?? "unknown_error",
          result.requestId,
        );
      return result as T;
    } finally {
      clearTimeout(timeout);
    }
  }
  get<T>(path: string) {
    return this.request<T>("GET", path);
  }
  mutate<T>(method: string, path: string, body: unknown, key: string) {
    return this.request<T>(method, path, body, key);
  }
  async all<T>(path: string): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const page = await this.get<Page<T>>(
        path + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (!Array.isArray(page.items)) throw new Error("Invalid list response");
      all.push(...page.items);
      cursor = page.cursor;
      if (cursor) {
        if (seen.has(cursor))
          throw new Error("The server returned a repeated page.");
        seen.add(cursor);
      }
      if (all.length > 10000)
        throw new Error(
          "Too many records. Use a smaller staff reporting window.",
        );
    } while (cursor);
    return all;
  }
  menu() {
    return this.all<Product>("/v1/menu");
  }
  orders(rider = false) {
    return this.all<Order>(rider ? "/v1/rider/orders" : "/v1/orders");
  }
  order(id: string) {
    return this.get<Order>("/v1/orders/" + encodeURIComponent(id));
  }
  bookings() {
    return this.all<Booking>("/v1/bookings");
  }
  addresses() {
    return this.all<Address>("/v1/addresses");
  }
  wallet() {
    return this.get<Wallet>("/v1/wallet");
  }
  profile() {
    return this.get<Profile>("/v1/profile");
  }
  quote(b: Basket) {
    return this.request<Quote>("POST", "/v1/quotes", b);
  }
}
export class Mutations {
  constructor(
    private api: ApiClient,
    private journal: MutationJournal,
  ) {}
  async run<T>(
    scope: string,
    method: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    const pending = await this.journal.prepare(scope, body);
    try {
      const result = await this.api.mutate<T>(method, path, body, pending.key);
      await this.clearKnownResult(scope, pending.key);
      return result;
    } catch (e) {
      if (
        pending.fresh &&
        e instanceof ApiError &&
        e.code !== "idempotency_conflict" &&
        e.status >= 400 &&
        e.status < 500 &&
        ![408, 429].includes(e.status)
      )
        await this.clearKnownResult(scope, pending.key);
      throw e;
    }
  }
  private async clearKnownResult(scope: string, key: string) {
    try {
      await this.journal.complete(scope, key);
    } catch {
      /* A known server result must not become an unknown checkout because OS cleanup failed. Retained entries can be recovered using the original key. */
    }
  }
  async reconcileCheckout(abandon = false) {
    const pending = await this.journal.current("checkout");
    if (!pending) return { state: "none" as const };
    const result = await this.api.request<{
      state: "unknown" | "accepted" | "abandoned";
      orderId?: string;
    }>("POST", "/v1/checkouts/reconcile", { key: pending.key, abandon });
    if (result.state !== "unknown")
      await this.journal.complete("checkout", pending.key);
    return result;
  }
  pending(scope: string) {
    return this.journal.current(scope);
  }
}
