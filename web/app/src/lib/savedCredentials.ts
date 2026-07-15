const STORAGE_KEY = "xkx.login.saved";

export type SavedCredentials = {
  id: string;
  password: string;
};

export function loadSavedCredentials(
  storage: Pick<Storage, "getItem"> = localStorage
): SavedCredentials | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedCredentials>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.password !== "string" ||
      !parsed.id
    ) {
      return null;
    }
    return { id: parsed.id, password: parsed.password };
  } catch {
    return null;
  }
}

export function saveCredentials(
  creds: SavedCredentials,
  storage: Pick<Storage, "setItem"> = localStorage
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

export function clearSavedCredentials(
  storage: Pick<Storage, "removeItem"> = localStorage
): void {
  storage.removeItem(STORAGE_KEY);
}
