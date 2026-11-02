import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseConfigured = () => !!(URL && ANON && SERVICE);

export class NotConfigured extends Error {
  constructor() {
    super("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to .env");
  }
}

/** Auth client bound to the request cookies: reads the signed-in user and writes session cookies. */
export async function supabaseAuth() {
  if (!supabaseConfigured()) throw new NotConfigured();
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component render: the middleware refreshes cookies instead.
        }
      },
    },
  });
}

const g = globalThis as unknown as { __svmAdmin?: SupabaseClient };

/** Service-role client for server-only data access. Never import this from client components. */
export function admin(): SupabaseClient {
  if (!supabaseConfigured()) throw new NotConfigured();
  return (g.__svmAdmin ??= createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }));
}

export const MEDIA_BUCKET = "media";
