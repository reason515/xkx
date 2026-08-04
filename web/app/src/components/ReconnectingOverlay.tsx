/** 断线自动重连浮层：游戏界面保持，提示正在重新连接，可手动放弃回登录页。 */
export function ReconnectingOverlay({
  attempt,
  onCancel,
}: {
  attempt: number;
  onCancel: () => void;
}) {
  return (
    <div className="reconnect-overlay" data-testid="reconnect-overlay">
      <div className="reconnect-card" role="alert">
        <div className="reconnect-spinner" aria-hidden="true" />
        <div className="reconnect-title">连接断开，正在重新连接…</div>
        <div className="reconnect-detail">
          第 {attempt} 次尝试，请保持页面开启
        </div>
        <button type="button" className="reconnect-cancel" onClick={onCancel}>
          返回登录
        </button>
      </div>
    </div>
  );
}
