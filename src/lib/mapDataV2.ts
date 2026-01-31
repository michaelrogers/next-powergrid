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
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface RegionDefinition {
  id: string;
  name: string;
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

// USA Map - V2 architecture
export const USA_MAP_V2: GameMapV2 = {
  id: 'usa',
  name: 'United States',
  width: 1000,
  height: 600,
  cities: [
    // Northeast cities
    { id: 'boston', name: 'Boston', x: 85, y: 32 },
    { id: 'newyork', name: 'New York', x: 83, y: 35 },
    { id: 'buffalo', name: 'Buffalo', x: 77, y: 31 },
    { id: 'philadelphia', name: 'Philadelphia', x: 82, y: 38 },
    { id: 'pittsburgh', name: 'Pittsburgh', x: 74, y: 38 },
    { id: 'washington', name: 'Washington', x: 78, y: 42 },
    { id: 'norfolk', name: 'Norfolk', x: 81, y: 45 },
    
    // Midwest cities
    { id: 'minneapolis', name: 'Minneapolis', x: 52, y: 25 },
    { id: 'chicago', name: 'Chicago', x: 62, y: 33 },
    { id: 'detroit', name: 'Detroit', x: 68, y: 31 },
    { id: 'stlouis', name: 'St. Louis', x: 56, y: 42 },
    
    // South cities
    { id: 'atlanta', name: 'Atlanta', x: 68, y: 52 },
    { id: 'houston', name: 'Houston', x: 48, y: 62 },
    { id: 'dallas', name: 'Dallas', x: 47, y: 54 },
    { id: 'neworleans', name: 'New Orleans', x: 56, y: 63 },
    
    // West cities
    { id: 'seattle', name: 'Seattle', x: 18, y: 24 },
    { id: 'portland', name: 'Portland', x: 17, y: 28 },
    { id: 'sanfrancisco', name: 'San Francisco', x: 16, y: 44 },
    { id: 'losangeles', name: 'Los Angeles', x: 20, y: 52 },
    { id: 'lasvegas', name: 'Las Vegas', x: 25, y: 46 },
    { id: 'denver', name: 'Denver', x: 35, y: 38 },
  ],
  regions: [
    {
      name: 'Northeast',
      regionColor: '#60a5fa',
      cityIds: ['boston', 'newyork', 'buffalo', 'philadelphia', 'pittsburgh', 'washington', 'norfolk'],
    },
    {
      id: 'midwest',
      regionColor: '#f59e0b',
      cityIds: ['minneapolis', 'chicago', 'detroit', 'stlouis'],
    },
    {
      id: 'south',
      name: 'South',
      regionColor: '#10b981',
      cityIds: ['atlanta', 'houston', 'dallas', 'neworleans'],
    },
    {
      id: 'west',
      regionColor: '#ef4444',
      cityIds: ['seattle', 'portland', 'sanfrancisco', 'losangeles', 'lasvegas', 'denver'],
    },
  ],
  connections: [
    // Northeast connections
    { cityA: 'newyork', cityB: 'philadelphia' },
    { cityA: 'philadelphia', cityB: 'washington' },
    { cityA: 'pittsburgh', cityB: 'philadelphia' },
    { cityA: 'buffalo', cityB: 'newyork' },
    { cityA: 'norfolk', cityB: 'washington' },

    // Midwest connections
    { cityA: 'minneapolis', cityB: 'chicago' },
    { cityA: 'chicago', cityB: 'detroit' },
    { cityA: 'chicago', cityB: 'stlouis' },
    { cityA: 'detroit', cityB: 'newyork' },

    // East-West connections
    { cityA: 'stlouis', cityB: 'dallas' },
    { cityA: 'chicago', cityB: 'washington' },
    { cityA: 'pittsburgh', cityB: 'chicago' },

    // South connections
    { cityA: 'stlouis', cityB: 'atlanta' },
    { cityA: 'atlanta', cityB: 'neworleans' },
    { cityA: 'dallas', cityB: 'houston' },
    { cityA: 'houston', cityB: 'neworleans' },

    // West connections
    { cityA: 'seattle', cityB: 'portland' },
    { cityA: 'portland', cityB: 'sanfrancisco' },
    { cityA: 'sanfrancisco', cityB: 'losangeles' },
    { cityA: 'losangeles', cityB: 'lasvegas' },
    { cityA: 'denver', cityB: 'lasvegas' },
    { cityA: 'denver', cityB: 'dallas' },
    { cityA: 'denver', cityB: 'sanfrancisco' },
  ],
};

export const GERMANY_MAP_V2: GameMapV2 = {
  id: 'germany',
  name: 'Germany',
  width: 800,
  height: 600,
  cities: [
    // North
    { id: 'hamburg', name: 'Hamburg', x: 48, y: 22 },
    { id: 'kiel', name: 'Kiel', x: 48, y: 15 },
    { id: 'lueneburg', name: 'Lüneburg', x: 52, y: 24 },

    // West
    { id: 'cologne', name: 'Cologne', x: 32, y: 45 },
    { id: 'aachen', name: 'Aachen', x: 28, y: 45 },
    { id: 'koblenz', name: 'Koblenz', x: 35, y: 48 },

    // Central
    { id: 'frankfurt', name: 'Frankfurt', x: 42, y: 48 },

    // East
    { id: 'berlin', name: 'Berlin', x: 62, y: 30 },
    { id: 'leipzig', name: 'Leipzig', x: 58, y: 44 },
    { id: 'dresden', name: 'Dresden', x: 64, y: 45 },

    // South
    { id: 'nuremberg', name: 'Nuremberg', x: 52, y: 60 },
    { id: 'munich', name: 'Munich', x: 52, y: 72 },
  ],
  regions: [
    {
      name: 'North',
      costMultiplier: 1.0,
      regionColor: '#60a5fa',
      cityIds: ['hamburg', 'kiel', 'lueneburg'],
    },
    {
      id: 'west',
      costMultiplier: 1.1,
      regionColor: '#ef4444',
      cityIds: ['cologne', 'aachen', 'koblenz'],
    },
    {
      id: 'central',
      costMultiplier: 1.05,
      regionColor: '#10b981',
      cityIds: ['frankfurt'],
    },
    {
      id: 'east',
      name: 'East',
      costMultiplier: 0.95,
      regionColor: '#f59e0b',
      cityIds: ['berlin', 'leipzig', 'dresden'],
    },
    {
      id: 'south',
      name: 'South',
      costMultiplier: 1.15,
      regionColor: '#8b5cf6',
      cityIds: ['nuremberg', 'munich'],
    },
  ],
  connections: [
    { cityA: 'hamburg', cityB: 'kiel' },
    { cityA: 'hamburg', cityB: 'berlin' },
    { cityA: 'berlin', cityB: 'leipzig' },
    { cityA: 'leipzig', cityB: 'dresden' },
    { cityA: 'cologne', cityB: 'aachen' },
    { cityA: 'cologne', cityB: 'frankfurt' },
    { cityA: 'frankfurt', cityB: 'nuremberg' },
    { cityA: 'nuremberg', cityB: 'munich' },
    { cityA: 'leipzig', cityB: 'nuremberg' },
  ],
};

// France Map - V2
export const FRANCE_MAP_V2: GameMapV2 = {
  id: 'france',
  name: 'France',
  width: 800,
  height: 700,
  cities: [
    { id: 'amiens', name: 'Amiens', x: 48, y: 26 },
    { id: 'paris', name: 'Paris', x: 46, y: 32 },
    { id: 'orleans', name: 'Orléans', x: 44, y: 40 },
    { id: 'strasbourg', name: 'Strasbourg', x: 68, y: 35 },
    { id: 'bordeaux', name: 'Bordeaux', x: 32, y: 58 },
    { id: 'lyon', name: 'Lyon', x: 56, y: 52 },
    { id: 'marseille', name: 'Marseille', x: 58, y: 68 },
  ],
  regions: [
    {
      id: 'nord',
      name: 'Nord',
      costMultiplier: 1.1,
      regionColor: '#60a5fa',
      cityIds: ['amiens'],
    },
    {
      id: 'paris',
      name: 'Paris',
      costMultiplier: 1.2,
      regionColor: '#34d399',
      cityIds: ['paris', 'orleans'],
    },
    {
      id: 'east',
      name: 'Est',
      costMultiplier: 1.05,
      regionColor: '#fbbf24',
      cityIds: ['strasbourg'],
    },
    {
      id: 'west',
      name: 'Ouest',
      costMultiplier: 0.95,
      regionColor: '#f87171',
      cityIds: ['bordeaux'],
    },
    {
      id: 'south',
      name: 'Midi',
      costMultiplier: 1.0,
      regionColor: '#a78bfa',
      cityIds: ['lyon', 'marseille'],
    },
  ],
  connections: [
    { cityA: 'amiens', cityB: 'paris' },
    { cityA: 'paris', cityB: 'orleans' },
    { cityA: 'paris', cityB: 'strasbourg' },
    { cityA: 'paris', cityB: 'bordeaux' },
    { cityA: 'orleans', cityB: 'lyon' },
    { cityA: 'bordeaux', cityB: 'lyon' },
    { cityA: 'lyon', cityB: 'marseille' },
    { cityA: 'lyon', cityB: 'strasbourg' },
  ],
};

export const MAPS_V2: Record<string, GameMapV2> = {
  usa: USA_MAP_V2,
  germany: GERMANY_MAP_V2,
  france: FRANCE_MAP_V2,
};

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
    const neighbors = new Set<string>();
    const regionCities = getCitiesInRegionV2(map, region.id);

    // For each city in this region, find nearest cities in other regions
    for (const city of regionCities) {
      for (const otherRegion of map.regions) {
        if (otherRegion.id === region.id) continue;

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
