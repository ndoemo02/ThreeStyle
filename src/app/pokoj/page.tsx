import type { Metadata } from 'next';
import Link from 'next/link';
import { RoomFinder } from '../../components/room/RoomFinder';
import '../../components/room/room.css';

export const metadata: Metadata = { title: 'Odwiedź pokój · ThreeStyle', robots: { index: false, follow: false } };

export default function RoomSearchPage() {
  return <main className="room-gate">
    <section className="room-gate-card" aria-labelledby="room-search-title">
      <p className="room-gate-eyebrow">THREESTYLE · POKÓJ</p>
      <h1 id="room-search-title">Odwiedź pokój</h1>
      <p>Wpisz nazwę pokoju, którą podał właściciel. Zobaczysz jego układ bez możliwości zmian. Konto nie jest potrzebne.</p>
      <RoomFinder />
      <Link className="room-gate-back" href="/">← Strona główna</Link>
    </section>
  </main>;
}
