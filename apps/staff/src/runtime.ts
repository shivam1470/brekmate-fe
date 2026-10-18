import {
  ApiClient,
  MemoryVault,
  MutationJournal,
  Mutations,
} from "@brekmate/core";
import { configureIdentity, accessToken } from "@brekmate/core/auth";
export function createRuntime() {
  const base = import.meta.env.VITE_API_ORIGIN ?? "";
  const pool = import.meta.env.VITE_STAFF_POOL_ID ?? "";
  const client = import.meta.env.VITE_STAFF_CLIENT_ID ?? "";
  const tokens = new MemoryVault();
  configureIdentity(pool, client, tokens);
  const api = new ApiClient(base, accessToken);
  const journals = new Map<string, MutationJournal>();
  return {
    api,
    mutations(userId: string) {
      if (!journals.has(userId))
        journals.set(
          userId,
          new MutationJournal(new MemoryVault(), () => crypto.randomUUID()),
        );
      return new Mutations(api, journals.get(userId)!);
    },
  };
}
