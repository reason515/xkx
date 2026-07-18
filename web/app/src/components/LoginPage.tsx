import { useState } from "react";
import {
  clearSavedCredentials,
  loadSavedCredentials,
  saveCredentials,
} from "../lib/savedCredentials";
import { ChoiceRow } from "./ChoiceRow";

interface Props {
  onLogin: (opts: {
    id: string;
    password: string;
    name?: string;
    gender?: string;
    register?: boolean;
  }) => void;
  error?: string;
}

type Mode = "login" | "register";

export function LoginPage({ onLogin, error }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [id, setId] = useState(() => loadSavedCredentials()?.id ?? "");
  const [password, setPassword] = useState(
    () => loadSavedCredentials()?.password ?? ""
  );
  const [name, setName] = useState("");
  const [gender, setGender] = useState("男");
  const [remember, setRemember] = useState(() => Boolean(loadSavedCredentials()));

  const isRegister = mode === "register";

  return (
    <div className="login-page">
      <h1>侠客行</h1>
      <p className="sub">轻量文字武侠 · 手机优先</p>

      <div className="login-tabs" role="tablist" aria-label="登录或注册">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "active" : undefined}
          onClick={() => setMode("login")}
        >
          登录
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={mode === "register" ? "active" : undefined}
          onClick={() => setMode("register")}
        >
          注册
        </button>
      </div>

      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (remember) {
            saveCredentials({ id, password });
          } else {
            clearSavedCredentials();
          }
          onLogin({
            id,
            password,
            name: name || id,
            gender,
            register: isRegister,
          });
        }}
      >
        <label>
          账号（英文 ID）
          <input
            value={id}
            onChange={(e) => setId(e.target.value.toLowerCase())}
            autoComplete="username"
            required
            minLength={3}
            maxLength={8}
            pattern="[a-zA-Z]{3,8}"
            title="3–8 位英文字母"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={4}
          />
        </label>
        {isRegister && (
          <>
            <label>
              中文名字
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="login-field">
              <span id="login-gender-label">性别</span>
              <ChoiceRow
                label="性别"
                value={gender}
                options={[
                  { id: "男", label: "男" },
                  { id: "女", label: "女" },
                ]}
                onChange={setGender}
              />
            </div>
          </>
        )}
        <label className="login-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => {
              const next = e.target.checked;
              setRemember(next);
              if (!next) clearSavedCredentials();
            }}
          />
          记住账号和密码
        </label>
        {error && <p className="err">{error}</p>}
        <button type="submit">{isRegister ? "注册并进入" : "进入游戏"}</button>
      </form>
    </div>
  );
}
