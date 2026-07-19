export type SpeechMode = "say" | "chat" | "whisper" | "tell" | "reply";

export interface SpeechDraft {
  mode: SpeechMode;
  message: string;
  target?: string;
}

/** Build a safe single-line MUD speech command without exposing syntax in UI. */
export function buildSpeechCommand({
  mode,
  message,
  target = "",
}: SpeechDraft): string | null {
  const body = message.replace(/\s+/g, " ").trim();
  if (!body) return null;
  if (mode === "say") return `say ${body}`;
  if (mode === "chat") return `chat ${body}`;
  if (mode === "reply") return `reply ${body}`;

  const who = target.trim().toLowerCase();
  if (!who) return null;
  if (mode === "whisper") {
    if (!/^[a-z][a-z0-9_\-]*(?:\s+[a-z][a-z0-9_\-]*)*$/i.test(who)) {
      return null;
    }
    // present() resolves common short aliases; multi-word ids must use one token
    // because whisper parses its target as the first whitespace-delimited word.
    const nearbyTarget = who.split(/\s+/).at(-1);
    return `whisper ${nearbyTarget} ${body}`;
  }
  if (!/^[a-z][a-z0-9_\-]*(?:@[a-z][a-z0-9_.\-]*)?$/i.test(who)) {
    return null;
  }
  return `tell ${who} ${body}`;
}
