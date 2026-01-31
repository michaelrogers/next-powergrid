import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type AlignPayload = {
  mapId?: string;
  x: number;
  y: number;
  scale: number;
};

const sanitizeMapId = (value: string) => value.toLowerCase().replace(/[^a-z0-9-_]/g, '');

function getAlignFile(mapId: string) {
  const repoRoot = process.cwd();
  const tracesDir = path.join(repoRoot, 'map-traces');
  if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir);
  const safeMapId = sanitizeMapId(mapId || 'unknown');
  return path.join(tracesDir, `${safeMapId}-ref-align.json`);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mapId = url.searchParams.get('mapId') || 'unknown';
    const filePath = getAlignFile(mapId);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ ok: true, data: JSON.parse(content) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload: AlignPayload = await req.json();
    const mapId = payload.mapId || 'unknown';
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number' || typeof payload.scale !== 'number') {
      return NextResponse.json({ ok: false, error: 'x, y, scale are required' }, { status: 400 });
    }

    const filePath = getAlignFile(mapId);
    const content = {
      mapId,
      x: payload.x,
      y: payload.y,
      scale: payload.scale,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    return NextResponse.json({ ok: true, file: `map-traces/${path.basename(filePath)}` });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}