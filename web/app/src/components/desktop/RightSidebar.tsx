import { useDesktop } from "../../context/DesktopContext";
import { RuleEditor } from "./RuleEditor";
import { StatusPanel } from "./StatusPanel";

export function RightSidebar() {
  const { rightTab, setRightTab } = useDesktop();

  return (
    <aside className="desktop-right" data-testid="desktop-right">
      <div className="desktop-right-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={rightTab === "rules"}
          className={rightTab === "rules" ? "active" : ""}
          data-testid="desktop-tab-rules"
          onClick={() => setRightTab("rules")}
        >
          规则
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rightTab === "status"}
          className={rightTab === "status" ? "active" : ""}
          data-testid="desktop-tab-status"
          onClick={() => setRightTab("status")}
        >
          状态
        </button>
      </div>
      <div className="desktop-right-body">
        {rightTab === "rules" ? <RuleEditor /> : <StatusPanel />}
      </div>
    </aside>
  );
}
