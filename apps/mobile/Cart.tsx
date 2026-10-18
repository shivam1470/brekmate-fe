import { useEffect, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import {
  checkoutBody,
  changeQuantity,
  type Order,
  type Outlet,
  formatMoney,
  theme,
} from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
import { useCustomer } from "./context";
import { Page, Heading, Button, Toggle, Feedback, QueryState, s } from "./ui";
export function Cart() {
  const c = useCustomer();
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup"),
    [useRewards, setUseRewards] = useState(false),
    [addressId, setAddressId] = useState(""),
    [pending, setPending] = useState(false),
    [loadingPending, setLoadingPending] = useState(true),
    [pendingError, setPendingError] = useState(""),
    [clock, setClock] = useState(() => Date.now());
  const outlet = useQuery(() => c.api.get<Outlet>("/v1/outlet"), [c.api]);
  const addresses = useQuery(() => c.api.addresses(), [c.api]);
  const reloadAddresses = addresses.reload,
    reloadOutlet = outlet.reload;
  useEffect(() => {
    if (c.screen === "cart") {
      reloadAddresses();
      reloadOutlet();
    }
  }, [c.screen, reloadAddresses, reloadOutlet]);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const chosen = addresses.data?.find((a) => a.id === addressId);
  let body: ReturnType<typeof checkoutBody> | undefined;
  try {
    body = checkoutBody(c.cart, fulfilment, useRewards, chosen);
  } catch {}
  const key = JSON.stringify(body);
  const quote = useQuery(async () => {
    if (!body) return null;
    const { payment, ...basket } = body;
    return c.api.quote(basket);
  }, [key]);
  const a = useAction();
  useEffect(() => {
    let active = true;
    c.mutations
      .pending("checkout")
      .then((p) => {
        if (active) setPending(!!p);
      })
      .catch(() => {
        if (active)
          setPendingError(
            "Unable to read checkout recovery. Reopen the basket before retrying.",
          );
      })
      .finally(() => {
        if (active) setLoadingPending(false);
      });
    return () => {
      active = false;
    };
  }, [c.mutations]);
  const expired =
    !!quote.data?.expiresAt && quote.data.expiresAt * 1000 <= clock;
  const checkout = async () => {
    if (!body || !quote.data || !quote.data.quoteToken || expired)
      throw new Error("Get a current server quote before ordering.");
    await submit({ ...body, quoteToken: quote.data.quoteToken });
  };
  async function submit(payload: unknown) {
    const o = await c.mutations.run<Order>(
      "checkout",
      "POST",
      "/v1/orders",
      payload,
    );
    c.setCart([]);
    setPending(false);
    c.go("order", o.id);
  }
  async function recover() {
    const p = await c.mutations.pending("checkout");
    if (!p) throw new Error("There is no pending checkout.");
    await submit(p.body);
  }
  async function reconcile(abandon = false) {
    const r = await c.mutations.reconcileCheckout(abandon);
    if (r.state === "accepted" && r.orderId) {
      c.setCart([]);
      setPending(false);
      c.go("order", r.orderId);
    } else if (r.state === "abandoned" || r.state === "none") {
      setPending(false);
      quote.reload();
    } else
      throw new Error(
        "The result is still unknown. Recover the request or safely close this attempt.",
      );
  }
  return (
    <Page>
      <Heading
        eyebrow="YOUR BASKET"
        title="A good break, almost ready."
        description="Prices and availability are confirmed by the café at checkout."
      />
      <Feedback error={pendingError} />
      {loadingPending ? (
        <Text style={s.muted}>Checking pending checkout…</Text>
      ) : (
        pending && (
          <View style={s.card}>
            <Text style={s.h2}>Check your last checkout</Text>
            <Button
              title="Check checkout result"
              secondary
              disabled={a.busy}
              onPress={() => void a.run(() => reconcile())}
            />
            <Button
              title="Safely close this attempt"
              secondary
              disabled={a.busy}
              onPress={() =>
                Alert.alert(
                  "Check and close?",
                  "Any accepted order will be returned. Otherwise this attempt will be blocked from arriving late.",
                  [
                    { text: "Keep checking", style: "cancel" },
                    {
                      text: "Check and close",
                      onPress: () => void a.run(() => reconcile(true)),
                    },
                  ],
                )
              }
            />
            <Text style={s.text}>
              A previous request may have reached the café. Retry that same
              request to retrieve its result.
            </Text>
            <Button
              title="Recover previous checkout"
              disabled={a.busy}
              onPress={() => void a.run(recover)}
            />
            <Button
              title="View my orders"
              secondary
              onPress={() => c.go("orders")}
            />
          </View>
        )
      )}
      {c.cart.length === 0 ? (
        <View style={s.card}>
          <Text style={s.text}>Your basket is waiting for something good.</Text>
          <Button title="Explore the menu" onPress={() => c.go("home")} />
        </View>
      ) : (
        <>
          <View style={s.card}>
            {c.cart.map((l) => (
              <View key={l.sku} style={{ gap: 9, paddingVertical: 5 }}>
                <View style={s.spread}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.text, { fontFamily: theme.bodyBold }]}>
                      {l.name}
                    </Text>
                    {l.addons.length > 0 && (
                      <Text style={s.muted}>{l.addons.join(", ")}</Text>
                    )}
                    {Boolean(l.instructions) && (
                      <Text style={s.muted}>{l.instructions}</Text>
                    )}
                  </View>
                  <Text style={s.text}>
                    {formatMoney(
                      (l.unitPricePaise + l.addOnPaise) * l.quantity,
                    )}
                  </Text>
                </View>
                <View style={s.row}>
                  <Button
                    title={`Remove one ${l.name}`}
                    secondary
                    disabled={pending || a.busy}
                    onPress={() =>
                      c.setCart((old) =>
                        changeQuantity(old, l.sku, l.quantity - 1),
                      )
                    }
                  />
                  <Text
                    accessibilityLabel={`${l.quantity} ${l.name}`}
                    style={s.text}
                  >
                    {l.quantity}
                  </Text>
                  <Button
                    title={`Add one ${l.name}`}
                    secondary
                    disabled={pending || a.busy || l.quantity >= 20}
                    onPress={() =>
                      c.setCart((old) =>
                        changeQuantity(old, l.sku, l.quantity + 1),
                      )
                    }
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.h2}>How would you like it?</Text>
            <QueryState
              loading={outlet.loading}
              error={outlet.error}
              retry={outlet.reload}
            />
            {outlet.data && (
              <Text style={s.text}>
                {outlet.data.open
                  ? "The café is accepting orders."
                  : "The café is closed for ordering."}
              </Text>
            )}
            {fulfilment === "pickup" && (
              <Text style={s.muted}>
                Pickup:{" "}
                {outlet.data?.pickupAddress ??
                  "Pickup address needs café confirmation before launch."}
              </Text>
            )}
            <View style={s.row}>
              {(["pickup", "delivery"] as const).map((f) => (
                <Button
                  key={f}
                  title={f === "pickup" ? "Pick up at café" : "Delivery nearby"}
                  secondary={fulfilment !== f}
                  disabled={pending || a.busy}
                  onPress={() => setFulfilment(f)}
                />
              ))}
            </View>
            {fulfilment === "delivery" && (
              <>
                <QueryState
                  loading={addresses.loading}
                  error={addresses.error}
                  retry={addresses.reload}
                />
                {addresses.data?.map((ad) => (
                  <Pressable
                    key={ad.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ad.id === addressId }}
                    disabled={pending || a.busy}
                    onPress={() => setAddressId(ad.id ?? "")}
                    style={[
                      s.card,
                      {
                        padding: 13,
                        borderColor:
                          ad.id === addressId ? theme.primary : theme.line,
                      },
                    ]}
                  >
                    <Text style={s.text}>{ad.line}</Text>
                    <Text style={s.muted}>
                      {ad.recipientName} {ad.phone}
                    </Text>
                    {(!ad.recipientName || !ad.phone) && (
                      <Text style={s.error}>
                        Edit this address to add recipient contact.
                      </Text>
                    )}
                  </Pressable>
                ))}
                <Button
                  title="Manage addresses"
                  secondary
                  disabled={pending || a.busy}
                  onPress={() => c.go("addresses")}
                />
                <Text style={s.muted}>
                  Delivery is available within the café’s configured 2–3 km
                  area.
                </Text>
              </>
            )}
            <Toggle
              label="Use rewards (up to 20% of item subtotal)"
              value={useRewards}
              onChange={(v) => {
                if (!pending && !a.busy) setUseRewards(v);
              }}
            />
          </View>
          <QueryState
            loading={quote.loading}
            error={quote.error}
            retry={quote.reload}
          />
          {quote.data && (
            <View style={s.card}>
              <MoneyRow label="Items" value={quote.data.subtotalPaise} />
              <MoneyRow label="Delivery" value={quote.data.deliveryFeePaise} />
              <MoneyRow
                label="Rewards used"
                value={-quote.data.rewardUsedPaise}
              />
              <View style={s.divider} />
              <MoneyRow label="Pay in cash" value={quote.data.totalPaise} />
            </View>
          )}
          {expired && (
            <Text style={s.error}>
              This total expired. Refresh and confirm again.
            </Text>
          )}
          <Button
            title="Refresh total"
            secondary
            disabled={a.busy || pending || quote.loading}
            onPress={quote.reload}
          />
          <Text style={s.muted}>
            Cash on delivery / pickup. Online payments are coming later.
          </Text>
          <Button
            title={a.busy ? "Placing your order…" : "Place COD order"}
            testID="place-order"
            disabled={
              a.busy ||
              pending ||
              loadingPending ||
              !body ||
              !quote.data ||
              quote.loading ||
              !!quote.error ||
              expired ||
              !!pendingError ||
              !quote.data?.quoteToken ||
              outlet.loading ||
              !!outlet.error ||
              outlet.data?.open !== true ||
              (fulfilment === "pickup" && !outlet.data?.pickupAddress)
            }
            onPress={() =>
              void a
                .run(checkout, () => {
                  setPending(false);
                })
                .then(async () => {
                  try {
                    setPending(!!(await c.mutations.pending("checkout")));
                  } catch {
                    setPendingError(
                      "Unable to read checkout recovery. Reopen the basket before retrying.",
                    );
                  }
                })
            }
          />
        </>
      )}
      <Feedback error={a.error} />
      {Boolean(a.error) && (
        <Text style={s.muted}>
          If your connection dropped, check pending checkout or your orders
          before starting another order.
        </Text>
      )}
    </Page>
  );
}
function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.spread}>
      <Text style={s.text}>{label}</Text>
      <Text style={[s.text, { fontFamily: theme.bodyBold }]}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}
