export class SupabaseConfigurationError extends Error {
  constructor(message = "Supabase is not configured for this deployment.") {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new SupabaseConfigurationError();
  return { url, anonKey };
}

export function getAdminSupabaseConfig() {
  const { url } = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new SupabaseConfigurationError(
      "The Supabase service-role key is not configured.",
    );
  }
  return { url, serviceRoleKey };
}
