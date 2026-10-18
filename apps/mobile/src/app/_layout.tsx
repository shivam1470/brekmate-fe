import { useState, useEffect, useMemo } from "react";
import {
  Stack,
  useRouter,
  usePathname,
  useGlobalSearchParams,
  type Href,
} from "expo-router";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { identity, signOut } from "@brekmate/core/auth";
import { theme, type Identity, type CartLine } from "@brekmate/core";
import { createRuntime } from "../../runtime";
import { CustomerContext, type Screen } from "../../context";
import { Auth } from "../../Auth";

import { s } from "../../ui";
let runtime: ReturnType<typeof createRuntime> | undefined;
try {
  runtime = createRuntime();
} catch {}
export default function RootLayout() {
  const [fonts, fontError] = useFonts({
    Lato: require("../../../../assets/fonts/Lato-Regular.ttf"),
    LatoBold: require("../../../../assets/fonts/Lato-Bold.ttf"),
    Bodoni: require("../../../../assets/fonts/Bodoni-Bold.ttf"),
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.surface }}>
        {!fonts && !fontError ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <Session />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function Session() {
  const [user, setUser] = useState<Identity | null>(null),
    [checking, setChecking] = useState(Boolean(runtime));
  const ready = () => {
    void identity()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  };
  useEffect(() => {
    if (runtime) ready();
  }, []);
  if (!runtime)
    return (
      <View style={{ padding: 30, gap: 15 }}>
        <Text style={s.title}>BrekMate</Text>
        <Text style={s.h2}>App setup required</Text>
        <Text style={s.text}>
          The API and customer identity settings must be configured before this
          app can connect to the café.
        </Text>
      </View>
    );
  if (checking)
    return (
      <ActivityIndicator
        color={theme.primary}
        accessibilityLabel="Opening BrekMate"
      />
    );
  if (!user) return <Auth onReady={ready} />;
  return (
    <Customer
      key={user.id}
      user={user}
      leave={() => {
        void signOut().finally(() => setUser(null));
      }}
    />
  );
}
function Customer({ user, leave }: { user: Identity; leave: () => void }) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useGlobalSearchParams<{ id?: string; orderId?: string }>();
  const screen: Screen =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/order/")
        ? "order"
        : pathname === "/account"
          ? "profile"
          : pathname === "/rewards"
            ? "wallet"
            : (pathname.slice(1) as Screen);
  const id =
    screen === "order"
      ? params.id
      : screen === "help"
        ? params.orderId
        : undefined;
  const [cart, setCart] = useState<CartLine[]>([]);
  const session = useMemo(() => runtime!.forUser(user.id), [user.id]);
  function go(next: Screen, identifier?: string) {
    const paths: Record<Screen, string> = {
      home: "/",
      cart: "/cart",
      orders: "/orders",
      order: "/order/[id]",
      wallet: "/rewards",
      celebrate: "/celebrate",
      celebrations: "/celebrations",
      profile: "/account",
      addresses: "/addresses",
      notifications: "/notifications",
      help: "/help",
    };
    router.push({
      pathname: paths[next],
      params: identifier
        ? next === "order"
          ? { id: identifier }
          : { orderId: identifier }
        : {},
    } as Href);
  }
  useEffect(() => {
    router.replace("/");
  }, [user.id, router]);
  const count = cart.reduce((n, l) => n + l.quantity, 0);
  const logout = () =>
    Alert.alert(
      "Sign out of BrekMate?",
      "Any pending checkout remains linked to this account. Sign in to the same account to recover it.",
      [
        { text: "Stay signed in", style: "cancel" },
        { text: "Sign out", onPress: leave },
      ],
    );
  const tabs = [
    { id: "home" as const, label: "Menu", glyph: "⌂" },
    { id: "orders" as const, label: "Orders", glyph: "▤" },
    { id: "celebrate" as const, label: "Celebrate", glyph: "✦" },
    { id: "wallet" as const, label: "Rewards", glyph: "◇" },
    { id: "profile" as const, label: "Account", glyph: "○" },
  ];
  return (
    <CustomerContext.Provider
      value={{
        api: runtime!.api,
        screen,
        ...session,
        user,
        cart,
        setCart,
        go,
        id,
        signOut: logout,
        closeSession: leave,
      }}
    >
      <View style={styles.header}>
        <View style={s.row}>
          {!tabs.some((t) => t.id === screen) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to menu"
              hitSlop={12}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            >
              <Text style={{ fontSize: 23, color: theme.ink }}>‹</Text>
            </Pressable>
          )}
          <Text style={styles.wordmark}>
            BrekMate<Text style={{ color: theme.primary }}>.</Text>
          </Text>
        </View>
        <View style={s.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            onPress={() => go("notifications")}
          >
            <Text style={styles.headerLink}>Updates</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Basket, ${count} items`}
            onPress={() => go("cart")}
            style={styles.basket}
          >
            <Text style={styles.basketText}>Basket · {count}</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <View style={styles.nav}>
        {tabs.map((t) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: screen === t.id }}
            accessibilityLabel={t.label}
            onPress={() => go(t.id)}
            key={t.id}
            style={styles.tab}
          >
            <Text style={[styles.glyph, screen === t.id && styles.active]}>
              {t.glyph}
            </Text>
            <Text style={[styles.tabText, screen === t.id && styles.active]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </CustomerContext.Provider>
  );
}
const styles = StyleSheet.create({
  header: {
    height: 65,
    paddingHorizontal: 19,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: theme.line,
  },
  wordmark: {
    fontFamily: theme.display,
    fontSize: 27,
    letterSpacing: -0.9,
    color: theme.ink,
  },
  headerLink: { fontFamily: theme.bodyBold, fontSize: 11, color: theme.muted },
  basket: {
    backgroundColor: "#FFF0E7",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  basketText: {
    fontFamily: theme.bodyBold,
    fontSize: 11,
    color: theme.primaryDark,
  },
  nav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: theme.line,
    paddingTop: 8,
    paddingBottom: 5,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 51,
  },
  glyph: { fontSize: 22, color: theme.muted },
  tabText: { fontFamily: theme.bodyBold, fontSize: 10, color: theme.muted },
  active: { color: theme.primaryDark },
});
