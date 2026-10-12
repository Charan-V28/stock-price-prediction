import Dashboard from "../components/dashboard";
import { createClient } from "../lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data.user;
  const profileName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const profileAvatar = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  return <Dashboard userEmail={user?.email ?? null} profileName={profileName} profileAvatar={profileAvatar} />;
}
