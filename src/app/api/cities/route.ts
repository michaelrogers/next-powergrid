import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type CityData = {
  id: string;
  name: string;
  regionId: string;
  x: number;
  y: number;
};

type CitiesPayload = {
  mapId: string;
  cities: CityData[];
  lastUpdated?: string;
};

function getCitiesFile(mapId: string): string | null {
  const repoRoot = process.cwd();
  const tracesDir = path.join(repoRoot, 'map-traces');
  const filePath = path.join(tracesDir, `${mapId}-cities.json`);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mapId = url.searchParams.get('mapId');
    if (!mapId) {
      return NextResponse.json({ ok: false, error: 'mapId is required' }, { status: 400 });
    }

    const filePath = getCitiesFile(mapId);
    if (!filePath) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw) as CitiesPayload;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}