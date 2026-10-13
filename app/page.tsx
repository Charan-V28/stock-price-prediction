import Dashboard from "../components/dashboard";
import { createClient } from "../lib/supabase/server";
import { redirect } from "next/navigation";

type HomeSearchParams = Promise<{ symbol?: string; horizon?: string }>;

export default async function Home({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const requestedSymbol = params.symbol?.trim().toUpperCase() ?? "";
  const requestedHorizon = Number(params.horizon);
  const initialSymbol = /^[A-Z0-9.^_-]{1,15}$/.test(requestedSymbol) ? requestedSymbol : null;
  const initialHorizon = [5, 10, 20].includes(requestedHorizon) ? requestedHorizon : null;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data.user;
  if (!user) {
    const next = new URLSearchParams();
    if (initialSymbol) next.set("symbol", initialSymbol);
    if (initialHorizon) next.set("horizon", String(initialHorizon));
    const destination = next.size ? `/?${next.toString()}` : "/";
    redirect(`/login?next=${encodeURIComponent(destination)}`);
  }
  const profileName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const profileAvatar = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  return <Dashboard userEmail={user.email ?? null} profileName={profileName} profileAvatar={profileAvatar} initialSymbol={initialSymbol} initialHorizon={initialHorizon} />;
}
