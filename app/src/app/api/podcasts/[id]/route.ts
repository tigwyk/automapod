import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromR2, getR2EpisodesCustomDomain } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { data: podcast, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    return NextResponse.json({ podcast });
  } catch (error) {
    console.error('Unexpected error in GET /api/podcasts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = body.title.trim();
    }
    if (body.description !== undefined) {
      updates.description = body.description.trim();
    }
    if (body.cover_image_url !== undefined) {
      updates.cover_image_url = body.cover_image_url.trim();
    }
    if (body.rss_slug !== undefined) {
      if (!body.rss_slug.trim()) {
        return NextResponse.json({ error: 'RSS slug cannot be empty' }, { status: 400 });
      }
      if (!/^[a-z0-9-]+$/.test(body.rss_slug)) {
        return NextResponse.json(
          { error: 'RSS slug must contain only lowercase letters, numbers, and hyphens' },
          { status: 400 }
        );
      }
      updates.rss_slug = body.rss_slug.trim();
    }

    const { id } = await params;

    if (updates.rss_slug) {
      const { data: existing } = await supabase
        .from('podcasts')
        .select('id')
        .eq('rss_slug', updates.rss_slug)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'RSS slug is already taken' }, { status: 409 });
      }
    }

    const { data: podcast, error } = await supabase
      .from('podcasts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !podcast) {
      if (error?.code === '23505') {
        return NextResponse.json({ error: 'RSS slug is already taken' }, { status: 409 });
      }
      console.error('Error updating podcast:', error);
      return NextResponse.json({ error: 'Failed to update podcast' }, { status: 500 });
    }

    return NextResponse.json({ podcast });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/podcasts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the podcast belongs to the user before doing anything
    const { data: podcast, error: podcastError } = await supabase
      .from('podcasts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (podcastError || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    // Fetch all episodes so we can clean up R2 files
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, audio_url')
      .eq('podcast_id', id);

    if (episodesError) {
      console.error('Error fetching episodes for podcast:', episodesError);
      return NextResponse.json({ error: 'Failed to fetch podcast episodes' }, { status: 500 });
    }

    // Delete R2 audio files for all episodes (best-effort, non-blocking)
    if (episodes && episodes.length > 0) {
      const r2CustomDomain = getR2EpisodesCustomDomain();
      await Promise.allSettled(
        episodes
          .filter((ep) => ep.audio_url && r2CustomDomain && ep.audio_url.startsWith(r2CustomDomain))
          .map((ep) => {
            const key = ep.audio_url.replace(r2CustomDomain!, '').replace(/^\//, '');
            return deleteFromR2(key);
          })
      );
    }

    // Deleting the podcast cascades to episodes in the DB (ON DELETE CASCADE)
    const { error } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting podcast:', error);
      return NextResponse.json({ error: 'Failed to delete podcast' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/podcasts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
