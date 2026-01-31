import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

type CityData = {
  id: string;
  name: string;
  regionId: string;
  x: number;
  y: number;
};

type Payload = {
  mapId: string;
  cities: CityData[];
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

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${payload.mapId}-cities-${ts}.json`;
    const filePath = path.join(tracesDir, fileName);

    const content = {
      mapId: payload.mapId,
      cities: payload.cities,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');

    // Create branch and commit
    const branchName = `cities/${payload.mapId}-${ts}`;

    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'ignore' });
    } catch (err) {
      // If branch exists or checkout fails, try to continue
    }

    execSync(`git add ${filePath}`, { stdio: 'ignore' });
    execSync(`git commit -m "cities(${payload.mapId}): update city positions"`, { stdio: 'ignore' });
    // Try to push; if remote doesn't exist this will fail but commit will be local
    try {
      execSync(`git push -u origin ${branchName}`, { stdio: 'ignore' });
    } catch (err) {
      // ignore push errors
    }

    return NextResponse.json({ ok: true, file: `map-traces/${fileName}`, branch: branchName });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
