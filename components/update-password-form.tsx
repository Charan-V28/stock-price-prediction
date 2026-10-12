"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) { setError("Those passwords don’t match."); return; }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setBusy(false); return; }
    router.replace("/account"); router.refresh();
  }

  return <form className="auth-form update-password-form" onSubmit={(event) => void submit(event)}>
    <label htmlFor="new-password">New password</label><div className="auth-password-wrap"><input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters"/><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
    <label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Enter it once more"/>
    {error && <p className="auth-message auth-error" role="alert">{error}</p>}
    <button className="account-action" type="submit" disabled={busy}>{busy && <LoaderCircle className="auth-spinner" size={16}/>}Update password</button>
  </form>;
}
