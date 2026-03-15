import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: podcasts, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching podcasts:', error);
      return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
    }

    return NextResponse.json({ podcasts });
  } catch (error) {
    console.error('Unexpected error in GET /api/podcasts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body.rss_slug || !body.rss_slug.trim()) {
      return NextResponse.json({ error: 'RSS slug is required' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(body.rss_slug)) {
      return NextResponse.json(
        { error: 'RSS slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const description = body.description?.trim() || '';
    const cover_image_url = body.cover_image_url?.trim() || '';

    const { data: existing } = await supabase
      .from('podcasts')
      .select('id')
      .eq('rss_slug', body.rss_slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'RSS slug is already taken' }, { status: 409 });
    }

    const { data: podcast, error } = await supabase
      .from('podcasts')
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        description,
        cover_image_url,
        rss_slug: body.rss_slug.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating podcast:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'RSS slug is already taken' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create podcast' }, { status: 500 });
    }

    return NextResponse.json({ podcast }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/podcasts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
