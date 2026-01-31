'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Disable SSR to prevent expensive Voronoi calculations during server render
const CityRegionEditor = dynamic(
  () => import('@/components/CityRegionEditor'),
  { ssr: false, loading: () => <div className="p-4 text-white">Loading editor...</div> }
);

export default function MapEditorPage() {
  const params = useParams<{ mapId: string }>();
  const mapId = params.mapId || 'usa';

  return <CityRegionEditor mapId={mapId} />;
}
