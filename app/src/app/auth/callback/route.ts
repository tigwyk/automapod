import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // If there's an error in the OAuth flow, redirect to login with error
  if (searchParams.get('error')) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(searchParams.get('error') || 'OAuth authentication failed')}`
    );
  }

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Redirect to dashboard on success
  return NextResponse.redirect(`${origin}/dashboard`);
}
