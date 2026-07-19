import { describe, expect, it } from "vitest";
import { buildSpeechCommand } from "./speech";

describe("buildSpeechCommand", () => {
  it("builds public, chat, nearby whisper, tell and reply commands", () => {
    expect(buildSpeechCommand({ mode: "say", message: "  大家好  " })).toBe(
      "say 大家好"
    );
    expect(buildSpeechCommand({ mode: "chat", message: "岛上可好" })).toBe(
      "chat 岛上可好"
    );
    expect(
      buildSpeechCommand({
        mode: "whisper",
        target: "Yu Fu",
        message: "借一步说话",
      })
    ).toBe("whisper fu 借一步说话");
    expect(
      buildSpeechCommand({ mode: "tell", target: "player_1", message: "在吗" })
    ).toBe("tell player_1 在吗");
    expect(buildSpeechCommand({ mode: "reply", message: "收到" })).toBe(
      "reply 收到"
    );
  });

  it("rejects empty text and unsafe free-form tell targets", () => {
    expect(buildSpeechCommand({ mode: "say", message: " \n " })).toBeNull();
    expect(
      buildSpeechCommand({
        mode: "tell",
        target: "somebody quit",
        message: "测试",
      })
    ).toBeNull();
  });
});
