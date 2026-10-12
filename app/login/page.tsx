import Link from "next/link";
import { ArrowLeft, Activity, LockKeyhole, Sparkles } from "lucide-react";
import { getSupabaseConfig } from "../../lib/supabase/config";
import AuthForm from "../../components/auth-form";

export const metadata = {
  title: "Sign in · Signal Forecast Lab",
  description: "Sign in to your Signal Forecast Lab account with Google or email.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to forecast lab</Link>
      <div className="auth-shell">
        <section className="auth-story" aria-label="About Signal Forecast Lab">
          <div className="auth-brand"><span className="auth-brand-mark"><Activity size={21} /></span><span><strong>signal<span>.</span></strong><small>FORECAST LAB</small></span></div>
          <div className="auth-story-copy">
            <span className="auth-eyebrow"><Sparkles size={13} /> A CLEARER VIEW OF THE MODEL</span>
            <h1>Make the market<br />a little more <em>learnable.</em></h1>
            <p>Sign in to your personal lab and keep exploring price history, model paths, and the thinking behind each forecast.</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-top"><span>IBM · DAILY</span><span className="auth-preview-live"><i /> MODEL PATH</span></div>
            <svg viewBox="0 0 460 120" role="presentation"><path d="M4 85 C35 79 48 46 78 62 S120 88 151 55 S195 76 226 42 S266 58 296 35 S338 62 365 29 S414 43 456 12" fill="none" stroke="#82966d" strokeWidth="2"/><path d="M4 85 C35 79 48 46 78 62 S120 88 151 55 S195 76 226 42 S266 58 296 35 S338 62 365 29 S414 43 456 12" fill="none" stroke="#c7ff56" strokeWidth="3" strokeDasharray="3 460" strokeDashoffset="-460"/><path d="M365 29 C392 37 414 24 456 12" fill="none" stroke="#c7ff56" strokeWidth="2" strokeDasharray="5 5"/><circle cx="365" cy="29" r="4" fill="#c7ff56"/></svg>
            <div className="auth-preview-foot"><span>HISTORICAL CLOSE</span><span>EDUCATIONAL MODEL · NOT INVESTMENT ADVICE</span></div>
          </div>
          <div className="auth-security-note"><LockKeyhole size={14} /><span>Secure sign-in powered by Supabase Auth. Google passwords stay with Google.</span></div>
        </section>
        <section className="auth-card" aria-label="Sign in">
          <AuthForm configured={Boolean(getSupabaseConfig())} />
          <p className="auth-terms">By continuing, you agree to use forecasts for learning only. They are not investment advice.</p>
        </section>
      </div>
      <footer className="auth-footer"><span>© 2026 SIGNAL FORECAST LAB</span><Link href="/">PUBLIC EDUCATIONAL DEMO</Link></footer>
    </main>
  );
}
