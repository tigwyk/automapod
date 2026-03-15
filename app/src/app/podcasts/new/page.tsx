import { PodcastForm } from '@/components/podcast-form';
import { createPodcast } from './actions';

export const dynamic = 'force-dynamic';

export default async function NewPodcastPage() {
  return <PodcastForm action={createPodcast} />;
}
