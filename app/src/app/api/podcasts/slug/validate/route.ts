import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface ValidateSlugResponse {
  isUnique: boolean;
  suggestedSlug?: string;
}

/**
 * Validates if an RSS slug is unique and optionally suggests a unique variant.
 * Query params:
 *   - slug: The slug to validate (required)
 *   - suggestUnique: If "true", returns a unique slug suggestion if the provided slug is taken (optional)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const suggestUnique = searchParams.get('suggestUnique') === 'true';

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
      { status: 400 }
    );
  }

  // Check if slug exists
  const { data: existing } = await supabase
    .from('podcasts')
    .select('id, rss_slug')
    .eq('rss_slug', slug)
    .maybeSingle();

  const isUnique = !existing;

  // If slug is unique or suggestion not requested, return early
  if (isUnique || !suggestUnique) {
    return NextResponse.json<ValidateSlugResponse>({ isUnique });
  }

  // Generate a unique slug by adding a random suffix
  let suggestedSlug = slug;
  let suffix = 1;
  const maxAttempts = 100;

  while (suffix <= maxAttempts) {
    suggestedSlug = suffix === 1 ? `${slug}-${Math.random().toString(36).substring(2, 8)}` : `${slug}-${suffix}`;

    const { data: existingSuggestion } = await supabase
      .from('podcasts')
      .select('id')
      .eq('rss_slug', suggestedSlug)
      .maybeSingle();

    if (!existingSuggestion) {
      break;
    }

    suffix++;
  }

  if (suffix > maxAttempts) {
    return NextResponse.json(
      { error: 'Could not generate a unique slug. Please try a different base slug.' },
      { status: 500 }
    );
  }

  return NextResponse.json<ValidateSlugResponse>({
    isUnique: false,
    suggestedSlug,
  });
}
