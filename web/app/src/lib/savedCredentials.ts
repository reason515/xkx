const STORAGE_KEY = "xkx.login.saved";

export type SavedAccount = {
  id: string;
  name?: string;
};

type AccountStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Only the account ID may be persisted. Passwords are left to the browser's
 * password manager and are never stored in localStorage.
 */
export function loadSavedAccount(
  storage: AccountStorage = localStorage
): SavedAccount | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedAccount> & { password?: unknown };
    if (typeof parsed.id !== "string" || !parsed.id) return null;

    // Remove passwords saved by earlier versions on the first subsequent load.
    if (typeof parsed.password === "string") {
      storage.setItem(STORAGE_KEY, JSON.stringify({ id: parsed.id, name: parsed.name || "" }));
    }
    return { id: parsed.id, name: parsed.name || "" };
  } catch {
    return null;
  }
}

export function saveAccount(
  account: SavedAccount,
  storage: Pick<Storage, "setItem"> = localStorage
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ id: account.id, name: account.name || "" }));
}

export function clearSavedAccount(
  storage: Pick<Storage, "removeItem"> = localStorage
): void {
  storage.removeItem(STORAGE_KEY);
}
