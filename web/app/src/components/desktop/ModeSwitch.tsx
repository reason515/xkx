import type { UiMode } from "../../lib/uiMode";

type Props = {
  mode: UiMode;
  onChange: (mode: UiMode) => void;
};

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="mode-switch" data-testid="mode-switch">
      <button
        type="button"
        className={mode === "mobile" ? "active" : ""}
        data-testid="mode-mobile"
        onClick={() => onChange("mobile")}
      >
        移动
      </button>
      <button
        type="button"
        className={mode === "desktop" ? "active" : ""}
        data-testid="mode-desktop"
        onClick={() => onChange("desktop")}
      >
        桌面
      </button>
    </div>
  );
}
