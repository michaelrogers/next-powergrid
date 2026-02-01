import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { PowerPlant } from '@/types/game';

const DATA_PATH = path.join(process.cwd(), 'data', 'powerPlants.json');

function isPowerPlantArray(value: unknown): value is PowerPlant[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const plant = item as PowerPlant;
    return (
      typeof plant.id === 'string' &&
      typeof plant.number === 'number' &&
      Array.isArray(plant.fuelType) &&
      typeof plant.fuelCapacity === 'number'
    );
  });
}

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const data = JSON.parse(raw) as PowerPlant[];
    return NextResponse.json({ plants: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load power plants.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plants = body?.plants as unknown;
    if (!isPowerPlantArray(plants)) {
      return NextResponse.json({ error: 'Invalid power plant data.' }, { status: 400 });
    }

    await fs.writeFile(DATA_PATH, JSON.stringify(plants, null, 2));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save power plants.' }, { status: 500 });
  }
}
