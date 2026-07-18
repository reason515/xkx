import { useState } from "react";
import { useDesktop } from "../../context/DesktopContext";

export function CommandInput() {
  const { sendCommand, history } = useDesktop();
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendCommand(text);
    setDraft("");
    history.resetBrowse();
  };

  return (
    <form
      className="desktop-cmd"
      data-testid="desktop-cmd"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <span className="desktop-cmd-prompt" aria-hidden>
        &gt;
      </span>
      <input
        type="text"
        className="desktop-cmd-input"
        data-testid="desktop-cmd-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setDraft(history.up(draft));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setDraft(history.down(draft));
          }
        }}
        placeholder="输入指令…"
        aria-label="指令"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="desktop-cmd-send">
        发送
      </button>
    </form>
  );
}
