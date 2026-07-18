interface Props {
  text: string;
  onDismiss: () => void;
}

/** Situational tip under room title — not a step-by-step tutorial. */
export function GuideTip({ text, onDismiss }: Props) {
  return (
    <div className="guide-tip" role="status" data-testid="guide-tip">
      <p className="guide-tip-text">{text}</p>
      <button
        type="button"
        className="guide-tip-dismiss"
        aria-label="知道了"
        onClick={onDismiss}
      >
        知道了
      </button>
    </div>
  );
}
