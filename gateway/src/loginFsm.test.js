import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LoginFsm, LoginState } from "./loginFsm.js";

describe("LoginFsm", () => {
  it("responds to BIG5 prompt with n", () => {
    const fsm = new LoginFsm({ id: "test", password: "pass" });
    const reply = fsm.onOutput("Do you want BIG5? (y/n) ");
    assert.equal(reply, "n\n");
    assert.equal(fsm.state, LoginState.BIG5);
  });

  it("responds to id prompt", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    const reply = fsm.onOutput("Please enter your id: ");
    assert.equal(reply, "hero\n");
    assert.equal(fsm.state, LoginState.ID);
  });

  it("responds to password prompt", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.state = LoginState.ID;
    const reply = fsm.onOutput("请输入密码 password: ");
    assert.equal(reply, "secret\n");
    assert.equal(fsm.state, LoginState.PASSWORD);
  });

  it("confirms new character after password", () => {
    const fsm = new LoginFsm({ id: "newbie", password: "1234" });
    fsm.state = LoginState.PASSWORD;
    fsm.buffer = "";
    const reply = fsm.onOutput("确认创建新角色? (y/n) ");
    assert.equal(reply, "y\n");
    assert.equal(fsm.state, LoginState.CONFIRM_NEW);
  });

  it("responds to name prompt", () => {
    const fsm = new LoginFsm({ name: "张三", gender: "女" });
    const reply = fsm.onOutput("请输入中文名字: ");
    assert.equal(reply, "张三\n");
    assert.equal(fsm.state, LoginState.NAME);
  });

  it("responds to gender prompt", () => {
    const fsm = new LoginFsm({ name: "张三", gender: "女" });
    const reply = fsm.onOutput("请选择性别 gender: ");
    assert.equal(reply, "female\n");
    assert.equal(fsm.state, LoginState.GENDER);
  });

  it("transitions to in_game on welcome message", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.onOutput("欢迎再次来到侠客行！");
    assert.equal(fsm.isInGame(), true);
    assert.equal(fsm.onOutput("more text"), null);
  });

  it("reset clears state", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.markInGame();
    fsm.reset();
    assert.equal(fsm.state, LoginState.INIT);
    assert.equal(fsm.isInGame(), false);
  });
});
