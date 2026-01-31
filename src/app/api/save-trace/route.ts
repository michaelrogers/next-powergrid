import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

type Payload = {
  mapId?: string;
  regionId: string;
  path: string;
  points?: Array<{ x: number; y: number }>;
  cities?: Array<{ id: string; name: string; x: number; y: number; region: string }>;
  branchBase?: string;
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
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${mapId}-${payload.regionId}-${ts}.json`;
    const filePath = path.join(tracesDir, fileName);

    const content = {
      mapId,
      regionId: payload.regionId,
      path: payload.path,
      points: payload.points || [],
      cities: payload.cities || [],
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');

    // Create branch and commit
    const branchBase = payload.branchBase || `trace/${mapId}-${payload.regionId}`;
    // ensure unique branch name
    const branchName = `${branchBase}-${ts}`;

    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'ignore' });
    } catch (err) {
      // If branch exists or checkout fails, try to continue
    }

    execSync(`git add ${filePath}`, { stdio: 'ignore' });
    execSync(`git commit -m "trace(${mapId}): add ${payload.regionId} outline"`, { stdio: 'ignore' });
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
