import React from 'react';
import Link from 'next/link';
import { MAPS } from '@/lib/mapData';

export default function DevtoolsPage() {
  return (
    <main className="min-h-screen p-6 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Deprecation Notice */}
        <div className="bg-yellow-900/30 border-2 border-yellow-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold text-yellow-300 mb-2">Deprecated Tool</h2>
              <p className="text-yellow-200 mb-3">
                This map tracing tool is deprecated. Please use the new <strong>Map Editor</strong> for editing city positions and region assignments with built-in boundary validation.
              </p>
              <Link 
                href="/editor" 
                className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition-colors"
              >
                Go to Map Editor →
              </Link>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4 text-gray-400">Devtools — Map Tracing (Old)</h1>
        <p className="mb-4 text-gray-400">Open a trace editor for any map region to draw outlines and save traces.</p>

        <div className="space-y-4 opacity-60">
          {Object.values(MAPS).map((m) => (
            <div key={m.id} className="bg-slate-800 p-3 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-gray-400">{m.regions.length} regions</div>
                </div>
                <div className="flex gap-2">
                  <a className="px-4 py-2 bg-slate-700 rounded text-gray-400 font-semibold" href={`/map/trace/${m.id}`}>
                    Edit Map Regions (Old)
                  </a>
                  <a className="px-3 py-1 bg-slate-700 rounded text-gray-400 hover:bg-slate-600" href={`/map/${m.id}`}>View Map</a>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="text-gray-500 hover:text-gray-400 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
