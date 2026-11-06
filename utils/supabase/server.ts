import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getCredentials() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be defined."
    );
  }
  return { supabaseUrl, supabaseKey };
}

function buildClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const { supabaseUrl, supabaseKey } = getCredentials();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Creates a Supabase client for Server Components, Server Actions, or Route Handlers.
 * - Call `createClient(cookieStore)` if you already have the awaited cookie store.
 * - Or call `await createClient()` to let the helper automatically retrieve cookies.
 */
export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>): ReturnType<typeof createServerClient>;
export function createClient(): Promise<ReturnType<typeof createServerClient>>;
export function createClient(cookieStore?: Awaited<ReturnType<typeof cookies>>) {
  if (cookieStore) {
    return buildClient(cookieStore);
  }
  return cookies().then((store) => buildClient(store));
}

/**
 * Creates a lightweight, cookie-free Supabase client for cached public read queries.
 * Safe to call inside `unstable_cache` or static prerendering scopes without triggering
 * dynamic header/cookie errors.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseKey } = getCredentials();
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
