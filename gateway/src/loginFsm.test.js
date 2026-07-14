import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LoginFsm, LoginState } from "./loginFsm.js";

describe("LoginFsm", () => {
  it("responds to BIG5 prompt with n", () => {
    const fsm = new LoginFsm({ id: "test", password: "pass" });
    const reply = fsm.onOutput("Do you want to use BIG5 code?(y/n)");
    assert.equal(reply, "n\n");
    assert.equal(fsm.state, LoginState.BIG5);
  });

  it("responds to id prompt", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.state = LoginState.BIG5;
    const reply = fsm.onOutput("您的英文名字（新玩家可选一喜欢的名字）：");
    assert.equal(reply, "hero\n");
    assert.equal(fsm.state, LoginState.ID);
  });

  it("confirms new character after id", () => {
    const fsm = new LoginFsm({ id: "newbie", password: "12345", name: "测试" });
    fsm.state = LoginState.ID;
    const reply = fsm.onOutput(
      "使用 newbie 这个名字将会创造一个新的人物，您确定吗(y/n)？"
    );
    assert.equal(reply, "y\n");
    assert.equal(fsm.state, LoginState.CONFIRM_NEW);
  });

  it("responds to login password prompt", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.state = LoginState.ID;
    const reply = fsm.onOutput("请输入密码：");
    assert.equal(reply, "secret\n");
    assert.equal(fsm.state, LoginState.PASSWORD);
  });

  it("responds to chinese name then password pair", () => {
    const fsm = new LoginFsm({
      id: "newbie",
      password: "secret1",
      name: "张三",
      gender: "女",
    });
    fsm.state = LoginState.CONFIRM_NEW;
    assert.equal(fsm.onOutput("您的中文名字："), "张三\n");
    assert.equal(fsm.state, LoginState.NAME);
    assert.equal(fsm.onOutput("请设定您的密码："), "secret1\n");
    assert.equal(fsm.state, LoginState.PASSWORD);
    assert.equal(
      fsm.onOutput("请再输入一次您的密码，以确认您没记错："),
      "secret1\n"
    );
    assert.equal(fsm.state, LoginState.CONFIRM_PASSWORD);
  });

  it("accepts gift, email, and gender", () => {
    const fsm = new LoginFsm({
      id: "newbie",
      password: "secret1",
      name: "张三",
      gender: "女",
    });
    fsm.state = LoginState.CONFIRM_PASSWORD;
    assert.equal(fsm.onOutput("您接受这一组天赋吗？"), "y\n");
    assert.equal(fsm.state, LoginState.GIFT);
    assert.equal(fsm.onOutput("您的电子邮件地址："), "newbie@xkx.local\n");
    assert.equal(fsm.state, LoginState.EMAIL);
    assert.equal(
      fsm.onOutput("您要扮演男性(m)的角色或女性(f)的角色？"),
      "f\n"
    );
    assert.equal(fsm.state, LoginState.GENDER);
  });

  it("transitions to in_game on welcome message", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.state = LoginState.GENDER;
    fsm.onOutput("欢迎再次来到侠客行！");
    assert.equal(fsm.isInGame(), true);
    assert.equal(fsm.onOutput("more text"), null);
  });

  it("does not treat lone prompt as in-game during login", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.state = LoginState.BIG5;
    fsm.onOutput("Ok, use GB code.\n\n> ");
    assert.equal(fsm.isInGame(), false);
  });

  it("reset clears state", () => {
    const fsm = new LoginFsm({ id: "hero", password: "secret" });
    fsm.markInGame();
    fsm.reset();
    assert.equal(fsm.state, LoginState.INIT);
    assert.equal(fsm.isInGame(), false);
  });
});
