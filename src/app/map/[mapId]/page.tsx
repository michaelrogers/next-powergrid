"use client";

import React from 'react';
import GameMapComponent from '@/components/GameMap';
import { getMapByName, MAPS } from '@/lib/mapData';
import { useParams } from 'next/navigation';

export default function MapPage() {
  const params = useParams();
  const mapId = (params?.mapId as string) || 'usa';
  const map = getMapByName(mapId) || MAPS['usa'];

  return (
    <main className="min-h-screen w-full p-6 bg-slate-900 flex items-center justify-center">
      <div className="w-full max-w-6xl h-[80vh] bg-slate-800 rounded-lg p-4">
        <GameMapComponent map={map} players={[]} compact={false} />
      </div>
    </main>
  );
}
