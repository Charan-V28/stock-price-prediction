"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function AccountPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return <div className="account-actions"><a className="account-action secondary" href="/account/update-password">Change password <ArrowRight size={15} /></a>{error && <p className="auth-message auth-error" role="alert">{error}</p>}<button className="account-action" onClick={() => void signOut()} disabled={busy}>{busy ? <LoaderCircle className="auth-spinner" size={16} /> : null}Sign out</button></div>;
}
