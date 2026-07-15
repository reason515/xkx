import { describe, expect, it } from "vitest";
import {
  clearSavedCredentials,
  loadSavedCredentials,
  saveCredentials,
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
  it("saves and loads id/password", () => {
    const storage = memoryStorage();
    saveCredentials({ id: "hero", password: "secret" }, storage);
    expect(loadSavedCredentials(storage)).toEqual({
      id: "hero",
      password: "secret",
    });
  });

  it("returns null for empty or corrupt data", () => {
    const storage = memoryStorage();
    expect(loadSavedCredentials(storage)).toBeNull();
    storage.setItem("xkx.login.saved", "{");
    expect(loadSavedCredentials(storage)).toBeNull();
    storage.setItem("xkx.login.saved", JSON.stringify({ id: "a" }));
    expect(loadSavedCredentials(storage)).toBeNull();
  });

  it("clears stored credentials", () => {
    const storage = memoryStorage();
    saveCredentials({ id: "hero", password: "secret" }, storage);
    clearSavedCredentials(storage);
    expect(loadSavedCredentials(storage)).toBeNull();
  });
});
