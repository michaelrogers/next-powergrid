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
}

export interface GameMap {
  id: string;
  name: string;
  width: number; // SVG viewBox width
  height: number; // SVG viewBox height
  regions: MapRegion[];
  connections: Array<{ cityA: string; cityB: string }>; // city connections
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
      cities: [
        { id: 'boston', name: 'Boston', x: 85, y: 15, region: 'northeast' },
        { id: 'newyork', name: 'New York', x: 80, y: 18, region: 'northeast' },
        { id: 'philadelphia', name: 'Philadelphia', x: 77, y: 22, region: 'northeast' },
        { id: 'washington', name: 'Washington', x: 75, y: 28, region: 'northeast' },
      ],
    },
    {
      id: 'midwest',
      name: 'Midwest',
      costMultiplier: 1.0,
      cities: [
        { id: 'chicago', name: 'Chicago', x: 50, y: 25, region: 'midwest' },
        { id: 'detroit', name: 'Detroit', x: 55, y: 20, region: 'midwest' },
        { id: 'minneapolis', name: 'Minneapolis', x: 45, y: 15, region: 'midwest' },
        { id: 'stlouis', name: 'St. Louis', x: 48, y: 35, region: 'midwest' },
      ],
    },
    {
      id: 'south',
      name: 'South',
      costMultiplier: 0.9,
      cities: [
        { id: 'atlanta', name: 'Atlanta', x: 70, y: 40, region: 'south' },
        { id: 'houston', name: 'Houston', x: 35, y: 45, region: 'south' },
        { id: 'dallas', name: 'Dallas', x: 40, y: 40, region: 'south' },
        { id: 'neworleans', name: 'New Orleans', x: 42, y: 52, region: 'south' },
      ],
    },
    {
      id: 'west',
      name: 'West',
      costMultiplier: 1.1,
      cities: [
        { id: 'seattle', name: 'Seattle', x: 15, y: 12, region: 'west' },
        { id: 'portland', name: 'Portland', x: 18, y: 15, region: 'west' },
        { id: 'sanfrancisco', name: 'San Francisco', x: 12, y: 28, region: 'west' },
        { id: 'losangeles', name: 'Los Angeles', x: 10, y: 35, region: 'west' },
        { id: 'lasvegas', name: 'Las Vegas', x: 18, y: 32, region: 'west' },
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
      name: 'North Germany',
      costMultiplier: 1.0,
      cities: [
        { id: 'hamburg', name: 'Hamburg', x: 45, y: 15, region: 'north' },
        { id: 'bremen', name: 'Bremen', x: 35, y: 18, region: 'north' },
        { id: 'berlin', name: 'Berlin', x: 60, y: 20, region: 'north' },
      ],
    },
    {
      id: 'west',
      name: 'West Germany',
      costMultiplier: 1.1,
      cities: [
        { id: 'cologne', name: 'Cologne', x: 20, y: 35, region: 'west' },
        { id: 'dusseldorf', name: 'Düsseldorf', x: 25, y: 32, region: 'west' },
        { id: 'frankfurt', name: 'Frankfurt', x: 35, y: 45, region: 'west' },
      ],
    },
    {
      id: 'east',
      name: 'East Germany',
      costMultiplier: 0.95,
      cities: [
        { id: 'leipzig', name: 'Leipzig', x: 55, y: 40, region: 'east' },
        { id: 'dresden', name: 'Dresden', x: 65, y: 42, region: 'east' },
      ],
    },
    {
      id: 'south',
      name: 'South Germany',
      costMultiplier: 1.15,
      cities: [
        { id: 'munich', name: 'Munich', x: 60, y: 65, region: 'south' },
        { id: 'Stuttgart', name: 'Stuttgart', x: 42, y: 58, region: 'south' },
        { id: 'nuremberg', name: 'Nuremberg', x: 50, y: 50, region: 'south' },
      ],
    },
  ],
  connections: [
    // North connections
    { cityA: 'hamburg', cityB: 'bremen' },
    { cityA: 'hamburg', cityB: 'berlin' },
    { cityA: 'bremen', cityB: 'berlin' },

    // West connections
    { cityA: 'cologne', cityB: 'dusseldorf' },
    { cityA: 'dusseldorf', cityB: 'frankfurt' },

    // Major connections
    { cityA: 'berlin', cityB: 'frankfurt' },
    { cityA: 'frankfurt', cityB: 'nuremberg' },
    { cityA: 'nuremberg', cityB: 'munich' },
    { cityA: 'nuremberg', cityB: 'dresden' },
    { cityA: 'stuttgart', cityB: 'nuremberg' },
    { cityA: 'frankfurt', cityB: 'stuttgart' },

    // East connections
    { cityA: 'leipzig', cityB: 'dresden' },
    { cityA: 'berlin', cityB: 'leipzig' },
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
      cities: [
        { id: 'paris', name: 'Paris', x: 35, y: 28, region: 'paris' },
        { id: 'orleans', name: 'Orléans', x: 40, y: 35, region: 'paris' },
      ],
    },
    {
      id: 'north',
      name: 'Nord',
      costMultiplier: 1.1,
      cities: [
        { id: 'lille', name: 'Lille', x: 42, y: 12, region: 'north' },
        { id: 'amiens', name: 'Amiens', x: 38, y: 18, region: 'north' },
      ],
    },
    {
      id: 'south',
      name: 'Midi',
      costMultiplier: 1.0,
      cities: [
        { id: 'toulouse', name: 'Toulouse', x: 30, y: 75, region: 'south' },
        { id: 'marseille', name: 'Marseille', x: 55, y: 72, region: 'south' },
        { id: 'lyon', name: 'Lyon', x: 50, y: 58, region: 'south' },
      ],
    },
    {
      id: 'east',
      name: 'Est',
      costMultiplier: 1.05,
      cities: [
        { id: 'nancy', name: 'Nancy', x: 60, y: 32, region: 'east' },
        { id: 'strasbourg', name: 'Strasbourg', x: 70, y: 35, region: 'east' },
      ],
    },
    {
      id: 'west',
      name: 'Ouest',
      costMultiplier: 0.95,
      cities: [
        { id: 'nantes', name: 'Nantes', x: 25, y: 48, region: 'west' },
        { id: 'bordeaux', name: 'Bordeaux', x: 20, y: 62, region: 'west' },
      ],
    },
  ],
  connections: [
    // Northern connections
    { cityA: 'lille', cityB: 'amiens' },
    { cityA: 'amiens', cityB: 'paris' },

    // Central connections
    { cityA: 'paris', cityB: 'orleans' },
    { cityA: 'paris', cityB: 'nancy' },
    { cityA: 'nancy', cityB: 'strasbourg' },

    // Southern connections
    { cityA: 'lyon', cityB: 'marseille' },
    { cityA: 'lyon', cityB: 'toulouse' },
    { cityA: 'toulouse', cityB: 'marseille' },

    // Major connections
    { cityA: 'orleans', cityB: 'lyon' },
    { cityA: 'paris', cityB: 'bordeaux' },
    { cityA: 'bordeaux', cityB: 'toulouse' },
    { cityA: 'nantes', cityB: 'paris' },
    { cityA: 'strasbourg', cityB: 'lyon' },
  ],
};

export const MAPS: Record<string, GameMap> = {
  usa: USA_MAP,
  germany: GERMANY_MAP,
  france: FRANCE_MAP,
};

export function getMapByName(name: string): GameMap | undefined {
  return MAPS[name.toLowerCase()];
}

export function getAllCities(map: GameMap): City[] {
  return map.regions.flatMap((region) => region.cities);
}

export function getCitiesInRegion(map: GameMap, regionId: string): City[] {
  const region = map.regions.find((r) => r.id === regionId);
  return region?.cities || [];
}
