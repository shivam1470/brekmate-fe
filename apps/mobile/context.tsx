import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  ApiClient,
  Mutations,
  Vault,
  CartLine,
  Identity,
} from "@brekmate/core";
export type Screen =
  | "home"
  | "cart"
  | "orders"
  | "order"
  | "wallet"
  | "celebrate"
  | "celebrations"
  | "profile"
  | "addresses"
  | "notifications"
  | "help";
export type CustomerContextValue = {
  screen?: Screen;
  api: ApiClient;
  mutations: Mutations;
  vault: Vault;
  user: Identity;
  cart: CartLine[];
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  go: (screen: Screen, id?: string) => void;
  id?: string;
  signOut: () => void;
  closeSession: () => void;
};
export const CustomerContext = createContext<CustomerContextValue | null>(null);
export function useCustomer() {
  const c = useContext(CustomerContext);
  if (!c) throw new Error("Customer context is required");
  return c;
}
