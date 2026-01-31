/**
 * In-memory cache for precomputed Voronoi regions
 * Regions are calculated once at startup and kept in memory for fast access during gameplay
 */

import { renderRegionsWithVoronoi, RenderedRegion } from './voronoiRegionRenderer';
import { MAPS_V2 } from './mapDataV2';

type VoronoiCache = Record<string, RenderedRegion[]>;

let voronoiCache: VoronoiCache = {};

/**
 * Initialize the Voronoi cache for all maps
 * Call this once at application startup
 */
export function initializeVoronoiCache(): void {
  if (Object.keys(voronoiCache).length > 0) {
    return; // Already initialized
  }

  for (const [mapId, map] of Object.entries(MAPS_V2)) {
    try {
      voronoiCache[mapId] = renderRegionsWithVoronoi(map);
    } catch (err) {
      console.error(`Failed to generate Voronoi for ${mapId}:`, err);
    }
  }
}

/**
 * Get precomputed Voronoi regions for a map
 */
export function getVoronoiRegions(mapId: string): RenderedRegion[] | null {
  if (!voronoiCache[mapId]) {
    // Lazy initialize if not already done
    const map = MAPS_V2[mapId as keyof typeof MAPS_V2];
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
