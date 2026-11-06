import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export interface SessionResult {
  supabaseResponse: NextResponse;
  user: any | null;
  supabase: ReturnType<typeof createServerClient> | null;
}

/**
 * Manages Supabase session cookies and retrieves the authenticated user in Next.js middleware.
 * Calling supabase.auth.getUser() ensures token refresh is handled automatically.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!supabaseUrl || !supabaseKey) {
    return { supabaseResponse, user: null, supabase: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Calling getUser() triggers automatic session token refresh if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}

// Backward-compatible wrapper
export const createClient = async (request: NextRequest) => {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
};
