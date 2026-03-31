import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client without cookie/session handling.
 * Use this for public endpoints (e.g. RSS feeds) where auth cookies
 * must not be read or written, to avoid interfering with CDN caching.
 */
export function createPublicClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
