// Test-only React Native Web renderer. Not a customer website or production entry.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { View, Text, Pressable } from "react-native";
import {
  ApiClient,
  MemoryVault,
  Mutations,
  MutationJournal,
  type CartLine,
} from "../packages/core/src/index";
import { CustomerContext } from "../apps/mobile/context";
import { Menu } from "../apps/mobile/Menu";
import { Cart } from "../apps/mobile/Cart";
import "../apps/staff/src/styles.css";
const api = new ApiClient(
  "https://api.brekmate.test",
  async () => "fixture-only-access",
);
const vault = new MemoryVault();
const mutations = new Mutations(
  api,
  new MutationJournal(vault, () => crypto.randomUUID()),
);
function Preview() {
  const [cart, setCart] = useState<CartLine[]>([]),
    [screen, setScreen] = useState("home");
  return (
    <div
      style={{
        height: "100dvh",
        maxWidth: 440,
        margin: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 60,
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          background: "white",
          alignItems: "center",
        }}
      >
        <strong style={{ fontFamily: "Bodoni", fontSize: 28 }}>
          BrekMate<span style={{ color: "#FF5C1A" }}>.</span>
        </strong>
        <button onClick={() => setScreen(screen === "cart" ? "home" : "cart")}>
          Basket · {cart.reduce((n, l) => n + l.quantity, 0)}
        </button>
      </div>
      <CustomerContext.Provider
        value={{
          api,
          vault,
          mutations,
          user: { id: "fixture", roles: [] },
          cart,
          setCart,
          go: (next) => setScreen(next),
          signOut: () => {},
          closeSession: () => {},
        }}
      >
        {screen === "cart" ? <Cart /> : <Menu />}
      </CustomerContext.Provider>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
