import { useState } from "react";
import { buildSpeechCommand, type SpeechMode } from "../lib/speech";
import type { Entity } from "../lib/types";
import { ChoiceRow } from "./ChoiceRow";

interface Props {
  nearby: Entity[];
  onClose: () => void;
  onSend: (command: string) => void;
}

const MODES: { id: SpeechMode; label: string; hint: string }[] = [
  { id: "say", label: "公开", hint: "同一地点的人都能听见" },
  { id: "whisper", label: "耳语", hint: "只让身边指定的人听见" },
  { id: "tell", label: "传音", hint: "向在线玩家私下传音" },
  { id: "reply", label: "回复", hint: "回复最近向你传音的人" },
];

export function SpeechSheet({ nearby, onClose, onSend }: Props) {
  const [mode, setMode] = useState<SpeechMode>("say");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = MODES.find((item) => item.id === mode) || MODES[0];

  const submit = () => {
    const command = buildSpeechCommand({ mode, target, message });
    if (!command) {
      setError(
        !message.trim()
          ? "请先写下要说的话。"
          : mode === "whisper"
            ? "请选择耳语对象。"
            : "请填写有效的玩家 ID。"
      );
      return;
    }
    onSend(command);
    onClose();
  };

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet speech-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <div>
            <h3>发言</h3>
            <p className="speech-hint">{selected.hint}</p>
          </div>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>

        <form
          className="speech-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="sheet-scroll">
            <ChoiceRow
              className="speech-modes"
              label="发言方式"
              value={mode}
              options={MODES.map(({ id, label }) => ({ id, label }))}
              onChange={(id) => {
                setMode(id);
                setError("");
              }}
            />

            {mode === "whisper" && (
              <div className="speech-field">
                <span id="speech-whisper-label">耳语对象</span>
                {nearby.length === 0 ? (
                  <p className="speech-empty">附近暂无可耳语的人</p>
                ) : (
                  <div
                    className="chips speech-targets"
                    role="listbox"
                    aria-labelledby="speech-whisper-label"
                  >
                    {nearby.map((person) => {
                      const value = person.commandId || person.id;
                      const on = target === value;
                      return (
                        <button
                          key={person.id}
                          type="button"
                          role="option"
                          aria-selected={on}
                          className={`chip npc${on ? " on" : ""}`}
                          onClick={() => {
                            setTarget(value);
                            setError("");
                          }}
                        >
                          {person.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {mode === "tell" && (
              <label className="speech-field">
                <span>玩家 ID</span>
                <input
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setError("");
                  }}
                  placeholder="对方登录时使用的英文 ID"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            )}

            <label className="speech-field speech-message">
              <span>内容</span>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError("");
                }}
                maxLength={240}
                rows={5}
                placeholder="写下你想说的话……"
                autoFocus
              />
            </label>
            <div className="speech-meta">
              <span className="speech-error" role="alert">
                {error}
              </span>
              <span>{message.length} / 240</span>
            </div>
          </div>
          <div className="sheet-acts">
            <button type="submit" className="go speech-submit">
              说出
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
