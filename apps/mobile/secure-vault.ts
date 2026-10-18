import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { Vault } from "@brekmate/core";
export class SecureVault implements Vault {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private namespace: string) {}
  private key(key: string) {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      this.namespace + ":" + key,
    ).then((h) => "brekmate." + h);
  }
  private index() {
    return "brekmate.index." + this.namespace;
  }
  private lock<T>(fn: () => Promise<T>) {
    const job = this.queue.then(fn, fn);
    this.queue = job.catch(() => {});
    return job;
  }
  async getItem(key: string) {
    await this.queue;
    return SecureStore.getItemAsync(await this.key(key));
  }
  async setItem(key: string, value: string) {
    return this.lock(async () => {
      const hashed = await this.key(key);
      const keys = JSON.parse(
        (await SecureStore.getItemAsync(this.index())) ?? "[]",
      ) as string[];
      if (!keys.includes(hashed)) {
        keys.push(hashed);
        await SecureStore.setItemAsync(this.index(), JSON.stringify(keys), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
      await SecureStore.setItemAsync(hashed, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });
  }
  async removeItem(key: string) {
    return this.lock(async () => {
      const hashed = await this.key(key);
      await SecureStore.deleteItemAsync(hashed);
      const keys = JSON.parse(
        (await SecureStore.getItemAsync(this.index())) ?? "[]",
      ) as string[];
      await SecureStore.setItemAsync(
        this.index(),
        JSON.stringify(keys.filter((k) => k !== hashed)),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
      );
    });
  }
  async clear() {
    return this.lock(async () => {
      const keys = JSON.parse(
        (await SecureStore.getItemAsync(this.index())) ?? "[]",
      ) as string[];
      for (const k of keys) await SecureStore.deleteItemAsync(k);
      await SecureStore.deleteItemAsync(this.index());
    });
  }
}
