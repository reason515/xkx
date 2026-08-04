import { describe, expect, it } from "vitest";
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_DELAYS_MS,
  nextReconnectDelay,
  shouldGiveUpReconnect,
} from "./reconnect";

describe("reconnect backoff", () => {
  it("退避间隔随尝试次数递增", () => {
    expect(nextReconnectDelay(1)).toBe(2000);
    expect(nextReconnectDelay(2)).toBe(4000);
    expect(nextReconnectDelay(3)).toBe(8000);
    expect(nextReconnectDelay(4)).toBe(12000);
  });

  it("超过上限后取最后一个间隔（不再增长）", () => {
    expect(nextReconnectDelay(MAX_RECONNECT_ATTEMPTS + 5)).toBe(
      RECONNECT_DELAYS_MS[RECONNECT_DELAYS_MS.length - 1]
    );
    expect(nextReconnectDelay(0)).toBe(RECONNECT_DELAYS_MS[0]);
  });

  it("达到最大尝试次数即放弃", () => {
    expect(shouldGiveUpReconnect(MAX_RECONNECT_ATTEMPTS)).toBe(true);
    expect(shouldGiveUpReconnect(MAX_RECONNECT_ATTEMPTS + 1)).toBe(true);
    expect(shouldGiveUpReconnect(MAX_RECONNECT_ATTEMPTS - 1)).toBe(false);
    expect(shouldGiveUpReconnect(0)).toBe(false);
  });
});
