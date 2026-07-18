export type UiMode = "desktop" | "mobile";

export const UI_MODE_KEY = "xkx-ui-mode";

export function readUiMode(): UiMode | null {
  try {
    const v = localStorage.getItem(UI_MODE_KEY);
    if (v === "desktop" || v === "mobile") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeUiMode(mode: UiMode): void {
  try {
    localStorage.setItem(UI_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Prefer stored preference; otherwise suggest by viewport width. */
export function resolveUiMode(viewportWidth = window.innerWidth): UiMode {
  return readUiMode() ?? (viewportWidth >= 1024 ? "desktop" : "mobile");
}
