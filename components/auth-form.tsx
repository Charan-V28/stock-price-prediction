"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

function callbackUrl(next: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", next);
  return url.toString();
}

function nextPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export default function AuthForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sharedSymbol, setSharedSymbol] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      setError("We couldn’t complete sign-in. Please try again.");
    }
    const next = params.get("next");
    if (next) {
      try {
        const destination = new URL(next, window.location.origin);
        const shared = destination.searchParams.get("symbol")?.toUpperCase();
        if (destination.origin === window.location.origin && destination.pathname === "/" && shared && /^[A-Z0-9.^_-]{1,15}$/.test(shared)) setSharedSymbol(shared);
      } catch { /* Ignore malformed return paths and use the normal sign-in copy. */ }
    }
  }, []);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setOauthBusy(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(nextPath()) },
      });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        setOauthBusy(false);
      }
    } catch {
      setError("Could not reach the sign-in service. Check your connection and try again.");
      setBusy(false);
      setOauthBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl("/account/update-password"),
        });
        if (resetError) setError(resetError.message);
        else setNotice("If an account exists for that email, a password reset link is on its way.");
        setBusy(false);
        return;
      }

      if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl(nextPath()) },
        });
        if (signupError) setError(signupError.message);
        else if (data.session) {
          window.location.assign(nextPath());
        } else {
          setNotice(sharedSymbol ? `Check your inbox to verify your email. The confirmation link will take you back to the shared ${sharedSymbol} forecast.` : "Your account is ready. Check your inbox to verify your email; the confirmation link will take you to the forecast dashboard.");
        }
        setBusy(false);
        return;
      }

      const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
      if (signinError) {
        setError(signinError.message);
        setBusy(false);
        return;
      }
      window.location.assign(nextPath());
    } catch {
      setError("Could not reach the sign-in service. Check your connection and try again.");
      setBusy(false);
    }
  }

  const isReset = mode === "reset";
  const isSignup = mode === "signup";

  return (
    <div className="auth-form-wrap">
      <div className="auth-card-heading">
        <span className="auth-step">PERSONAL WORKSPACE</span>
        <h2>{isReset ? "Reset your password" : isSignup ? "Create your account" : "Welcome back"}</h2>
        <p>{isReset ? "We’ll email a secure link if an account matches." : sharedSymbol ? (isSignup ? `Create a free account to view the shared ${sharedSymbol} forecast.` : `Sign in to view the shared ${sharedSymbol} forecast.`) : isSignup ? "Start a free account for your personal forecast lab." : "Sign in to continue to your forecast lab."}</p>
      </div>

      <button className="auth-google-button" type="button" onClick={() => void signInWithGoogle()} disabled={!configured || busy}>
        {oauthBusy ? <LoaderCircle className="auth-spinner" size={17} /> : <GoogleMark />}
        Continue with Google
      </button>

      {!isReset && <div className="auth-divider"><span /> <small>OR CONTINUE WITH EMAIL</small> <span /></div>}

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!configured || busy} />
        {!isReset && <>
          <div className="auth-password-label"><label htmlFor="auth-password">Password</label>{!isSignup && <button type="button" onClick={() => changeMode("reset")}>Forgot password?</button>}</div>
          <div className="auth-password-wrap"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : "Enter your password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!configured || busy} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} tabIndex={-1}><span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
        </>}

        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-message auth-success" role="status">{notice}</p>}
        {!configured && <p className="auth-message auth-info" role="status">Sign-in is ready to configure. Add your Supabase project URL and publishable key to enable accounts.</p>}

        <button className="auth-submit" type="submit" disabled={!configured || busy}>
          {busy ? <LoaderCircle className="auth-spinner" size={17} /> : <>{isReset ? "Send reset link" : isSignup ? "Create account" : "Sign in"}<ArrowRight size={16} /></>}
        </button>
      </form>

      {isReset ? <p className="auth-switch">Remembered it? <button type="button" onClick={() => changeMode("signin")}>Back to sign in</button></p> : <p className="auth-switch">{isSignup ? "Already have an account?" : "New to Signal?"} <button type="button" onClick={() => changeMode(isSignup ? "signin" : "signup")}>{isSignup ? "Sign in" : "Create an account"}</button></p>}
      {isSignup && <p className="auth-verify-note">We’ll send a verification link before your account is activated.</p>}
    </div>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.88c-.58 2.96-2.24 5.48-4.7 7.18l7.23 5.61c4.22-3.89 6.57-9.62 6.57-17.26Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.12.76-4.59l-7.98-6.2A23.88 23.88 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.78l-7.23-5.61c-2.01 1.35-4.59 2.14-8.68 2.14-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z"/></svg>;
}
