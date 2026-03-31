import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const type = searchParams.get('type');

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

    if (!error) {
      // Successful email verification, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Log the error for debugging
    console.error('Auth callback error:', {
      message: error.message,
      status: error.status,
      name: error.name,
    });
  }

  // If there's an error or no code, redirect to login with error message
  const redirectUrl = new URL('/login', request.url);
  if (type === 'signup') {
    redirectUrl.searchParams.set('error', 'Email verification failed. Please try again.');
  } else {
    redirectUrl.searchParams.set('error', 'Authentication failed. Please try again.');
  }
  return NextResponse.redirect(redirectUrl);
}
