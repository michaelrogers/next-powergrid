/**
 * Map regeneration script using Voronoi subdivision
 * Generates topologically-connected regions from city seed points
 */

import { generateVoronoi, groupCellsIntoRegions, mergeVoronoiCells } from './voronoi';
import type { Point, VoronoiDiagram } from './voronoi';

export interface RegionDefinition {
  id: string;
  name: string;
  regionColor: string;
  cities: Array<{ id: string; name: string; x: number; y: number; region: string }>;
  polygon: Point[];
  adjacencies: string[];
}

export interface CityData {
  id: string;
  name: string;
  x: number;
  y: number;
  regionId: string;
}

/**
 * Regenerate a map using Voronoi subdivision
 */
export function regenerateMapWithVoronoi(
  mapId: string,
  cities: CityData[],
  regionNames: string[],
  regionColors: string[],
  mapBounds: { width: number; height: number }
): RegionDefinition[] {
  // Convert cities to seed points
  const seeds: Point[] = cities.map(city => ({
    x: city.x,
    y: city.y,
    id: city.regionId
  }));

  // Generate Voronoi diagram
  const diagram = generateVoronoi(seeds, mapBounds);

  // Group cells into regions by target region count
  const cellGroups = groupCellsIntoRegions(diagram, regionNames.length);

  // Convert groups to region definitions
  const regions: RegionDefinition[] = [];
  let regionIdx = 0;

  for (const [_groupId, cellIds] of cellGroups.entries()) {
    if (regionIdx >= regionNames.length) break;

    // Merge Voronoi cells for this region
    const polygon = mergeVoronoiCells(cellIds, diagram);

    // Find adjacent regions
    const adjacencies = new Set<string>();
    for (const cellId of cellIds) {
      const cell = diagram.cells.get(cellId);
      if (cell) {
        for (const neighbor of cell.neighbors) {
          // Find which region this neighbor belongs to
          for (const [_gId, cells] of cellGroups.entries()) {
            if (cells.includes(neighbor) && cells !== cellIds) {
              adjacencies.add(_gId);
            }
          }
        }
      }
    }

    // Cities in this region
    const regionCities = cities
      .filter(city => cellIds.some(cId => diagram.cells.get(cId)?.seed.id === city.regionId))
      .map(city => ({
        ...city,
        region: city.regionId
      }));

    regions.push({
      id: `region_${regionIdx}`,
      name: regionNames[regionIdx],
      regionColor: regionColors[regionIdx],
      cities: regionCities,
      polygon,
      adjacencies: Array.from(adjacencies)
    });

    regionIdx++;
  }

  return regions;
}

/**
 * Generate USA map regions from current cities
 */
export function generateUSARegions(): RegionDefinition[] {
  const usaCities: CityData[] = [
    // Northeast
    { id: 'boston', name: 'Boston', x: 93.99840411166905, y: 29.9072639371103, regionId: 'northeast' },
    { id: 'newyork', name: 'New York', x: 89.70595235211088, y: 35.00796205907291, regionId: 'northeast' },
    { id: 'buffalo', name: 'Buffalo', x: 87.5, y: 30, regionId: 'northeast' },
    { id: 'philadelphia', name: 'Philadelphia', x: 87.00466781727214, y: 40.58479093494212, regionId: 'northeast' },
    { id: 'pittsburgh', name: 'Pittsburgh', x: 80, y: 37, regionId: 'northeast' },
    { id: 'washington', name: 'Washington', x: 82.09704123812051, y: 45.522676729004786, regionId: 'northeast' },
    { id: 'norfolk', name: 'Norfolk', x: 88, y: 48, regionId: 'northeast' },

    // Midwest
    { id: 'minneapolis', name: 'Minneapolis', x: 54.51483586315582, y: 19.10559751439412, regionId: 'midwest' },
    { id: 'chicago', name: 'Chicago', x: 63.08522438918609, y: 33.525932255214585, regionId: 'midwest' },
    { id: 'detroit', name: 'Detroit', x: 70.73628731605355, y: 31.287363203318602, regionId: 'midwest' },
    { id: 'stlouis', name: 'St. Louis', x: 50, y: 38, regionId: 'midwest' },

    // South
    { id: 'atlanta', name: 'Atlanta', x: 71.37909183320373, y: 66.56009593690567, regionId: 'south' },
    { id: 'houston', name: 'Houston', x: 51.06715908621727, y: 78.77572730314493, regionId: 'south' },
    { id: 'dallas', name: 'Dallas', x: 49.56892067174027, y: 68.22726391639598, regionId: 'south' },
    { id: 'neworleans', name: 'New Orleans', x: 59.81752899355286, y: 79.40803813930793, regionId: 'south' },

    // West
    { id: 'seattle', name: 'Seattle', x: 6.578338810050828, y: 7.528115519929222, regionId: 'west' },
    { id: 'portland', name: 'Portland', x: 2.7944491151434283, y: 18.406997864802428, regionId: 'west' },
    { id: 'sanfrancisco', name: 'San Francisco', x: 4.374609375, y: 49.154296875, regionId: 'west' },
    { id: 'losangeles', name: 'Los Angeles', x: 10.358984374999999, y: 61.65625, regionId: 'west' },
    { id: 'lasvegas', name: 'Las Vegas', x: 16.039988501281545, y: 54.49745794522451, regionId: 'west' },
    { id: 'denver', name: 'Denver', x: 34.59607249420412, y: 43.2534293192983, regionId: 'west' }
  ];

  const regionNames = ['Northeast', 'Midwest', 'South', 'West'];
  const regionColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171'];

  return regenerateMapWithVoronoi('usa', usaCities, regionNames, regionColors, { width: 100, height: 100 });
}

/**
 * Generate Germany map regions
 */
export function generateGermanyRegions(): RegionDefinition[] {
  const germanyCities: CityData[] = [
    { id: 'kiel', name: 'Kiel', x: 55, y: 5, regionId: 'north' },
    { id: 'bremen', name: 'Bremen', x: 40, y: 10, regionId: 'north' },
    { id: 'lueneburg', name: 'Lüneburg', x: 50, y: 12, regionId: 'north' },

    { id: 'cologne', name: 'Cologne', x: 25, y: 30, regionId: 'west' },
    { id: 'aachen', name: 'Aachen', x: 20, y: 28, regionId: 'west' },
    { id: 'koblenz', name: 'Koblenz', x: 30, y: 35, regionId: 'west' },

    { id: 'leipzig', name: 'Leipzig', x: 65, y: 30, regionId: 'east' },
    { id: 'dresden', name: 'Dresden', x: 70, y: 28, regionId: 'east' },

    { id: 'nuremberg', name: 'Nuremberg', x: 55, y: 50, regionId: 'south' },
    { id: 'munich', name: 'Munich', x: 60, y: 60, regionId: 'south' }
  ];

  const regionNames = ['North', 'West', 'East', 'Central', 'South'];
  const regionColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

  return regenerateMapWithVoronoi('germany', germanyCities, regionNames, regionColors, { width: 100, height: 100 });
}

/**
 * Generate France map regions
 */
export function generateFranceRegions(): RegionDefinition[] {
  const franceCities: CityData[] = [
    { id: 'amiens', name: 'Amiens', x: 60, y: 20, regionId: 'north' },
    { id: 'paris', name: 'Paris', x: 55, y: 30, regionId: 'paris' },
    { id: 'orleans', name: 'Orléans', x: 58, y: 38, regionId: 'west' },
    { id: 'strasbourg', name: 'Strasbourg', x: 75, y: 35, regionId: 'east' },
    { id: 'lyon', name: 'Lyon', x: 65, y: 50, regionId: 'south' },
    { id: 'marseille', name: 'Marseille', x: 70, y: 62, regionId: 'south' },
    { id: 'bordeaux', name: 'Bordeaux', x: 40, y: 50, regionId: 'west' }
  ];

  const regionNames = ['Nord', 'Paris', 'Est', 'Ouest', 'Midi'];
  const regionColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

  return regenerateMapWithVoronoi('france', franceCities, regionNames, regionColors, { width: 100, height: 100 });
}
