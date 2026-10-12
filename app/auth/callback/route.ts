import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

function safePath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safePath(url.searchParams.get("next")), url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
