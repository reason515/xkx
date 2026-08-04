/**
 * 断线自动重连退避策略（毫秒）。
 *
 * 游戏过程中网络抖动 / 网关重启 / 心跳误杀都会断开 WebSocket；MUD 侧角色
 * 断线后保留 15 分钟（NET_DEAD_TIMEOUT=900s），重登即可无缝恢复。
 * 前端收到断线后按本策略自动重登，最多 6 次 ≈ 62s，仍失败才回登录页。
 */
export const RECONNECT_DELAYS_MS = [2000, 4000, 8000, 12000, 16000, 20000];

export const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS_MS.length;

/** 第 attempt 次尝试前的等待时间（attempt 从 1 开始）。 */
export function nextReconnectDelay(attempt: number): number {
  const idx = attempt - 1;
  if (idx < 0) return RECONNECT_DELAYS_MS[0];
  return RECONNECT_DELAYS_MS[Math.min(idx, RECONNECT_DELAYS_MS.length - 1)];
}

/** 超过最大尝试次数时放弃自动重连，回登录页。 */
export function shouldGiveUpReconnect(attempt: number): boolean {
  return attempt >= MAX_RECONNECT_ATTEMPTS;
}
