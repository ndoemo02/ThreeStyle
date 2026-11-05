import type { Metadata } from 'next';
import { VisitorRoom } from '../../../components/room/VisitorRoom';

// A shared room is reachable by link, not advertised to search engines.
export const metadata: Metadata = { title: 'Pokój · ThreeStyle', robots: { index: false, follow: false } };

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VisitorRoom slug={slug} />;
}
