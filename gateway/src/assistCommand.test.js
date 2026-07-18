import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAssistCommand } from "./assistCommand.js";

describe("buildAssistCommand", () => {
  it("builds one-time learn by default", () => {
    assert.equal(
      buildAssistCommand({ mode: "learn", teacher: "dizi", skill: "strike" }),
      "webassist learn dizi strike count 1 1"
    );
  });

  it("builds learn-until-potential and rejects unsafe tokens", () => {
    assert.equal(
      buildAssistCommand({
        mode: "learn",
        teacher: "shi",
        skill: "literate",
        stopWhen: "potential",
      }),
      "webassist learn shi literate potential 1 1"
    );
    assert.equal(
      buildAssistCommand({
        mode: "learn",
        teacher: "shi;quit",
        skill: "literate",
      }),
      null
    );
  });

  it("requires the enabled basic slot for practice", () => {
    assert.equal(
      buildAssistCommand({
        mode: "lian",
        skill: "strike",
        stopWhen: "count",
        stopCount: 3,
        stopOnCombat: true,
      }),
      "webassist train lian count 3 1 strike"
    );
    assert.equal(buildAssistCommand({ mode: "lian" }), null);
  });
});
