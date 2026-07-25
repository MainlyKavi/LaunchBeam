import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create an account | LaunchBeam",
  description: "Create a LaunchBeam account and publish your first waitlist.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return <AuthForm configured={configured} mode="signup" />;
}
