import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const MAX_SLUG_CANDIDATES = 11; // 1 random + 10 numeric suffixes

interface ValidateSlugResponse {
  isUnique: boolean;
  suggestedSlug?: string;
}

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

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('podcasts')
    .select('rss_slug')
    .eq('rss_slug', slug)
    .maybeSingle();

  const isUnique = !existing;

  if (isUnique || !suggestUnique) {
    return NextResponse.json<ValidateSlugResponse>({ isUnique });
  }

  // Generate candidates and check all in a single query
  const candidates = [
    `${slug}-${Math.random().toString(36).substring(2, 8)}`,
    ...Array.from({ length: 10 }, (_, i) => `${slug}-${i + 1}`)
  ];

  const { data: taken } = await supabase
    .from('podcasts')
    .select('rss_slug')
    .in('rss_slug', candidates);

  const takenSlugs = new Set(taken?.map(p => p.rss_slug) || []);
  const suggestedSlug = candidates.find(c => !takenSlugs.has(c));

  if (!suggestedSlug) {
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
