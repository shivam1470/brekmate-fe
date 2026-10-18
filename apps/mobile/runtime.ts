import { ApiClient, MutationJournal, Mutations } from "@brekmate/core";
import { configureIdentity, accessToken } from "@brekmate/core/auth";
import { SecureVault } from "./secure-vault";
import * as Crypto from "expo-crypto";
export function createRuntime() {
  configureIdentity(
    process.env.EXPO_PUBLIC_CUSTOMER_POOL_ID ?? "",
    process.env.EXPO_PUBLIC_CUSTOMER_CLIENT_ID ?? "",
    new SecureVault("identity"),
  );
  const api = new ApiClient(
    process.env.EXPO_PUBLIC_API_ORIGIN ?? "",
    accessToken,
    fetch,
    __DEV__,
  );
  return {
    api,
    forUser(id: string) {
      const vault = new SecureVault("customer-" + id);
      return {
        mutations: new Mutations(
          api,
          new MutationJournal(vault, () => Crypto.randomUUID()),
        ),
        vault,
      };
    },
  };
}
