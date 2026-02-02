/**
 * In-memory cache for precomputed Voronoi regions
 * Regions are calculated once at startup and kept in memory for fast access during gameplay
 */

import { renderRegionsWithVoronoi, RenderedRegion } from './voronoiRegionRenderer';
import { getCachedMap, getAllMaps } from './mapCache';
import type { GameMapV2 } from './mapDataV2';

type VoronoiCache = Record<string, RenderedRegion[]>;

let voronoiCache: VoronoiCache = {};

/**
 * Initialize the Voronoi cache for all maps
 * Call this once at application startup
 */
export async function initializeVoronoiCache(): Promise<void> {
  if (Object.keys(voronoiCache).length > 0) {
    return; // Already initialized
  }

  const maps = await getAllMaps();
  for (const [mapId, map] of Object.entries(maps)) {
    if (map) {
      try {
        voronoiCache[mapId] = renderRegionsWithVoronoi(map);
      } catch (err) {
        console.error(`Failed to generate Voronoi for ${mapId}:`, err);
      }
    }
  }
}

/**
 * Get precomputed Voronoi regions for a map
 */
export async function getVoronoiRegions(mapId: string): Promise<RenderedRegion[] | null> {
  if (!voronoiCache[mapId]) {
    // Lazy initialize if not already done
    const map = await getCachedMap(mapId);
    if (map) {
      try {
        voronoiCache[mapId] = renderRegionsWithVoronoi(map);
      } catch (err) {
        console.error(`Failed to generate Voronoi for ${mapId}:`, err);
        return null;
      }
    } else {
      return null;
    }
  }
  return voronoiCache[mapId] || null;
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getVoronoiCacheStats(): {
  initialized: boolean;
  maps: string[];
  count: number;
} {
  return {
    initialized: Object.keys(voronoiCache).length > 0,
    maps: Object.keys(voronoiCache),
    count: Object.keys(voronoiCache).length,
  };
}
