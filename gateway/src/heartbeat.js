/**
 * WebSocket 保活决策：容忍偶发丢包 / 后台标签页节流 / 短暂网络抖动。
 *
 * 浏览器对协议层 ping 会自动回 pong，但移动网络、WiFi 切换、后台标签页
 * 节流时偶尔会漏掉一帧。旧逻辑丢一帧 pong 就 terminate，导致玩家频繁被
 * 踢回登录页。这里要求连续多次未回 pong 才判定客户端真实死亡。
 */
export const MAX_MISSED_PINGS = 3;

/** 连续 missedPings 次未收到 pong 时判定客户端死亡。 */
export function shouldReapClient(missedPings) {
  return missedPings >= MAX_MISSED_PINGS;
}
