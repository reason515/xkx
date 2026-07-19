/** 主界面挂机状态条：开始挂机后关闭浮层，在此显示进度并可停止 */
export function GrindBanner({
  active,
  status,
  onStop,
}: {
  active: boolean;
  status: string;
  onStop: () => void;
}) {
  const grinding = active && /挂机/.test(status || "");
  if (!grinding) return null;

  return (
    <div className="grind-banner" data-testid="grind-banner">
      <span className="grind-banner-text">{status || "挂机中"}</span>
      <button type="button" className="grind-banner-stop" onClick={onStop}>
        停止
      </button>
    </div>
  );
}
