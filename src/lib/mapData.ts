/**
 * Map Data Structures
 * Defines regions, cities, and connections for different PowerGrid maps
 */

export interface City {
  id: string;
  name: string;
  x: number; // percentage position left
  y: number; // percentage position top
  region: string;
}

export interface MapRegion {
  id: string;
  name: string;
  cities: City[];
  costMultiplier: number; // cost adjustment for this region
  regionOutline?: string; // optional SVG path outlining the region area
  regionColor?: string; // optional hex color for region preview/tracing
  adjacencies?: string[]; // IDs of adjacent regions (for topological boundary enforcement)
}

export interface GameMap {
  id: string;
  name: string;
  width: number; // SVG viewBox width
  height: number; // SVG viewBox height
  regions: MapRegion[];
  connections: Array<{ cityA: string; cityB: string }>; // city connections
  countryOutline?: string; // SVG path for country border
}

// USA Map with major power grid regions
export const USA_MAP: GameMap = {
  id: 'usa',
  name: 'United States',
  width: 1000,
  height: 600,
  regions: [
    {
      id: 'northeast',
      name: 'Northeast',
      costMultiplier: 1.2,
      regionColor: '#60a5fa',
      adjacencies: ['midwest', 'south'],
      cities: [
        { id: 'boston', name: 'Boston', x: 80, y: 20, region: 'northeast' },
        { id: 'newyork', name: 'New York', x: 78, y: 25, region: 'northeast' },
        { id: 'buffalo', name: 'Buffalo', x: 76, y: 22, region: 'northeast' },
        { id: 'philadelphia', name: 'Philadelphia', x: 76, y: 30, region: 'northeast' },
        { id: 'pittsburgh', name: 'Pittsburgh', x: 72, y: 28, region: 'northeast' },
        { id: 'washington', name: 'Washington', x: 74, y: 35, region: 'northeast' },
        { id: 'norfolk', name: 'Norfolk', x: 77, y: 38, region: 'northeast' },
      ],
    },
    {
      id: 'midwest',
      name: 'Midwest',
      costMultiplier: 1.0,
      regionColor: '#f59e0b',
      adjacencies: ['northeast', 'south', 'west'],
      cities: [
        { id: 'minneapolis', name: 'Minneapolis', x: 45, y: 15, region: 'midwest' },
        { id: 'chicago', name: 'Chicago', x: 55, y: 25, region: 'midwest' },
        { id: 'detroit', name: 'Detroit', x: 62, y: 20, region: 'midwest' },
        { id: 'stlouis', name: 'St. Louis', x: 50, y: 38, region: 'midwest' },
      ],
    },
    {
      id: 'south',
      name: 'South',
      costMultiplier: 0.9,
      regionColor: '#10b981',
      adjacencies: ['northeast', 'midwest', 'west'],
      cities: [
        { id: 'atlanta', name: 'Atlanta', x: 65, y: 45, region: 'south' },
        { id: 'houston', name: 'Houston', x: 42, y: 55, region: 'south' },
        { id: 'dallas', name: 'Dallas', x: 40, y: 48, region: 'south' },
        { id: 'neworleans', name: 'New Orleans', x: 50, y: 60, region: 'south' },
      ],
    },
    {
      id: 'west',
      name: 'West',
      costMultiplier: 1.1,
      regionColor: '#ef4444',
      adjacencies: ['midwest', 'south'],
      cities: [
        { id: 'seattle', name: 'Seattle', x: 12, y: 15, region: 'west' },
        { id: 'portland', name: 'Portland', x: 10, y: 20, region: 'west' },
        { id: 'sanfrancisco', name: 'San Francisco', x: 8, y: 40, region: 'west' },
        { id: 'losangeles', name: 'Los Angeles', x: 15, y: 50, region: 'west' },
        { id: 'lasvegas', name: 'Las Vegas', x: 22, y: 42, region: 'west' },
        { id: 'denver', name: 'Denver', x: 30, y: 30, region: 'west' },
      ],
    },
  ],
  connections: [
    // Northeast connections
    { cityA: 'boston', cityB: 'newyork' },
    { cityA: 'newyork', cityB: 'philadelphia' },
    { cityA: 'philadelphia', cityB: 'washington' },

    // Midwest connections
    { cityA: 'minneapolis', cityB: 'chicago' },
    { cityA: 'chicago', cityB: 'detroit' },
    { cityA: 'chicago', cityB: 'stlouis' },
    { cityA: 'detroit', cityB: 'newyork' },

    // East-West connections
    { cityA: 'stlouis', cityB: 'dallas' },
    { cityA: 'chicago', cityB: 'washington' },

    // South connections
    { cityA: 'stlouis', cityB: 'atlanta' },
    { cityA: 'dallas', cityB: 'houston' },
    { cityA: 'atlanta', cityB: 'neworleans' },
    { cityA: 'houston', cityB: 'neworleans' },

    // West connections
    { cityA: 'seattle', cityB: 'portland' },
    { cityA: 'sanfrancisco', cityB: 'losangeles' },
    { cityA: 'losangeles', cityB: 'lasvegas' },
    { cityA: 'denver', cityB: 'lasvegas' },
    { cityA: 'denver', cityB: 'dallas' },
    { cityA: 'denver', cityB: 'sanfrancisco' },
  ],
};

// Germany Map
export const GERMANY_MAP: GameMap = {
  id: 'germany',
  name: 'Germany',
  width: 800,
  height: 600,
  regions: [
    {
      id: 'north',
      name: 'North',
      costMultiplier: 1.0,
      regionColor: '#60a5fa',
      adjacencies: ['west', 'east', 'central'],
      cities: [
        { id: 'hamburg', name: 'Hamburg', x: 50, y: 15, region: 'north' },
        { id: 'bremen', name: 'Bremen', x: 40, y: 20, region: 'north' },
        { id: 'kiel', name: 'Kiel', x: 55, y: 10, region: 'north' },
      ],
    },
    {
      id: 'west',
      name: 'West',
      costMultiplier: 1.1,
      regionColor: '#ef4444',
      adjacencies: ['north', 'central', 'south'],
      cities: [
        { id: 'cologne', name: 'Cologne', x: 30, y: 35, region: 'west' },
        { id: 'dusseldorf', name: 'Düsseldorf', x: 32, y: 32, region: 'west' },
      ],
    },
    {
      id: 'central',
      name: 'Central',
      costMultiplier: 1.05,
      regionColor: '#10b981',
      adjacencies: ['north', 'west', 'east', 'south'],
      cities: [
        { id: 'frankfurt', name: 'Frankfurt', x: 42, y: 42, region: 'central' },
      ],
    },
    {
      id: 'east',
      name: 'East',
      costMultiplier: 0.95,
      regionColor: '#f59e0b',
      adjacencies: ['north', 'central', 'south'],
      cities: [
        { id: 'berlin', name: 'Berlin', x: 55, y: 25, region: 'east' },
        { id: 'leipzig', name: 'Leipzig', x: 52, y: 38, region: 'east' },
      ],
    },
    {
      id: 'south',
      name: 'South',
      costMultiplier: 1.15,
      regionColor: '#8b5cf6',
      adjacencies: ['west', 'central', 'east'],
      cities: [
        { id: 'munich', name: 'Munich', x: 55, y: 60, region: 'south' },
        { id: 'nuremberg', name: 'Nuremberg', x: 50, y: 50, region: 'south' },
      ],
    },
  ],
  connections: [
    // North connections
    { cityA: 'hamburg', cityB: 'bremen' },
    { cityA: 'hamburg', cityB: 'berlin' },
    { cityA: 'bremen', cityB: 'frankfurt' },

    // West connections
    { cityA: 'cologne', cityB: 'dusseldorf' },
    { cityA: 'dusseldorf', cityB: 'frankfurt' },

    // Central connections
    { cityA: 'berlin', cityB: 'frankfurt' },
    { cityA: 'frankfurt', cityB: 'nuremberg' },
    { cityA: 'nuremberg', cityB: 'munich' },

    // East connections
    { cityA: 'berlin', cityB: 'leipzig' },
    { cityA: 'leipzig', cityB: 'nuremberg' },
  ],
};

// France Map
export const FRANCE_MAP: GameMap = {
  id: 'france',
  name: 'France',
  width: 800,
  height: 700,
  regions: [
    {
      id: 'paris',
      name: 'Paris',
      costMultiplier: 1.2,
      regionColor: '#60a5fa',
      adjacencies: ['north', 'east', 'west', 'south'],
      cities: [
        { id: 'paris', name: 'Paris', x: 40, y: 35, region: 'paris' },
        { id: 'orleans', name: 'Orléans', x: 42, y: 42, region: 'paris' },
      ],
    },
    {
      id: 'north',
      name: 'Nord',
      costMultiplier: 1.1,
      regionColor: '#f59e0b',
      adjacencies: ['paris', 'east'],
      cities: [
        { id: 'lille', name: 'Lille', x: 42, y: 18, region: 'north' },
      ],
    },
    {
      id: 'south',
      name: 'Midi',
      costMultiplier: 1.0,
      regionColor: '#10b981',
      adjacencies: ['paris', 'east', 'west'],
      cities: [
        { id: 'toulouse', name: 'Toulouse', x: 38, y: 72, region: 'south' },
        { id: 'marseille', name: 'Marseille', x: 58, y: 70, region: 'south' },
      ],
    },
    {
      id: 'east',
      name: 'Est',
      costMultiplier: 1.05,
      regionColor: '#ef4444',
      adjacencies: ['paris', 'north', 'south'],
      cities: [
        { id: 'strasbourg', name: 'Strasbourg', x: 68, y: 40, region: 'east' },
      ],
    },
    {
      id: 'west',
      name: 'Ouest',
      costMultiplier: 0.95,
      regionColor: '#8b5cf6',
      adjacencies: ['paris', 'south'],
      cities: [
        { id: 'bordeaux', name: 'Bordeaux', x: 25, y: 62, region: 'west' },
      ],
    },
  ],
  connections: [
    // Northern connections
    { cityA: 'lille', cityB: 'paris' },
    { cityA: 'paris', cityB: 'orleans' },

    // Southern connections
    { cityA: 'toulouse', cityB: 'marseille' },

    // Major connections
    { cityA: 'paris', cityB: 'bordeaux' },
    { cityA: 'bordeaux', cityB: 'toulouse' },
    { cityA: 'paris', cityB: 'strasbourg' },
  ],
};

export const MAPS: Record<string, GameMap> = {
  usa: USA_MAP,
  germany: GERMANY_MAP,
  france: FRANCE_MAP,
};

export function getMapByName(name?: string): GameMap | undefined {
  if (!name) return undefined;
  try {
    return MAPS[name.toLowerCase()];
  } catch {
    return undefined;
  }
}

export function getAllCities(map: GameMap): City[] {
  return map.regions.flatMap((region) => region.cities);
}

export function getCitiesInRegion(map: GameMap, regionId: string): City[] {
  const region = map.regions.find((r) => r.id === regionId);
  return region?.cities || [];
}

/**
 * Check if a city is connected to a player's existing network
 * @param cityId City to check
 * @param playerCities Set of cities the player owns
 * @param connections Map connections
 * @returns true if connected or first city
 */
export function isConnectedToNetwork(
  cityId: string,
  playerCities: Map<string, number>,
  connections: Array<{ cityA: string; cityB: string }>
): boolean {
  // First city is always valid
  if (playerCities.size === 0) return true;

  const ownedCities = Array.from(playerCities.keys());
  
  // Check if cityId is directly connected to any owned city
  return connections.some(conn =>
    (conn.cityA === cityId && ownedCities.includes(conn.cityB)) ||
    (conn.cityB === cityId && ownedCities.includes(conn.cityA))
  );
}

/**
 * Calculate the cost to build in a city based on connections
 * @param cityId City to build in
 * @param playerCities Cities the player owns
 * @param connections Map connections
 * @param baseCost Base building cost
 * @returns Cost to build
 */
export function calculateBuildCost(
  cityId: string,
  playerCities: Map<string, number>,
  connections: Array<{ cityA: string; cityB: string }>,
  baseCost: number = 10
): number {
  // First city: base cost
  if (playerCities.size === 0) return baseCost;

  // Find shortest path distance to existing network
  // For simplicity, use direct connection = baseCost, otherwise baseCost + 5 per hop
  const isDirectlyConnected = isConnectedToNetwork(cityId, playerCities, connections);
  
  return isDirectlyConnected ? baseCost : baseCost + 5;
}

/**
 * Validate that a map has complete topological coverage
 * - All regions have adjacency data
 * - Adjacencies are bidirectional
 * - No gaps in subdivision (visual verification required)
 */
export function validateMapTopology(map: GameMap): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (const region of map.regions) {
    // Check adjacency data exists
    if (!region.adjacencies) {
      warnings.push(`Region "${region.name}" (${region.id}) missing adjacencies`);
      continue;
    }

    // Check bidirectional adjacency
    for (const adjId of region.adjacencies) {
      const adjRegion = map.regions.find(r => r.id === adjId);
      if (!adjRegion) {
        warnings.push(`Region "${region.name}" references non-existent adjacent region "${adjId}"`);
        continue;
      }
      if (!adjRegion.adjacencies?.includes(region.id)) {
        warnings.push(`Region "${region.name}" → "${adjId}" is not bidirectional`);
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Log map topology validation results
 */
export function logMapValidation(maps: Record<string, GameMap> = MAPS): void {
  console.log('=== Map Topology Validation ===');
  for (const [mapId, map] of Object.entries(maps)) {
    const result = validateMapTopology(map);
    console.log(`\n${map.name} (${mapId}): ${result.valid ? '✓ Valid' : '⚠ Issues'}`);
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.log(`  • ${w}`));
    } else {
      console.log(`  ✓ All regions have bidirectional adjacencies`);
    }
  }
}
