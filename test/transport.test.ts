import { it, expect, vi } from "vitest";
import {
  ApiClient,
  ApiError,
  Mutations,
  MutationJournal,
  MemoryVault,
} from "../packages/core/src/index";
it("all pages are fetched with an encoded cursor", async () => {
  const calls: string[] = [];
  const api = new ApiClient(
    "https://api.example.test",
    async () => "access",
    async (url) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify(
          calls.length === 1
            ? { items: [{ id: 1 }], cursor: "ORDER#two" }
            : { items: [{ id: 2 }] },
        ),
      );
    },
  );
  expect(await api.all("/v1/orders")).toEqual([{ id: 1 }, { id: 2 }]);
  expect(calls[1]).toContain("?cursor=ORDER%23two");
});
it("repeated cursors fail rather than fetching forever", async () => {
  const a = new ApiClient(
    "https://api.example.test",
    async () => "t",
    async () => new Response(JSON.stringify({ items: [], cursor: "again" })),
  );
  await expect(a.all("/v1/orders")).rejects.toThrow(/repeated/);
});
it("missing authentication never exposes a bearer header in an error", async () => {
  const a = new ApiClient("https://api.example.test", async () => null);
  await expect(a.get("/v1/profile")).rejects.toThrow("Please sign in again.");
});
it("does not follow redirects or send cookies", async () => {
  let init: RequestInit | undefined;
  const a = new ApiClient(
    "https://api.example.test",
    async () => "secret-token",
    async (_, i) => {
      init = i;
      return new Response("{}");
    },
  );
  await a.get("/v1/profile");
  expect(init?.credentials).toBe("omit");
  expect(init?.redirect).toBe("error");
});
it("rejects an unsafe relative path before requesting a token", async () => {
  const token = vi.fn(async () => "t");
  const a = new ApiClient("https://api.example.test", token);
  await expect(a.get("//attacker.test/v1/menu")).rejects.toThrow();
  expect(token).not.toHaveBeenCalled();
});
it("clears a first definitive stock failure, allowing a revised basket", async () => {
  const j = new MutationJournal(new MemoryVault(), () => crypto.randomUUID());
  const a = new ApiClient(
    "https://api.example.test",
    async () => "t",
    async () => new Response('{"error":"insufficient_stock"}', { status: 409 }),
  );
  const m = new Mutations(a, j);
  await expect(
    m.run("checkout", "POST", "/v1/orders", { a: 1 }),
  ).rejects.toBeInstanceOf(ApiError);
  expect(await m.pending("checkout")).toBeNull();
});
it("retains pending actions after a 500 response", async () => {
  const j = new MutationJournal(new MemoryVault(), () => crypto.randomUUID());
  const a = new ApiClient(
    "https://api.example.test",
    async () => "t",
    async () => new Response('{"error":"internal_error"}', { status: 500 }),
  );
  await expect(
    new Mutations(a, j).run("checkout", "POST", "/v1/orders", { a: 1 }),
  ).rejects.toThrow();
  expect(await j.current("checkout")).not.toBeNull();
});
it("successful retry clears the pending journal", async () => {
  let n = 0;
  const j = new MutationJournal(new MemoryVault(), () => crypto.randomUUID());
  const a = new ApiClient(
    "https://api.example.test",
    async () => "t",
    async () => {
      if (n++ === 0) throw new Error("timeout");
      return new Response('{"id":"real-order"}');
    },
  );
  const m = new Mutations(a, j);
  await expect(
    m.run("checkout", "POST", "/v1/orders", { a: 1 }),
  ).rejects.toThrow();
  expect(await m.run("checkout", "POST", "/v1/orders", { a: 1 })).toEqual({
    id: "real-order",
  });
  expect(await j.current("checkout")).toBeNull();
});
