import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type TraceData = {
  mapId: string;
  regionId: string;
  path: string;
  points: Array<{ x: number; y: number }>;
  updatedAt: string;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mapId = url.searchParams.get('mapId');
    if (!mapId) {
      return NextResponse.json({ ok: false, error: 'mapId is required' }, { status: 400 });
    }

    const repoRoot = process.cwd();
    const tracesDir = path.join(repoRoot, 'map-traces');
    
    if (!fs.existsSync(tracesDir)) {
      return NextResponse.json({ ok: true, traces: {} });
    }

    // Get all trace files for this map: {mapId}-{regionId}-trace.json
    const tracesByRegion: Record<string, TraceData> = {};
    const files = fs.readdirSync(tracesDir);

    for (const file of files) {
      if (!file.endsWith('-trace.json')) continue;
      
      const match = file.match(new RegExp(`^${mapId}-(.*)-trace\\.json$`));
      if (!match) continue;

      const filePath = path.join(tracesDir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw) as TraceData;
        tracesByRegion[data.regionId] = data;
      } catch (err) {
        // Skip malformed files
        continue;
      }
    }

    return NextResponse.json({ ok: true, traces: tracesByRegion });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

