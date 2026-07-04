import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. Middleware handles refresh.
          }
        },
      },
    },
  );
}

export const getUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as Profile;

  const fallbackProfile: Profile = {
    id: user.id,
    full_name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
    email: user.email ?? null,
    role: "student",
  };

  // If the database trigger was not installed when the user signed up,
  // repair the missing profile row so login can still open the dashboard.
  await supabase.from("profiles").insert(fallbackProfile);

  try {
    const admin = createAdminClient();
    await admin.from("profiles").upsert(fallbackProfile, { onConflict: "id" });
  } catch {
    // The UI can still continue with this safe profile object.
  }

  return fallbackProfile;
});
