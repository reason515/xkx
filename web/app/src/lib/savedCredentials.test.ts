import { describe, expect, it } from "vitest";
import {
  clearSavedAccount,
  loadSavedAccount,
  saveAccount,
} from "./savedCredentials";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe("savedCredentials", () => {
  it("saves and loads only the account ID", () => {
    const storage = memoryStorage();
    saveAccount({ id: "hero" }, storage);
    expect(loadSavedAccount(storage)).toEqual({ id: "hero" });
    expect(storage.getItem("xkx.login.saved")).toBe('{"id":"hero"}');
  });

  it("removes passwords saved by earlier versions", () => {
    const storage = memoryStorage();
    storage.setItem("xkx.login.saved", JSON.stringify({ id: "hero", password: "secret" }));
    expect(loadSavedAccount(storage)).toEqual({ id: "hero" });
    expect(storage.getItem("xkx.login.saved")).toBe('{"id":"hero"}');
  });

  it("returns null for empty or corrupt data", () => {
    const storage = memoryStorage();
    expect(loadSavedAccount(storage)).toBeNull();
    storage.setItem("xkx.login.saved", "{");
    expect(loadSavedAccount(storage)).toBeNull();
    storage.setItem("xkx.login.saved", JSON.stringify({ password: "secret" }));
    expect(loadSavedAccount(storage)).toBeNull();
  });

  it("clears the stored account", () => {
    const storage = memoryStorage();
    saveAccount({ id: "hero" }, storage);
    clearSavedAccount(storage);
    expect(loadSavedAccount(storage)).toBeNull();
  });
});
