'use client';

import Link from 'next/link';
import { MAPS_V2 } from '@/lib/mapDataV2';

export default function EditorIndexPage() {
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
        
        <div className="flex gap-4 justify-center mb-6">
          {Object.entries(MAPS_V2).map(([id, map]) => (
            <Link
              key={id}
              href={`/editor/${id}`}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
            >
              {map.name}
            </Link>
          ))}
        </div>
        
        <div className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-400">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
