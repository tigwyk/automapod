import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const supabase = await createClient();

  // Get the origin to use as base URL for redirect
  const origin = new URL(request.url).origin;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      // Skip browser popup for better compatibility
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(data.url);
}
