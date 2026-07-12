/** Automate mud login prompts for web clients. */

export const LoginState = {
  INIT: "init",
  BIG5: "big5",
  ID: "id",
  PASSWORD: "password",
  CONFIRM_NEW: "confirm_new",
  NAME: "name",
  GENDER: "gender",
  IN_GAME: "in_game",
};

const BIG5_PROMPT = /BIG5|繁体|gb code/i;
const ID_PROMPT = /英文名字|your id|id\)/i;
const PASS_PROMPT = /密码|password/i;
const CONFIRM_PROMPT = /确认|confirm|y\/n/i;
const NAME_PROMPT = /中文名字|chinese name|你的名字/i;
const GENDER_PROMPT = /性别|gender|male|female/i;

export class LoginFsm {
  constructor(credentials) {
    this.credentials = credentials || {};
    this.state = LoginState.INIT;
    this.buffer = "";
    this.pendingInput = null;
  }

  reset() {
    this.state = LoginState.INIT;
    this.buffer = "";
    this.pendingInput = null;
  }

  onOutput(text) {
    this.buffer += text;
    const tail = this.buffer.slice(-800);

    if (this.state === LoginState.IN_GAME) return null;

    if (BIG5_PROMPT.test(tail) && /y\/n|yes|no/i.test(tail)) {
      this.state = LoginState.BIG5;
      return "n\n";
    }
    if (ID_PROMPT.test(tail) && this.credentials.id) {
      this.state = LoginState.ID;
      return `${this.credentials.id}\n`;
    }
    if (PASS_PROMPT.test(tail) && this.credentials.password) {
      this.state = LoginState.PASSWORD;
      return `${this.credentials.password}\n`;
    }
    if (CONFIRM_PROMPT.test(tail) && this.state === LoginState.PASSWORD) {
      this.state = LoginState.CONFIRM_NEW;
      return "y\n";
    }
    if (NAME_PROMPT.test(tail) && this.credentials.name) {
      this.state = LoginState.NAME;
      return `${this.credentials.name}\n`;
    }
    if (GENDER_PROMPT.test(tail) && this.credentials.gender) {
      this.state = LoginState.GENDER;
      const g = this.credentials.gender === "女" ? "female" : "male";
      return `${g}\n`;
    }

    if (
      /欢迎|重新连线|侠客行|> $/m.test(tail) ||
      /目前所在|look/i.test(tail)
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
