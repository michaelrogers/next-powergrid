import React from 'react';
import { MAPS } from '@/lib/mapData';

export default function DevtoolsPage() {
  return (
    <main className="min-h-screen p-6 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Devtools — Map Tracing</h1>
        <p className="mb-4 text-gray-300">Open a trace editor for any map region to draw outlines and save traces.</p>

        <div className="space-y-4">
          {Object.values(MAPS).map((m) => (
            <div key={m.id} className="bg-slate-800 p-3 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-gray-400">{m.regions.length} regions</div>
                </div>
                <div className="flex gap-2">
                  <a className="px-4 py-2 bg-emerald-600 rounded text-white font-semibold hover:bg-emerald-700" href={`/map/trace/${m.id}`}>
                    Edit Map Regions
                  </a>
                  <a className="px-3 py-1 bg-slate-700 rounded text-white hover:bg-slate-600" href={`/map/${m.id}`}>View Map</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
