import React from 'react';
import FullMapEditor from '@/components/FullMapEditor';

export default async function Page({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId: rawMapId } = await params;
  const mapId = typeof rawMapId === 'string' ? rawMapId.trim().toLowerCase() : '';
  return <FullMapEditor mapId={mapId} />;
}
