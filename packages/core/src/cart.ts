import type { Product, CartLine, Basket, Address, BookingForm } from "./models";
export function visibleMenu(menu: Product[], query = "", category = "All") {
  const q = query.trim().toLocaleLowerCase();
  return menu.filter(
    (p) =>
      p.vegetarian === true &&
      p.available &&
      p.stock > 0 &&
      (category === "All" || p.category === category) &&
      (!q || `${p.name} ${p.category}`.toLocaleLowerCase().includes(q)),
  );
}
export function addItem(
  cart: CartLine[],
  product: Product,
  addons: string[],
  instructions: string,
) {
  if (!product.available || product.stock < 1)
    throw new Error("This item is unavailable.");
  if (
    new Set(addons).size !== addons.length ||
    addons.some((a) => !Object.hasOwn(product.addons, a))
  )
    throw new Error("Choose valid add-ons.");
  if (instructions.length > 300) throw new Error("Instructions are too long.");
  const old = cart.find((c) => c.sku === product.sku);
  const selected = [...addons].sort();
  if (
    old &&
    (JSON.stringify([...old.addons].sort()) !== JSON.stringify(selected) ||
      old.instructions !== instructions)
  )
    throw new Error(
      "Remove the existing item before choosing different options for the same product.",
    );
  const quantity = (old?.quantity ?? 0) + 1;
  if (quantity > Math.min(20, product.stock))
    throw new Error("No more of this item is available.");
  const line = {
    sku: product.sku,
    name: product.name,
    unitPricePaise: product.pricePaise,
    quantity,
    addons: selected,
    instructions,
    addOnPaise: selected.reduce((n, a) => n + (product.addons[a] ?? 0), 0),
  };
  return old
    ? cart.map((c) => (c.sku === product.sku ? line : c))
    : [...cart, line];
}
export function changeQuantity(
  cart: CartLine[],
  sku: string,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20)
    throw new Error("Quantity must be between 0 and 20.");
  return quantity === 0
    ? cart.filter((c) => c.sku !== sku)
    : cart.map((c) => (c.sku === sku ? { ...c, quantity } : c));
}
export function checkoutBody(
  cart: CartLine[],
  fulfilment: Basket["fulfilment"],
  useRewards: boolean,
  address?: Address,
) {
  if (!cart.length) throw new Error("Your basket is empty.");
  if (fulfilment === "delivery" && !address)
    throw new Error("Choose a delivery address.");
  return {
    lines: cart.map(({ sku, quantity, addons, instructions }) => ({
      sku,
      quantity,
      addons,
      instructions,
    })),
    fulfilment,
    useRewards,
    ...(fulfilment === "delivery" && address
      ? {
          address: {
            line: address.line,
            latitude: address.latitude,
            longitude: address.longitude,
            recipientName: address.recipientName,
            phone: address.phone,
            floor: address.floor,
            landmark: address.landmark,
          },
        }
      : {}),
    payment: "COD" as const,
  };
}
export function bookingInput(f: BookingForm) {
  if (
    !["birthday", "farewell", "office", "casual"].includes(f.occasion) ||
    !/^\d{1,2}$/.test(f.guests) ||
    Number(f.guests) < 1 ||
    Number(f.guests) > 20
  )
    throw new Error("Choose an occasion and 1–20 guests.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(f.date) ||
    !/^\d{2}:\d{2}$/.test(f.start) ||
    !/^\d{2}:\d{2}$/.test(f.end)
  )
    throw new Error("Enter a date and start/end time in IST.");
  const [year, month, day] = f.date.split("-").map(Number);
  if (
    new Date(Date.UTC(year!, month! - 1, day!)).toISOString().slice(0, 10) !==
    f.date
  )
    throw new Error("Choose a valid calendar date.");
  if (Number(f.start.slice(3)) % 15 || Number(f.end.slice(3)) % 15)
    throw new Error("Choose 15-minute time boundaries.");
  const start = new Date(`${f.date}T${f.start}:00+05:30`),
    end = new Date(`${f.date}T${f.end}:00+05:30`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    end.getTime() - start.getTime() > 8 * 3600000
  )
    throw new Error("Choose a valid event window of up to eight hours.");
  if (f.photoChannel !== "none" && (!f.photoConsent || !f.photoContact.trim()))
    throw new Error("Consent and a delivery contact are required for photos.");
  if (
    f.photoChannel === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.photoContact)
  )
    throw new Error("Enter a valid photo delivery email.");
  if (
    f.photoChannel === "whatsapp" &&
    !/^\+[1-9][0-9]{7,14}$/.test(f.photoContact)
  )
    throw new Error(
      "Include country code, for example +91 followed by your number.",
    );
  return {
    occasion: f.occasion,
    guests: Number(f.guests),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    theme: f.theme,
    photoChannel: f.photoChannel,
    ...(f.photoChannel !== "none"
      ? { photoContact: f.photoContact.trim() }
      : {}),
    photoConsent: f.photoConsent,
    cameraAssistanceRequested: f.cameraAssistanceRequested,
  };
}
