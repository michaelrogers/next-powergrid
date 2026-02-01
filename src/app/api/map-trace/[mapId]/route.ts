import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { mapId } = await params;
    const filePath = join(process.cwd(), 'map-traces', `${mapId}-cities.json`);
    
    const fileContent = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return Response.json(data);
  } catch (error) {
    console.error('Failed to load map trace:', error);
    return Response.json(
      { error: 'Map trace not found' },
      { status: 404 }
    );
  }
}
