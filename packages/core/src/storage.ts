export interface Vault {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
export class MemoryVault implements Vault {
  private data = new Map<string, string>();
  async getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  async removeItem(k: string) {
    this.data.delete(k);
  }
  async clear() {
    this.data.clear();
  }
}
const canonical = (v: any): string =>
  Array.isArray(v)
    ? "[" + v.map(canonical).join(",") + "]"
    : v && typeof v === "object"
      ? "{" +
        Object.keys(v)
          .sort()
          .filter((k) => v[k] !== undefined)
          .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
          .join(",") +
        "}"
      : JSON.stringify(v);
export type PendingMutation = { key: string; body: unknown; createdAt: string };
export class MutationJournal {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(
    private vault: Vault,
    private newId: () => string,
  ) {}
  private async locked<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.serial.then(fn, fn);
    this.serial = next.catch(() => {});
    return next;
  }
  async prepare(
    scope: string,
    body: unknown,
  ): Promise<PendingMutation & { fresh: boolean }> {
    return this.locked(async () => {
      const normalized =
        body === undefined ? null : JSON.parse(JSON.stringify(body));
      const k = "mutation." + scope,
        raw = await this.vault.getItem(k);
      if (raw) {
        const previous = JSON.parse(raw) as PendingMutation;
        if (canonical(previous.body) !== canonical(normalized))
          throw new Error(
            "A pending action needs to be retried or checked before changing its details.",
          );
        return { ...previous, fresh: false };
      }
      const pending = {
        key: this.newId(),
        body: normalized,
        createdAt: new Date().toISOString(),
      };
      await this.vault.setItem(k, JSON.stringify(pending));
      return { ...pending, fresh: true };
    });
  }
  async current(scope: string) {
    const raw = await this.vault.getItem("mutation." + scope);
    return raw ? (JSON.parse(raw) as PendingMutation) : null;
  }
  async complete(scope: string, expectedKey?: string) {
    return this.locked(async () => {
      if (expectedKey && (await this.current(scope))?.key !== expectedKey)
        return;
      await this.vault.removeItem("mutation." + scope);
    });
  }
}
