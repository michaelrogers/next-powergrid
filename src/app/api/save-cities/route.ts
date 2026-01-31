import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type CityData = {
  id: string;
  name: string;
  regionId?: string;
  x: number;
  y: number;
};

type RegionData = {
  id: string;
  name: string;
  regionColor: string;
  cityIds: string[];
};

type Payload = {
  mapId: string;
  cities: CityData[];
  regions?: RegionData[];
};

export async function POST(req: Request) {
  try {
    const payload: Payload = await req.json();
    if (!payload.mapId || !payload.cities) {
      return NextResponse.json({ ok: false, error: 'mapId and cities are required' }, { status: 400 });
    }

    const repoRoot = process.cwd();
    const tracesDir = path.join(repoRoot, 'map-traces');
    if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir);

    const fileName = `${payload.mapId}-cities.json`;
    const filePath = path.join(tracesDir, fileName);

    const content = {
      mapId: payload.mapId,
      cities: payload.cities,
      regions: payload.regions || [],
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');

    return NextResponse.json({ ok: true, file: `map-traces/${fileName}` });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
