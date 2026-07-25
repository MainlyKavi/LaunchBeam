"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, anonKey } = getPublicSupabaseConfig();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
