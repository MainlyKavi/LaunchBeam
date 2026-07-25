import { LandingPage } from "./landing-page";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  let isAuthenticated = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAuthenticated = Boolean(user);
    } catch {
      isAuthenticated = false;
    }
  }

  return <LandingPage isAuthenticated={isAuthenticated} />;
}
