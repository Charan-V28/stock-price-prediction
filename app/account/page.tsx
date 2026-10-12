import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, UserRound } from "lucide-react";
import AccountPanel from "../../components/account-panel";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export const metadata = { title: "Your account · Signal Forecast Lab", robots: { index: false, follow: false } };

export default async function AccountPage() {
  if (!getSupabaseConfig()) {
    return <main className="account-page"><Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to forecast lab</Link><section className="account-card"><span className="account-icon"><LockKeyhole size={20} /></span><span className="auth-step">ACCOUNT SETUP</span><h1>Sign-in is not configured yet</h1><p>Add your Supabase project URL and publishable key to the environment, then enable Google and email providers in Supabase.</p><Link className="account-action" href="/login">Go to sign in</Link></section></main>;
  }

  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login?next=/account");

  return <main className="account-page">
    <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to forecast lab</Link>
    <section className="account-card">
      <div className="account-title-row"><span className="account-icon"><UserRound size={20} /></span><div><span className="auth-step">PERSONAL WORKSPACE</span><h1>Your account</h1></div></div>
      <p>Signed in to Signal Forecast Lab.</p>
      <div className="account-detail"><span>Email address</span><strong>{user.email}</strong></div>
      <div className="account-detail"><span>Sign-in method</span><strong>{user.app_metadata.provider === "google" ? "Google" : "Email and password"}</strong></div>
      <AccountPanel />
    </section>
  </main>;
}
