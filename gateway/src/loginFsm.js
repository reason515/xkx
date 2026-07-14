/** Automate mud login prompts for web clients.
 *  Sequence matches adm/daemons/logind.c:
 *  register: BIG5 → id → confirm create → 中文名 → password ×2 → gift → email → gender
 *  login:    BIG5 → id → password → (optional replace) → in-game
 */

export const LoginState = {
  INIT: "init",
  BIG5: "big5",
  ID: "id",
  CONFIRM_NEW: "confirm_new",
  NAME: "name",
  PASSWORD: "password",
  CONFIRM_PASSWORD: "confirm_password",
  GIFT: "gift",
  EMAIL: "email",
  GENDER: "gender",
  CONFIRM_RELOGIN: "confirm_relogin",
  IN_GAME: "in_game",
};

const BIG5_PROMPT = /Do you want to use BIG5|BIG5 code\?\(y\/n\)/i;
const ID_PROMPT = /英文名字/;
const CONFIRM_NEW_PROMPT = /创造一个新的人物.*确定吗|将会创造一个新的人物/;
const NAME_PROMPT = /中文名字/;
const LOGIN_PASS_PROMPT = /请输入密码/;
const NEW_PASS_PROMPT = /请设定您的密码|请重设您的密码|重新设定一次密码/;
const CONFIRM_PASS_PROMPT = /请再输入一次您的密码/;
const GIFT_PROMPT = /接受这一组天赋|同意这一组天赋/;
const EMAIL_PROMPT = /电子邮件地址/;
const GENDER_PROMPT = /男性\(m\).*女性\(f\)|只能选择男性\(m\)或女性\(f\)/;
const RELOGIN_PROMPT = /赶出去，取而代之/;
const IN_GAME_HINT =
  /重新连线|进入世界|欢迎你来到|欢迎再次|进入游戏|目前所在/m;

function genderReply(gender) {
  if (gender === "女" || gender === "female" || gender === "f") return "f\n";
  return "m\n";
}

export class LoginFsm {
  constructor(credentials) {
    this.credentials = credentials || {};
    this.state = LoginState.INIT;
    this.buffer = "";
  }

  reset() {
    this.state = LoginState.INIT;
    this.buffer = "";
  }

  email() {
    const id = this.credentials.id || "player";
    return this.credentials.email || `${id}@xkx.local`;
  }

  onOutput(text) {
    this.buffer += text;
    const tail = this.buffer.slice(-1200);

    if (this.state === LoginState.IN_GAME) return null;

    if (this.state === LoginState.INIT && BIG5_PROMPT.test(tail)) {
      this.state = LoginState.BIG5;
      return "n\n";
    }

    if (
      (this.state === LoginState.INIT || this.state === LoginState.BIG5) &&
      ID_PROMPT.test(tail) &&
      this.credentials.id
    ) {
      this.state = LoginState.ID;
      return `${this.credentials.id}\n`;
    }

    // New character: confirm after id, before name/password
    if (
      this.state === LoginState.ID &&
      CONFIRM_NEW_PROMPT.test(tail)
    ) {
      this.state = LoginState.CONFIRM_NEW;
      return "y\n";
    }

    // Existing character login password
    if (
      this.state === LoginState.ID &&
      LOGIN_PASS_PROMPT.test(tail) &&
      this.credentials.password
    ) {
      this.state = LoginState.PASSWORD;
      return `${this.credentials.password}\n`;
    }

    if (
      this.state === LoginState.CONFIRM_NEW &&
      NAME_PROMPT.test(tail) &&
      this.credentials.name
    ) {
      this.state = LoginState.NAME;
      return `${this.credentials.name}\n`;
    }

    if (
      this.state === LoginState.NAME &&
      NEW_PASS_PROMPT.test(tail) &&
      this.credentials.password
    ) {
      this.state = LoginState.PASSWORD;
      return `${this.credentials.password}\n`;
    }

    if (
      this.state === LoginState.PASSWORD &&
      CONFIRM_PASS_PROMPT.test(tail) &&
      this.credentials.password
    ) {
      this.state = LoginState.CONFIRM_PASSWORD;
      return `${this.credentials.password}\n`;
    }

    if (
      (this.state === LoginState.CONFIRM_PASSWORD ||
        this.state === LoginState.PASSWORD) &&
      GIFT_PROMPT.test(tail)
    ) {
      this.state = LoginState.GIFT;
      return "y\n";
    }

    if (this.state === LoginState.GIFT && EMAIL_PROMPT.test(tail)) {
      this.state = LoginState.EMAIL;
      return `${this.email()}\n`;
    }

    if (
      (this.state === LoginState.EMAIL || this.state === LoginState.GIFT) &&
      GENDER_PROMPT.test(tail)
    ) {
      this.state = LoginState.GENDER;
      return genderReply(this.credentials.gender);
    }

    if (
      this.state === LoginState.PASSWORD &&
      RELOGIN_PROMPT.test(tail)
    ) {
      this.state = LoginState.CONFIRM_RELOGIN;
      return "y\n";
    }

    // Do NOT treat lone "> " as in-game — appears during login banners
    if (
      this.state !== LoginState.INIT &&
      this.state !== LoginState.BIG5 &&
      this.state !== LoginState.ID &&
      IN_GAME_HINT.test(tail)
    ) {
      this.state = LoginState.IN_GAME;
    }

    return null;
  }

  markInGame() {
    this.state = LoginState.IN_GAME;
  }

  isInGame() {
    return this.state === LoginState.IN_GAME;
  }
}
