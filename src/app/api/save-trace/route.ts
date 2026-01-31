import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Payload = {
  mapId?: string;
  regionId: string;
  path: string;
  points?: Array<{ x: number; y: number }>;
  cities?: Array<{ id: string; name: string; x: number; y: number; region: string }>;
};

export async function POST(req: Request) {
  try {
    const payload: Payload = await req.json();
    if (!payload.regionId || !payload.path) {
      return NextResponse.json({ ok: false, error: 'regionId and path are required' }, { status: 400 });
    }

    const repoRoot = process.cwd();
    const tracesDir = path.join(repoRoot, 'map-traces');
    if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir);

    const mapId = payload.mapId || 'germany';
    // Use consistent filename - overwrite instead of creating new file
    const fileName = `${mapId}-${payload.regionId}-trace.json`;
    const filePath = path.join(tracesDir, fileName);

    const content = {
      mapId,
      regionId: payload.regionId,
      path: payload.path,
      points: payload.points || [],
      cities: payload.cities || [],
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');

    return NextResponse.json({ ok: true, file: `map-traces/${fileName}` });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

