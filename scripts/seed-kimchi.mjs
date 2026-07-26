import { createClient } from "@supabase/supabase-js";
import { isDeepStrictEqual } from "node:util";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KIMCHI_SEED = {
  name: "Kimchi",
  slug: "kimchi",
  status: "published",
  template_id: "kimchi",
  content: {
    productName: "Kimchi",
    kicker: "Private beta",
    headline:
      "Research that finds the signal in customer conversations.",
    description:
      "Kimchi turns interviews and support calls into clear product decisions.",
    buttonText: "Join the waitlist",
    successTitle: "You're on the list.",
    successMessage: "We'll let you know when Kimchi is ready.",
    logoUrl: null,
    heroImageUrl: null,
    socialLinks: [],
  },
  theme: {
    background: "#e9e5ff",
    foreground: "#18151f",
    muted: "#6f6879",
    accent: "#5b4de4",
    font: "argentum",
    radius: 20,
    alignment: "center",
    buttonStyle: "solid",
    animation: "subtle",
  },
  settings: {
    showSignupCount: false,
    referralsEnabled: true,
    requireEmailVerification: false,
    collectName: false,
    customQuestion: null,
    privacyUrl: null,
  },
};

function argumentValue(name) {
  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((argument) =>
    argument.startsWith(inlinePrefix),
  );
  if (inline) return inline.slice(inlinePrefix.length).trim();

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

async function main() {
  const ownerId = argumentValue("owner-id") || process.env.SEED_OWNER_ID?.trim();
  if (!ownerId || !UUID_PATTERN.test(ownerId)) {
    throw new Error(
      "Provide an existing Supabase Auth UUID with --owner-id or SEED_OWNER_ID.",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data: ownerResult, error: ownerError } =
    await supabase.auth.admin.getUserById(ownerId);
  if (ownerError || !ownerResult.user) {
    throw new Error("The supplied owner ID is not an existing Auth user.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("projects")
    .select(
      "id,owner_id,name,slug,status,template_id,content,theme,settings",
    )
    .eq("slug", "kimchi")
    .maybeSingle();
  if (lookupError) {
    throw new Error(`Could not check the Kimchi seed: ${lookupError.message}`);
  }
  if (existing) {
    const matchesSeed =
      existing.owner_id === ownerId &&
      isDeepStrictEqual(
        {
          name: existing.name,
          slug: existing.slug,
          status: existing.status,
          template_id: existing.template_id,
          content: existing.content,
          theme: existing.theme,
          settings: existing.settings,
        },
        KIMCHI_SEED,
      );
    if (!matchesSeed) {
      throw new Error(
        "The kimchi slug already exists but does not match this owner and seed contract; no data was changed.",
      );
    }
    console.log(
      `The exact Kimchi seed already exists as ${existing.id}; no data was overwritten.`,
    );
    return;
  }

  const publishedAt = new Date().toISOString();
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      owner_id: ownerId,
      ...KIMCHI_SEED,
      published_at: publishedAt,
    })
    .select("id,slug,status")
    .single();
  if (insertError || !project) {
    throw new Error(
      `Could not create the Kimchi seed: ${insertError?.message ?? "unknown error"}`,
    );
  }

  console.log(
    `Created published Kimchi project ${project.id} at /${project.slug}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
