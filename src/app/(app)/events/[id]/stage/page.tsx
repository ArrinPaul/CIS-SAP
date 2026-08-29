import { notFound } from 'next/navigation';
import { getEventById } from '@/app/actions/events';
import LiveStageClient from '@/features/stage/live-stage-client';

export default async function EventStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  return <LiveStageClient event={event as any} />;
}
