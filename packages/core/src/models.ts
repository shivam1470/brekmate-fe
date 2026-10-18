import { z } from "zod";
export const productSchema = z.object({
  revision: z.number().int().positive().optional(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  pricePaise: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  available: z.boolean(),
  vegetarian: z.literal(true),
  addons: z.record(z.string(), z.number().int().nonnegative()),
});
export type Product = z.infer<typeof productSchema>;
export type Address = {
  id?: string;
  line: string;
  latitude: number;
  longitude: number;
  recipientName?: string;
  phone?: string;
  floor?: string;
  landmark?: string;
};
export type CartLine = {
  sku: string;
  quantity: number;
  addons: string[];
  instructions: string;
  name: string;
  unitPricePaise: number;
  addOnPaise: number;
};
export type Basket = {
  lines: {
    sku: string;
    quantity: number;
    addons: string[];
    instructions?: string;
  }[];
  fulfilment: "delivery" | "pickup";
  useRewards: boolean;
  address?: Omit<Address, "id">;
};
export type Quote = {
  quoteToken: string;
  expiresAt: number;
  subtotalPaise: number;
  deliveryFeePaise: number;
  rewardUsedPaise: number;
  totalPaise: number;
};
export type Order = Omit<Quote, "quoteToken" | "expiresAt"> & {
  id: string;
  customerId: string;
  outletId: string;
  lines: CartLine[];
  fulfilment: "pickup" | "delivery";
  address?: Address;
  status: string;
  payment: "COD" | "ONLINE";
  paymentStatus: string;
  riderId?: string;
  createdAt: string;
  updatedAt: string;
  reason?: string;
  collectedAt?: string;
  deliveryIssue?: { reason: string; note: string; reportedAt: string };
};
export type Profile = {
  id: string;
  name: string;
  preferences: { marketing: boolean };
};
export type Page<T> = { items: T[]; cursor?: string };
export type Booking = {
  id: string;
  customerId: string;
  occasion: string;
  guests: number;
  startsAt: string;
  endsAt: string;
  status: string;
  theme: string;
  photoChannel: string;
  photoContact?: string;
  photoConsent: boolean;
  photosSharedAt?: string;
  cameraAssistanceRequested: boolean;
};
export type BookingForm = {
  occasion: string;
  guests: string;
  date: string;
  start: string;
  end: string;
  theme: string;
  photoChannel: "none" | "email" | "whatsapp";
  photoContact: string;
  photoConsent: boolean;
  cameraAssistanceRequested: boolean;
};
export type Wallet = {
  balancePaise: number;
  entries: {
    type: string;
    amountPaise: number;
    at: string;
    orderId?: string;
  }[];
  cursor?: string;
};
export type Identity = { id: string; roles: string[]; email?: string };
export const theme = {
  primary: "#FF5C1A",
  primaryDark: "#B73500",
  ink: "#111827",
  muted: "#667085",
  surface: "#F6F5F1",
  card: "#FFFFFF",
  green: "#16803D",
  line: "#E7E5E0",
  display: "Bodoni",
  body: "Lato",
  bodyBold: "LatoBold",
};
export const formatMoney = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
export function parseRupees(s: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s))
    throw new Error("Enter rupees with up to two decimal places.");
  const [whole, fraction = ""] = s.split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 100_000_000)
    throw new Error("Amount is too large.");
  return n;
}
export function allowedActions(o: Order, roles: string[], staffId: string) {
  if (roles.some((r) => ["OWNER", "MANAGER", "OPERATOR"].includes(r))) {
    const next: Record<string, string[]> = {
      placed: ["accepted", "rejected", "cancelled"],
      accepted: ["preparing", "cancelled"],
      preparing: ["ready"],
      ready: o.fulfilment === "delivery" ? ["out_for_delivery"] : ["delivered"],
      out_for_delivery: ["delivered"],
    };
    return next[o.status] ?? [];
  }
  if (roles.includes("RIDER"))
    return o.riderId === staffId
      ? o.status === "ready"
        ? ["out_for_delivery"]
        : o.status === "out_for_delivery"
          ? ["delivered"]
          : []
      : [];
  if (roles.includes("KITCHEN"))
    return o.status === "accepted"
      ? ["preparing"]
      : o.status === "preparing"
        ? ["ready"]
        : [];
  return [];
}
export const isManager = (roles: string[]) =>
  roles.some((r) => ["OWNER", "MANAGER"].includes(r));
export const isOperator = (roles: string[]) =>
  roles.some((r) => ["OWNER", "MANAGER", "OPERATOR"].includes(r));

export type Outlet = {
  open: boolean;
  radiusKm: number;
  latitude: number;
  longitude: number;
  pickupAddress: string | null;
};
export type Rider = { id: string; name: string; active: boolean };
export type CashCollection = {
  orderId: string;
  amountPaise: number;
  actorId: string;
  collectedAt: string;
  fulfilment: string;
};
export const istDate = (date = new Date()) =>
  new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 10);
