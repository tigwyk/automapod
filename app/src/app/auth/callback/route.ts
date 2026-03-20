import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful email verification, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
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
