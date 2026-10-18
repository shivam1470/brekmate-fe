import { useState, useEffect, useRef } from "react";
import { View, Text, Share, Alert, AppState } from "react-native";
import { formatMoney, type CartLine, type Wallet, theme } from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
import { useCustomer } from "./context";
import { Page, Heading, Button, Feedback, QueryState, s } from "./ui";
export function Orders() {
  const c = useCustomer(),
    q = useQuery(() => c.api.orders(), [c.api]);
  const orders = [...(q.data ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <Page>
      <Heading eyebrow="YOUR ORDERS" title="Good breaks, on repeat." />
      <Button
        title="Refresh orders"
        secondary
        disabled={q.loading}
        onPress={q.reload}
      />
      <QueryState
        loading={q.loading && !q.data}
        error={q.error}
        empty={
          orders.length === 0 ? "Your first café break is waiting." : undefined
        }
        retry={q.reload}
      />
      {orders.map((o) => (
        <View key={o.id} style={s.card}>
          <View style={s.spread}>
            <Text style={s.h2}>#{o.id.slice(0, 8)}</Text>
            <Text style={s.text}>{formatMoney(o.totalPaise)}</Text>
          </View>
          <Text style={s.muted}>
            {o.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
          </Text>
          <Text style={s.text}>
            {o.status.replaceAll("_", " ")} · {o.fulfilment}
          </Text>
          <Text style={s.muted}>
            {new Date(o.createdAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST
          </Text>
          <Button
            title="View order"
            secondary
            onPress={() => c.go("order", o.id)}
          />
        </View>
      ))}
    </Page>
  );
}
export function OrderDetail() {
  const c = useCustomer();
  const q = useQuery(() => c.api.order(c.id!), [c.id]);
  const a = useAction();
  const otp = useQuery(async () => {
    const o = q.data;
    if (
      !o ||
      o.fulfilment !== "delivery" ||
      ["delivered", "cancelled", "rejected"].includes(o.status)
    )
      return null;
    return await c.api.get<{ otp: string; expiresAt: number }>(
      `/v1/orders/${o.id}/otp`,
    );
  }, [q.data?.status, c.id]);
  const o = q.data;
  const [clock, setClock] = useState(() => Date.now());
  const refresh = useRef(() => {});
  const reloadOrder = q.reload,
    reloadOtp = otp.reload;
  useEffect(() => {
    refresh.current = () => {
      reloadOrder();
      reloadOtp();
    };
  }, [reloadOrder, reloadOtp]);
  const active =
    c.screen === "order" &&
    !!o &&
    !["cancelled", "rejected"].includes(o.status) &&
    (o.status !== "delivered" || o.paymentStatus !== "collected");
  useEffect(() => {
    if (!active) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh.current();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") refresh.current();
    }, 15000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [active]);
  useEffect(() => {
    if (!otp.data?.expiresAt) return;
    const expiry = otp.data.expiresAt * 1000;
    const timer = setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= expiry) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [otp.data?.expiresAt]);
  const progress =
    o?.fulfilment === "delivery"
      ? [
          "placed",
          "accepted",
          "preparing",
          "ready",
          "out_for_delivery",
          "delivered",
        ]
      : ["placed", "accepted", "preparing", "ready", "delivered"];
  async function reorder() {
    const result = await c.api.request<{
      basket: { lines: CartLine[]; fulfilment: string };
      pricing: unknown;
    }>("POST", `/v1/orders/${o!.id}/reorder`);
    const menu = await c.api.menu();
    const lines = result.basket.lines.map((l) => {
      const p = menu.find((m) => m.sku === l.sku);
      if (!p) throw new Error("An item is no longer available.");
      return {
        ...l,
        name: p.name,
        unitPricePaise: p.pricePaise,
        addOnPaise: l.addons.reduce((n, id) => n + (p.addons[id] ?? 0), 0),
        instructions: l.instructions ?? "",
      };
    });
    c.setCart(lines);
    c.go("cart");
  }
  return (
    <Page>
      <Heading
        eyebrow="ORDER DETAILS"
        title={o ? `#${o.id.slice(0, 8)}` : "Your order"}
      />
      <Button
        title="Refresh status"
        secondary
        onPress={() => {
          q.reload();
          otp.reload();
        }}
      />
      <QueryState loading={q.loading && !o} error={q.error} retry={q.reload} />
      {o && (
        <>
          <View style={s.card}>
            <Text style={s.h2}>
              {["cancelled", "rejected"].includes(o.status)
                ? o.status
                : o.status === "delivered"
                  ? "Enjoy your break!"
                  : o.fulfilment === "pickup"
                    ? "Your café pickup"
                    : "A fresh break is on its way."}
            </Text>
            {!["cancelled", "rejected"].includes(o.status) &&
              progress.map((step, i) => (
                <Text
                  key={step}
                  style={[
                    s.text,
                    {
                      color:
                        i <= progress.indexOf(o.status)
                          ? theme.green
                          : theme.muted,
                    },
                  ]}
                >
                  {i <= progress.indexOf(o.status) ? "●" : "○"}
                  {step.replaceAll("_", " ")}
                </Text>
              ))}
            <Text style={s.muted}>
              Updates are shared by the café and rider. No continuous live
              location is collected.
            </Text>
          </View>
          <View style={s.card}>
            {o.lines.map((l) => (
              <View key={l.sku}>
                <Text style={s.text}>
                  {l.quantity} × {l.name}
                </Text>
                {l.addons.length > 0 && (
                  <Text style={s.muted}>{l.addons.join(", ")}</Text>
                )}
                {Boolean(l.instructions) && (
                  <Text style={s.muted}>{l.instructions}</Text>
                )}
              </View>
            ))}
            <View style={s.divider} />
            <Text style={s.text}>Total {formatMoney(o.totalPaise)}</Text>
            <Text style={s.muted}>
              Rewards used {formatMoney(o.rewardUsedPaise)} · Cash{" "}
              {o.paymentStatus === "collected" ? "received" : "due"}
            </Text>
            {o.address && <Text style={s.muted}>{o.address.line}</Text>}
          </View>
          {o.fulfilment === "delivery" &&
            ["ready", "out_for_delivery"].includes(o.status) && (
              <QueryState
                loading={otp.loading}
                error={otp.error}
                retry={otp.reload}
              />
            )}
          {otp.data && !otp.error && otp.data.expiresAt * 1000 > clock && (
            <View style={s.card}>
              <Text style={s.h2}>Delivery handoff code</Text>
              <Text
                accessibilityLabel={`Delivery code ${otp.data.otp.split("").join(" ")}`}
                style={[s.title, { letterSpacing: 7 }]}
              >
                {otp.data.otp}
              </Text>
              <Text style={s.muted}>
                Share this only when your order arrives. Expires at{" "}
                {new Date(otp.data.expiresAt * 1000).toLocaleTimeString(
                  "en-IN",
                )}
                .
              </Text>
            </View>
          )}
          {o.status === "placed" && (
            <Button
              title="Cancel this order"
              secondary
              disabled={a.busy}
              onPress={() =>
                Alert.alert(
                  "Cancel this order?",
                  "The café will release the reserved items and restore any rewards used.",
                  [
                    { text: "Keep order", style: "cancel" },
                    {
                      text: "Cancel order",
                      style: "destructive",
                      onPress: () =>
                        void a.run(
                          () =>
                            c.mutations.run(
                              "cancel." + o.id,
                              "POST",
                              `/v1/orders/${o.id}/status`,
                              { status: "cancelled" },
                            ),
                          q.reload,
                        ),
                    },
                  ],
                )
              }
            />
          )}
          <Button
            title="Reorder with current prices"
            disabled={a.busy}
            onPress={() => {
              if (c.cart.length)
                Alert.alert(
                  "Replace your basket?",
                  "This will replace the items currently in your basket.",
                  [
                    { text: "Keep basket", style: "cancel" },
                    { text: "Replace", onPress: () => void a.run(reorder) },
                  ],
                );
              else void a.run(reorder);
            }}
          />
          <Button
            title="Need help with this order?"
            secondary
            onPress={() => c.go("help", o.id)}
          />
          <Feedback error={a.error} notice={a.notice} />
        </>
      )}
    </Page>
  );
}
export function Rewards() {
  const c = useCustomer();
  const [older, setOlder] = useState<Wallet["entries"]>([]),
    [next, setNext] = useState<string>();
  const q = useQuery(async () => {
    const wallet = await c.api.wallet();
    setOlder([]);
    setNext(wallet.cursor);
    return wallet;
  }, [c.api]);
  const code = useQuery(
    () => c.api.request<{ code: string }>("POST", "/v1/referral-code"),
    [c.api],
  );
  const a = useAction();
  return (
    <Page>
      <Heading eyebrow="BREKMATE REWARDS" title="Good things come around." />
      <View
        style={[s.card, { backgroundColor: theme.ink, borderColor: theme.ink }]}
      >
        <Text style={[s.muted, { color: "#D0D5DD" }]}>
          Your available rewards
        </Text>
        <Text
          style={[s.title, { color: "#fff", fontSize: 42, lineHeight: 51 }]}
        >
          {q.data ? formatMoney(q.data.balancePaise) : "—"}
        </Text>
        <Text style={[s.muted, { color: "#D0D5DD" }]}>
          Use rewards for up to 20% of your item subtotal.
        </Text>
      </View>
      <QueryState loading={q.loading} error={q.error} retry={q.reload} />
      <View style={s.card}>
        <Text style={s.h2}>Share a better break.</Text>
        <Text style={s.text}>
          Earn ₹100 when your friend’s qualifying first order above ₹99 is
          delivered and payment is collected.
        </Text>
        {code.data && (
          <>
            <Text
              style={[s.text, { fontFamily: theme.bodyBold, letterSpacing: 1 }]}
            >
              {code.data.code}
            </Text>
            <Button
              title="Share my referral code"
              onPress={() =>
                void a.run(() =>
                  Share.share({
                    message: `Try BrekMate. Use my referral code ${code.data!.code} before your first order.`,
                  }),
                )
              }
            />
          </>
        )}
        <QueryState
          loading={code.loading}
          error={code.error}
          retry={code.reload}
        />
      </View>
      <Text style={s.h2}>Reward history</Text>
      {[...(q.data?.entries ?? []), ...older].map((entry, i) => (
        <View key={i} style={s.card}>
          <View style={s.spread}>
            <Text style={[s.text, { flex: 1 }]}>
              {entry.type.replaceAll("_", " ")}
            </Text>
            <Text style={s.text}>{formatMoney(entry.amountPaise)}</Text>
          </View>
          <Text style={s.muted}>
            {new Date(entry.at).toLocaleString("en-IN")}
          </Text>
        </View>
      ))}
      {next && (
        <Button
          title="Load more reward history"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(
              async () => {
                const page = await c.api.get<Wallet>(
                  "/v1/wallet?cursor=" + encodeURIComponent(next!),
                );
                return page;
              },
              (page) => {
                setOlder((old) => [...old, ...page.entries]);
                setNext(page.cursor);
              },
            )
          }
        />
      )}
      <Feedback error={a.error} />
    </Page>
  );
}
