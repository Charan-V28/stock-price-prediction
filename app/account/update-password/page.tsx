import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import UpdatePasswordForm from "../../../components/update-password-form";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Update password · Signal Forecast Lab", robots: { index: false, follow: false } };

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <main className="account-page"><Link href="/account" className="auth-back"><ArrowLeft size={15} /> Back to account</Link><section className="account-card"><span className="account-icon"><LockKeyhole size={20} /></span><span className="auth-step">ACCOUNT SECURITY</span><h1>Choose a new password</h1><p>Use at least 8 characters. You’ll stay signed in on this device.</p><UpdatePasswordForm /></section></main>;
}
