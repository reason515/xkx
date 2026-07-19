import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createToastScheduler,
  toastDurationMs,
} from "./toastScheduler";

describe("toastScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("estimates longer copy needs more time", () => {
    expect(toastDurationMs("已存档")).toBe(3200);
    expect(toastDurationMs("精力不足，无法赶路")).toBeGreaterThan(
      toastDurationMs("已存档")
    );
  });

  it("keeps the latest toast when an older timer fires", () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const toast = createToastScheduler((m) => {
      seen.push(m);
    });

    toast.show("第一则", { durationMs: 2000 });
    vi.advanceTimersByTime(1000);
    toast.show("第二则", { durationMs: 3000 });
    vi.advanceTimersByTime(1500); // would have cleared first toast
    expect(seen.at(-1)).toBe("第二则");
    vi.advanceTimersByTime(2000);
    expect(seen.at(-1)).toBe("");
  });

  it("does not reset timer for the same message", () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const toast = createToastScheduler((m) => {
      seen.push(m);
    });

    toast.showUnlessSame("挂机中 · 石壁领悟", { durationMs: 4000 });
    vi.advanceTimersByTime(2000);
    toast.showUnlessSame("挂机中 · 石壁领悟", { durationMs: 4000 });
    vi.advanceTimersByTime(2500);
    expect(seen.at(-1)).toBe("");
  });
});
