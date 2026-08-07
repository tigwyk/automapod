import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SimpleUploadForm } from '@/components/simple-upload-form';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

export default async function NewEpisodePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('id, title')
    .order('title');

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav userId={user.id} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <SimpleUploadForm
          podcasts={podcasts || []}
          backUrl="/episodes"
        />
      </main>
    </div>
  );
}
