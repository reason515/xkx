import { useEffect, useState } from "react";

/** 主界面挂机状态条：挂机中显示进度；挂机停止原因也在此展示（不弹 toast）。 */
export function GrindBanner({
  active,
  status,
  onStop,
}: {
  active: boolean;
  status: string;
  onStop: () => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  // 新一轮挂机开始时，重置「已读」的停止原因
  useEffect(() => {
    if (active) setDismissed(null);
  }, [active]);

  const running = active && /挂机/.test(status || "");
  const ended =
    !active &&
    !!status &&
    status !== "已停止" &&
    status !== "手动停止" &&
    status !== dismissed;
  if (!running && !ended) return null;

  return (
    <div className="grind-banner" data-testid="grind-banner">
      <span className="grind-banner-text">{status}</span>
      {running ? (
        <button type="button" className="grind-banner-stop" onClick={onStop}>
          停止
        </button>
      ) : (
        <button
          type="button"
          className="grind-banner-stop"
          onClick={() => setDismissed(status)}
        >
          知道了
        </button>
      )}
    </div>
  );
}
