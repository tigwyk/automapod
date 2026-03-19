import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromR2, getR2EpisodesCustomDomain } from '@/lib/r2';

/**
 * Verifies that the user owns the episode via its podcast.
 * All episodes must belong to a podcast (no standalone episodes).
 * Returns the episode if owned, null otherwise.
 */
async function getAuthenticatedEpisode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string
) {
  // Get episode - use a simple query
  const { data: episode } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single();

  if (!episode || !episode.podcast_id) {
    return null;
  }

  // Verify ownership through the podcast
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('user_id')
    .eq('id', episode.podcast_id)
    .single();

  if (podcast?.user_id !== userId) {
    return null;
  }

  return episode;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const episode = await getAuthenticatedEpisode(supabase, id, user.id);

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    return NextResponse.json({ episode });
  } catch (error) {
    console.error('Error fetching episode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership before updating
    const episode = await getAuthenticatedEpisode(supabase, id, user.id);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Validate title
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Update the episode (podcast_id is immutable - episodes always belong to their original podcast)
    const { data: updatedEpisode, error } = await supabase
      .from('episodes')
      .update({
        title,
        description: body.description?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating episode:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ episode: updatedEpisode });
  } catch (error) {
    console.error('Error updating episode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const episode = await getAuthenticatedEpisode(supabase, id, user.id);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Delete the episode from the database
    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clean up the R2 file if episode had an audio URL
    if (episode.audio_url) {
      try {
        // Extract the R2 key from the URL
        const r2CustomDomain = getR2EpisodesCustomDomain();
        if (r2CustomDomain && episode.audio_url.startsWith(r2CustomDomain)) {
          const key = episode.audio_url.replace(r2CustomDomain, '').replace(/^\//, '');
          await deleteFromR2(key);
        }
      } catch (r2Error) {
        // Log R2 cleanup error but don't fail the delete operation
        console.error('Failed to delete R2 file:', r2Error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting episode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
