import { useState } from "react";

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

export function LoginPage({ onLogin, error }: Props) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("男");
  const [register, setRegister] = useState(false);

  return (
    <div className="login-page">
      <h1>侠客行</h1>
      <p className="sub">轻量文字武侠 · 手机优先</p>
      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          onLogin({ id, password, name: name || id, gender, register });
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
            maxLength={16}
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={4}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={register}
            onChange={(e) => setRegister(e.target.checked)}
          />{" "}
          新玩家注册
        </label>
        {register && (
          <>
            <label>
              中文名字
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              性别
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
          </>
        )}
        {error && <p className="err">{error}</p>}
        <button type="submit">{register ? "注册并进入" : "进入游戏"}</button>
      </form>
    </div>
  );
}
