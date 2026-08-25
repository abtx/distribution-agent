"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Bot } from "lucide-react";
export default function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError(
        "Supabase is not configured. Local demo access does not require sign-in.",
      );
      return;
    }
    const { error } = await createBrowserClient(
      url,
      key,
    ).auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else location.href = "/";
  };
  return (
    <div className="login">
      <form onSubmit={submit}>
        <span className="brandmark">
          <Bot />
        </span>
        <h1>Welcome back</h1>
        <p>Sign in to review distribution opportunities.</p>
        {error && <div className="alert">{error}</div>}
        <Field label="Email" type="email" value={email} set={setEmail} />
        <Field
          label="Password"
          type="password"
          value={password}
          set={setPassword}
        />
        <button className="primary">Sign in</button>
      </form>
    </div>
  );
}
function Field({
  label,
  type,
  value,
  set,
}: {
  label: string;
  type: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
