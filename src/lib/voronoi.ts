/**
 * Voronoi diagram generator for map region subdivision
 * Generates region polygons from city seed points with adjacency tracking
 */

export interface Point {
  x: number;
  y: number;
  id?: string;
}

export interface VoronoiCell {
  id: string;
  seed: Point;
  vertices: Point[];
  neighbors: string[]; // Adjacent cell IDs
}

export interface VoronoiDiagram {
  cells: Map<string, VoronoiCell>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Simple Voronoi diagram generator using Fortune's algorithm
 * Simplified implementation that generates cell boundaries and adjacencies
 */
export function generateVoronoi(seeds: Point[], bounds: { width: number; height: number }): VoronoiDiagram {
  const cellMap = new Map<string, VoronoiCell>();
  
  // Create initial cells and build seed ID map
  const seedMap = new Map<string, Point>();
  for (const seed of seeds) {
    const id = seed.id || `cell_${seeds.indexOf(seed)}`;
    cellMap.set(id, { id, seed, vertices: [], neighbors: [] });
    seedMap.set(id, seed);
  }

  // Compute Voronoi cells using grid-based assignment
  const resolution = 0.5; // Higher resolution for better quality Voronoi boundaries
  const cellAssignment = new Map<string, Point[]>();

  // Initialize assignment map
  for (const id of seedMap.keys()) {
    cellAssignment.set(id, []);
  }

  // Assign grid points to nearest seed (Voronoi cell)
  for (let x = 0; x <= 100; x += resolution) {
    for (let y = 0; y <= 100; y += resolution) {
      const point = { x, y };
      let nearestId = '';
      let minDist = Infinity;

      for (const [id, seed] of seedMap) {
        const dist = distance(point, seed);
        if (dist < minDist) {
          minDist = dist;
          nearestId = id;
        }
      }

      if (nearestId) {
        cellAssignment.get(nearestId)?.push(point);
      }
    }
  }

  // Build cell vertices and find boundaries
  for (const [cellId, points] of cellAssignment.entries()) {
    const cell = cellMap.get(cellId)!;
    
    // Compute convex hull of assigned points to get cell boundary
    cell.vertices = convexHull(points);
    
    // Find neighboring cells by checking edge proximity
    cell.neighbors = findNeighbors(cellId, cellMap, cellAssignment);
  }

  return {
    cells: cellMap,
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  };
}

/**
 * Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute convex hull using Graham scan algorithm
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // Sort points by x, then by y
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

  // Build lower hull
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  // Build upper hull
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  // Remove last point of each half because it's repeated
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/**
 * Cross product of vectors OA and OB
 */
function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Find neighboring cells by checking which cells share edges
 */
function findNeighbors(cellId: string, cellMap: Map<string, VoronoiCell>, cellAssignment: Map<string, Point[]>): string[] {
  const neighbors = new Set<string>();
  const myPoints = cellAssignment.get(cellId) || [];

  for (const [otherId, otherPoints] of cellAssignment.entries()) {
    if (otherId === cellId) continue;

    // Check if cells are adjacent by finding nearby points
    for (const myPoint of myPoints) {
      for (const otherPoint of otherPoints) {
        if (distance(myPoint, otherPoint) < 15) { // Adjacency threshold
          neighbors.add(otherId);
          break;
        }
      }
      if (neighbors.has(otherId)) break;
    }
  }

  return Array.from(neighbors);
}

/**
 * Group Voronoi cells into regions by clustering nearby cells
 */
export function groupCellsIntoRegions(
  diagram: VoronoiDiagram,
  targetRegionCount: number
): Map<string, string[]> {
  const regions = new Map<string, string[]>();
  const assigned = new Set<string>();
  let regionId = 0;

  // Simple greedy clustering: start with unassigned cells and grow regions
  for (const [cellId] of diagram.cells) {
    if (assigned.has(cellId)) continue;

    const region: string[] = [cellId];
    assigned.add(cellId);
    const queue = [cellId];

    // Grow region until it reaches reasonable size
    const targetCellsPerRegion = Math.ceil(diagram.cells.size / targetRegionCount);

    while (queue.length > 0 && region.length < targetCellsPerRegion) {
      const current = queue.shift()!;
      const cell = diagram.cells.get(current)!;

      for (const neighbor of cell.neighbors) {
        if (!assigned.has(neighbor)) {
          assigned.add(neighbor);
          region.push(neighbor);
          queue.push(neighbor);
        }
      }
    }

    regions.set(`region_${regionId}`, region);
    regionId++;
  }

  // Assign any remaining unassigned cells to nearest region
  for (const [cellId] of diagram.cells) {
    if (!assigned.has(cellId)) {
      let nearestRegion = '';
      let minDist = Infinity;

      for (const [regionId, cells] of regions.entries()) {
        for (const rCell of cells) {
          const dist = distance(diagram.cells.get(cellId)!.seed, diagram.cells.get(rCell)!.seed);
          if (dist < minDist) {
            minDist = dist;
            nearestRegion = regionId;
          }
        }
      }

      if (nearestRegion) {
        regions.get(nearestRegion)?.push(cellId);
      }
    }
  }

  return regions;
}

/**
 * Compute merged polygon from multiple Voronoi cells
 */
export function mergeVoronoiCells(cellIds: string[], diagram: VoronoiDiagram): Point[] {
  const allVertices: Point[] = [];

  for (const cellId of cellIds) {
    const cell = diagram.cells.get(cellId);
    if (cell) {
      allVertices.push(...cell.vertices);
    }
  }

  // Compute convex hull of all vertices
  return convexHull(allVertices);
}
