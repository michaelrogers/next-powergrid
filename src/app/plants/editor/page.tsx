'use client';

import Link from 'next/link';
import PowerPlantEditor from '@/components/PowerPlantEditor';

export default function PowerPlantEditorPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">⚡ Power Plant Editor</h1>
            <p className="text-slate-400">Edit the deck and save to local storage.</p>
          </div>
          <Link href="/" className="text-slate-400 hover:text-white">
            ← Back to Home
          </Link>
        </div>
        <PowerPlantEditor />
      </div>
    </main>
  );
}
