'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAllMaps } from '@/lib/mapCache';
import type { GameMapV2 } from '@/lib/mapDataV2';

export default function EditorIndexPage() {
  const [maps, setMaps] = useState<Record<string, GameMapV2 | null> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMaps = async () => {
      try {
        const loadedMaps = await getAllMaps();
        setMaps(loadedMaps);
      } catch (error) {
        console.error('Failed to load maps:', error);
        setMaps({});
      } finally {
        setLoading(false);
      }
    };

    loadMaps();
  }, []);

  const mapEntries = maps ? Object.entries(maps).filter(([_, map]) => map !== null) : [];

  return (
    <main className="w-full h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="max-w-2xl text-center px-6">
        <h1 className="text-4xl font-bold mb-4">🗺️ Map Editor</h1>
        <p className="text-gray-300 mb-8">
          Edit city positions and region assignments with interactive visual editing and built-in boundary validation
        </p>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8 text-left">
          <h2 className="font-bold text-lg mb-3 text-center">Features</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>Boundary Validation</strong> - Real-time detection of cities outside country boundaries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>Visual Editing</strong> - Drag cities, pan & zoom, and see Voronoi regions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>Region Assignment</strong> - Assign cities to regions and visualize boundaries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span><strong>GeoJSON Overlay</strong> - Country outlines for accurate positioning</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-6">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-xs uppercase tracking-wide text-gray-400 border-b border-slate-700">
            <div>Map</div>
            <div>Cities</div>
            <div>Regions</div>
            <div>Connections</div>
          </div>
          <div className="divide-y divide-slate-700">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400">
                Loading maps...
              </div>
            ) : mapEntries.length > 0 ? (
              mapEntries.map(([id, map]) => (
                <Link
                  key={id}
                  href={`/editor/${id}`}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-4 py-4 text-left hover:bg-slate-700/60 transition"
                >
                  <div>
                    <div className="font-semibold text-white">{map!.name}</div>
                    <div className="text-xs text-gray-400">ID: {map!.id}</div>
                  </div>
                  <div className="text-sm text-gray-200">{map!.cities.length}</div>
                  <div className="text-sm text-gray-200">{map!.regions.length}</div>
                  <div className="text-sm text-gray-200">{map!.connections.length}</div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-400">
                No maps found
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-400">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
