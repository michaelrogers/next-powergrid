/**
 * Map Cache - In-memory caching of loaded map data
 * Loads maps from trace files once and keeps them in memory for the session
 */

import { GameMapV2, loadMapFromTrace } from './mapDataV2';

const mapCache = new Map<string, Promise<GameMapV2 | null>>();

/**
 * Get a map, loading from cache if available, otherwise from trace files
 * Results are cached in memory to avoid re-fetching during gameplay
 */
export async function getCachedMap(mapId: string): Promise<GameMapV2 | null> {
  // Return cached promise if available
  if (mapCache.has(mapId)) {
    return mapCache.get(mapId)!;
  }

  // Create promise and cache it (even if it fails, to avoid retry storms)
  const mapPromise = loadMapFromTrace(mapId);
  mapCache.set(mapId, mapPromise);

  return mapPromise;
}

/**
 * Preload multiple maps into cache
 */
export async function preloadMaps(mapIds: string[]): Promise<void> {
  await Promise.all(mapIds.map(id => getCachedMap(id)));
}

/**
 * Clear the map cache (useful for hot reload or testing)
 */
export function clearMapCache(): void {
  mapCache.clear();
}

/**
 * Get all available maps (by preloading the standard set)
 */
export async function getAllMaps(): Promise<Record<string, GameMapV2 | null>> {
  const standardMaps = ['usa', 'germany', 'france'];
  const results: Record<string, GameMapV2 | null> = {};

  for (const mapId of standardMaps) {
    results[mapId] = await getCachedMap(mapId);
  }

  return results;
}
