import { it, expect } from "vitest";
import {
  ApiClient,
  MemoryVault,
  MutationJournal,
  Mutations,
} from "../packages/core/src/index";
it("retains uncertain checkout key when later authentication fails", async () => {
  const vault = new MemoryVault(),
    journal = new MutationJournal(vault, () => "stable-mutation-key");
  let calls = 0;
  const api = new ApiClient(
    "https://api.example.test",
    async () => "token",
    async () => {
      if (calls++ === 0) throw new Error("network lost");
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
      });
    },
  );
  const m = new Mutations(api, journal);
  await expect(
    m.run("checkout", "POST", "/v1/orders", { a: 1 }),
  ).rejects.toThrow();
  const old = await journal.current("checkout");
  await expect(
    m.run("checkout", "POST", "/v1/orders", { a: 1 }),
  ).rejects.toThrow();
  expect((await journal.current("checkout"))?.key).toBe(old?.key);
});
it("can replay bodyless requests using the same key", async () => {
  const vault = new MemoryVault(),
    journal = new MutationJournal(vault, () => "stable-mutation-key");
  const a = await journal.prepare("delete", undefined);
  expect((await journal.prepare("delete", undefined)).key).toBe(a.key);
});
it("parallel preparation creates only one pending operation", async () => {
  let i = 0;
  const j = new MutationJournal(new MemoryVault(), () => "stable-key-" + i++);
  const all = await Promise.all(
    Array.from({ length: 8 }, () => j.prepare("checkout", { a: 1 })),
  );
  expect(new Set(all.map((x) => x.key)).size).toBe(1);
});
it("shows a known successful order even when local journal cleanup fails", async () => {
  class FailingCleanup extends MemoryVault {
    async removeItem(key: string) {
      await super.removeItem(key);
      throw new Error("OS storage cleanup failed");
    }
  }
  const vault = new FailingCleanup();
  const j = new MutationJournal(vault, () => "cleanup-key-0001");
  const api = new ApiClient(
    "https://api.example.test",
    async () => "token",
    async () => new Response('{"id":"accepted-order"}'),
  );
  await expect(
    new Mutations(api, j).run("checkout", "POST", "/v1/orders", { a: 1 }),
  ).resolves.toEqual({ id: "accepted-order" });
});
