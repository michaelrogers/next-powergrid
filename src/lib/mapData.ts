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
  // improved USA outline approximating continental US silhouette
  countryOutline: 'M80,120 C96,88 130,66 180,58 C230,52 290,54 350,70 C410,86 470,98 520,114 C560,132 600,150 640,174 C680,200 720,236 760,276 C792,312 814,352 824,392 C830,420 828,450 808,480 C782,510 740,526 688,536 C632,544 572,548 512,548 C452,548 392,544 332,536 C286,528 242,514 198,494 C166,478 138,456 118,426 C104,400 98,368 96,334 C94,300 96,268 104,238 C112,208 124,182 142,156 C156,138 168,126 182,120 C196,116 220,118 80,120 Z',
  regions: [
    {
      id: 'northeast',
      name: 'Northeast',
      costMultiplier: 1.2,
      regionOutline: 'M72,8 C78,6 86,6 92,10 C98,14 96,22 90,26 C84,24 78,18 72,8 Z',
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
      regionOutline: 'M36,12 C46,8 58,10 64,20 C62,28 54,34 46,32 C42,24 38,18 36,12 Z',
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
      regionOutline: 'M56,30 C66,26 76,30 78,40 C76,50 64,54 54,52 C48,46 46,38 56,30 Z',
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
      regionOutline: 'M6,6 C18,4 34,6 44,18 C42,28 32,34 18,34 C10,24 8,12 6,6 Z',
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
  // refined Germany outline with smoother curves
  countryOutline: 'M180,115 C205,98 240,92 280,90 C320,88 360,92 400,100 C440,110 480,120 520,135 C548,148 570,165 590,190 C605,210 612,235 620,260 C628,285 632,310 636,340 C640,370 640,400 632,430 C622,455 602,475 576,490 C546,502 514,508 480,510 C440,512 400,510 360,506 C320,502 285,498 250,492 C220,486 200,468 185,445 C175,428 170,405 168,380 C166,350 168,320 172,290 C176,260 182,235 188,210 C192,190 184,135 180,115 Z',
  regions: [
    {
      id: 'north',
      name: 'North Germany',
      costMultiplier: 1.0,
      regionOutline: 'M28,10 C38,6 52,6 60,12 C62,18 56,26 46,28 C36,24 30,16 28,10 Z',
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
      regionOutline: 'M12,30 C22,26 34,26 40,34 C38,42 30,46 22,46 C14,42 12,34 12,30 Z',
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
      regionOutline: 'M48,32 C56,28 68,30 72,38 C70,46 60,50 52,48 C48,42 48,36 48,32 Z',
      cities: [
        { id: 'leipzig', name: 'Leipzig', x: 55, y: 40, region: 'east' },
        { id: 'dresden', name: 'Dresden', x: 65, y: 42, region: 'east' },
      ],
    },
    {
      id: 'south',
      name: 'South Germany',
      costMultiplier: 1.15,
      regionOutline: 'M36,50 C46,46 62,46 66,60 C62,70 46,74 38,66 C34,60 34,54 36,50 Z',
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
  // refined France outline (smoother coastal curves)
  countryOutline: 'M240,110 C280,95 320,90 360,90 C400,90 440,94 480,104 C510,112 538,124 560,140 C580,156 596,176 610,200 C622,222 632,248 640,278 C648,308 652,338 654,370 C656,402 654,436 648,468 C642,496 630,520 616,542 C596,564 572,578 544,588 C512,598 480,600 446,598 C418,596 390,592 362,586 C332,580 304,572 276,562 C248,552 226,542 206,528 C190,516 178,500 168,482 C160,466 154,444 152,420 C150,396 152,372 156,350 C160,328 168,306 178,288 C188,270 200,252 216,236 C230,222 238,200 240,180 C242,160 236,130 240,110 Z',
  regions: [
    {
      id: 'paris',
      name: 'Paris',
      costMultiplier: 1.2,
      regionOutline: 'M30,22 C38,18 46,18 50,26 C50,34 44,36 36,36 C30,30 30,26 30,22 Z',
      cities: [
        { id: 'paris', name: 'Paris', x: 35, y: 28, region: 'paris' },
        { id: 'orleans', name: 'Orléans', x: 40, y: 35, region: 'paris' },
      ],
    },
    {
      id: 'north',
      name: 'Nord',
      costMultiplier: 1.1,
      regionOutline: 'M36,8 C42,6 48,6 52,12 C50,20 42,22 34,18 C30,14 34,10 36,8 Z',
      cities: [
        { id: 'lille', name: 'Lille', x: 42, y: 12, region: 'north' },
        { id: 'amiens', name: 'Amiens', x: 38, y: 18, region: 'north' },
      ],
    },
    {
      id: 'south',
      name: 'Midi',
      costMultiplier: 1.0,
      regionOutline: 'M20,62 C30,60 44,60 52,70 C48,78 36,84 26,80 C20,74 20,68 20,62 Z',
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
      regionOutline: 'M52,30 C60,28 70,30 74,38 C72,46 60,50 54,46 C50,40 52,34 52,30 Z',
      cities: [
        { id: 'nancy', name: 'Nancy', x: 60, y: 32, region: 'east' },
        { id: 'strasbourg', name: 'Strasbourg', x: 70, y: 35, region: 'east' },
      ],
    },
    {
      id: 'west',
      name: 'Ouest',
      costMultiplier: 0.95,
      regionOutline: 'M18,42 C26,38 36,38 36,50 C32,60 22,64 14,56 C12,50 14,46 18,42 Z',
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
