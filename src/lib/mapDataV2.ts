/**
 * Map Data - Voronoi-based region system
 * 
 * New architecture:
 * 1. Cities are seed points with fixed positions
 * 2. Regions are collections of city IDs
 * 3. Region boundaries are auto-generated via Voronoi diagram
 * 4. Adjacencies emerge from which cities are close to each other
 */

export interface CityDefinition {
  id?: string; // Optional - can be provided separately
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface RegionDefinition {
  id?: string;
  name?: string;
  regionColor: string;
  cityIds: string[]; // Cities that seed this region's Voronoi cell
}

export interface ConnectionDefinition {
  cityA: string;
  cityB: string;
  cost?: number;
}

export interface GameMapV2 {
  id: string;
  name: string;
  width: number;
  height: number;
  cities: CityDefinition[]; // Global city registry
  regions: RegionDefinition[]; // Regions defined by city assignments
  connections: ConnectionDefinition[];
  countryOutline?: string;
}

/**
 * Get a city by ID from a map
 */
export function getCityById(map: GameMapV2, cityId: string): CityDefinition | undefined {
  return map.cities.find(c => c.id === cityId);
}

/**
 * Get all cities in a region
 */
export function getCitiesInRegionV2(map: GameMapV2, regionId: string): CityDefinition[] {
  const region = map.regions.find(r => r.id === regionId);
  if (!region) return [];
  return region.cityIds.map(cId => getCityById(map, cId)).filter(Boolean) as CityDefinition[];
}

/**
 * Get region for a city
 */
export function getRegionForCity(map: GameMapV2, cityId: string): RegionDefinition | undefined {
  return map.regions.find(r => r.cityIds.includes(cityId));
}

/**
 * Compute adjacencies between regions based on city distances
 */
export function computeRegionAdjacencies(map: GameMapV2): Record<string, string[]> {
  const adjacencies: Record<string, string[]> = {};

  for (const region of map.regions) {
    if (!region.id) continue; // Skip regions without ID
    
    const neighbors = new Set<string>();
    const regionCities = getCitiesInRegionV2(map, region.id);

    // For each city in this region, find nearest cities in other regions
    for (const city of regionCities) {
      for (const otherRegion of map.regions) {
        if (!otherRegion.id || otherRegion.id === region.id) continue;

        const otherCities = getCitiesInRegionV2(map, otherRegion.id);
        for (const otherCity of otherCities) {
          const dist = Math.hypot(city.x - otherCity.x, city.y - otherCity.y);
          if (dist < 25) { // Adjacent if cities within 25% of map
            neighbors.add(otherRegion.id);
          }
        }
      }
    }

    adjacencies[region.id] = Array.from(neighbors);
  }

  return adjacencies;
}

/**
 * Load map data from trace files (created by map editor)
 * This loads the authoritative editor-generated data instead of hardcoded maps
 */
export async function loadMapFromTrace(mapId: string): Promise<GameMapV2 | null> {
  try {
    const response = await fetch(`/api/map-trace/${mapId}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Transform trace data to GameMapV2 format
    const mapDimensions = {
      usa: { width: 1000, height: 600 },
      germany: { width: 800, height: 600 },
      france: { width: 800, height: 700 },
    } as const;
    
    const dims = mapDimensions[mapId as keyof typeof mapDimensions] || { width: 1000, height: 600 };
    const mapNames: Record<string, string> = {
      usa: 'United States',
      germany: 'Germany',
      france: 'France',
    };
    
    // Convert cities array (with id property added back)
    const cities: CityDefinition[] = (data.cities || []).map((city: any) => ({
      name: city.name,
      x: city.x,
      y: city.y,
    }));
    
    // Add id to cities from the incoming data
    const citiesWithIds = (data.cities || []).map((city: any, idx: number) => ({
      id: city.id || `city_${idx}`,
      name: city.name,
      x: city.x,
      y: city.y,
    }));
    
    // Convert regions (ensure id field is present)
    const regions: RegionDefinition[] = (data.regions || []).map((region: any) => ({
      id: region.id || region.name?.toLowerCase().replace(/\s+/g, '-'),
      name: region.name,
      regionColor: region.regionColor || '#60a5fa',
      cityIds: region.cityIds || [],
    }));
    
    const gameMap: GameMapV2 = {
      id: mapId,
      name: mapNames[mapId] || data.name || mapId,
      width: dims.width,
      height: dims.height,
      cities: citiesWithIds,
      regions: regions,
      connections: data.connections || [],
      countryOutline: data.countryOutline,
    };
    
    return gameMap;
  } catch (error) {
    console.error(`Failed to load map trace for ${mapId}:`, error);
    return null;
  }
}

/**
 * Get map from trace files, with fallback to null if not found
 */
export async function getMapByIdWithTrace(mapId: string): Promise<GameMapV2 | null> {
  // Load from trace files
  const mapFromTrace = await loadMapFromTrace(mapId);
  return mapFromTrace;
}
