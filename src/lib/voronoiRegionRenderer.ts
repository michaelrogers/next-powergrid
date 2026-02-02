/**
 * Voronoi Region Rendering
 * 
 * Generates Voronoi diagram from city seed points and renders regions as collections
 * of individual non-overlapping Voronoi cells. Each cell's boundary is computed by
 * detecting edges not shared with other cells in the same region.
 * 
 * Architecture:
 * - Individual Voronoi cells are non-overlapping by mathematical definition
 * - Interior cell edges (shared between cells in same region) are hidden
 * - Exterior cell edges form the region boundary
 * - Visual clipping to country outline is handled by SVG clipPath in components
 * - Slight overbleed stroke eliminates sub-pixel gaps between cells
 */

import { generateVoronoi, type Point } from './voronoi';
import type { GameMapV2, RegionDefinition } from './mapDataV2';

export interface RenderedRegion {
  region: RegionDefinition;
  cells: Array<{
    polygon: Point[];
    svgPath: string;
    boundaryPath?: string; // SVG path for exposed edges only
  }>;
  centroid: { x: number; y: number };
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function isPointInPolygon(point: { x: number; y: number }, polygon: Array<{x: number, y: number}>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generate SVG path from polygon points
 * Scale from percentage (0-100) to map dimensions
 */
function pointsToSvgPath(points: Array<{ x: number; y: number }>, mapWidth: number, mapHeight: number): string {
  if (points.length < 2) return '';
  
  const pathCommands = points.map((pt, i) => {
    const scaledX = (pt.x / 100) * mapWidth;
    const scaledY = (pt.y / 100) * mapHeight;
    return `${i === 0 ? 'M' : 'L'} ${scaledX.toFixed(4)} ${scaledY.toFixed(4)}`;
  }).join(' ');
  return pathCommands + ' Z';
}

/**
 * Calculate geometric center of a region's cells
 * If boundary is provided, finds the center point that's closest to the geometric center
 * but definitely inside the boundary
 */
function calculateCentroid(
  cells: Array<{ polygon: Point[] }>, 
  mapWidth: number, 
  mapHeight: number,
  boundaryPolygon?: Array<{x: number, y: number}> | null
): { x: number; y: number } {
  if (cells.length === 0) return { x: mapWidth / 2, y: mapHeight / 2 };
  
  // Calculate bounding box of all cells in this region
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const cell of cells) {
    for (const point of cell.polygon) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  
  // Calculate center of bounding box in percentage coords
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Convert to screen coordinates
  let screenX = (centerX / 100) * mapWidth;
  let screenY = (centerY / 100) * mapHeight;
  
  // If boundary provided, try to pull the center point inside if it's outside
  if (boundaryPolygon && boundaryPolygon.length > 0) {
    const centerPoint = { x: centerX, y: centerY };
    if (!isPointInPolygon(centerPoint, boundaryPolygon)) {
      // Find closest boundary edge and move center inward
      let closestDistance = Infinity;
      let closestPoint = centerPoint;
      
      // Sample points along the bounding box and find ones inside the boundary
      const samplePoints: Array<{ x: number; y: number }> = [];
      
      // Add corners and edge midpoints
      for (const cell of cells) {
        for (const point of cell.polygon) {
          if (isPointInPolygon(point, boundaryPolygon)) {
            samplePoints.push(point);
          }
        }
      }
      
      if (samplePoints.length > 0) {
        // Use average of all valid interior points
        const validX = samplePoints.reduce((sum, p) => sum + p.x, 0) / samplePoints.length;
        const validY = samplePoints.reduce((sum, p) => sum + p.y, 0) / samplePoints.length;
        screenX = (validX / 100) * mapWidth;
        screenY = (validY / 100) * mapHeight;
      }
    }
  }
  
  return { x: screenX, y: screenY };
}

/**
 * Render all regions for a map with computed Voronoi boundaries
 * Returns individual Voronoi cells per region (non-overlapping)
 * Cells from same region are visually merged by removing internal strokes
 */
/**
 * Compute exposed boundary edges for a cell within a region
 * Returns SVG path for edges not shared with other cells in the same region
 */
function computeCellBoundaryPath(cellPolygon: Point[], otherCellsInRegion: Point[][], mapWidth: number, mapHeight: number): string | undefined {
  if (cellPolygon.length < 2) return undefined;

  const boundaryEdges: Array<{ p1: Point; p2: Point }> = [];
  const tolerance = 0.1;
  
  // Build a map of edges from all other cells for faster lookup
  const otherEdgesMap = new Map<string, Set<string>>();
  for (const otherPoly of otherCellsInRegion) {
    if (otherPoly === cellPolygon) continue;
    for (let j = 0; j < otherPoly.length; j++) {
      const p1 = otherPoly[j];
      const p2 = otherPoly[(j + 1) % otherPoly.length];
      const key = `${p2.x.toFixed(1)},${p2.y.toFixed(1)}-${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
      if (!otherEdgesMap.has(key)) {
        otherEdgesMap.set(key, new Set());
      }
    }
  }
  
  // Check each edge of this cell
  for (let i = 0; i < cellPolygon.length; i++) {
    const p1 = cellPolygon[i];
    const p2 = cellPolygon[(i + 1) % cellPolygon.length];
    const key = `${p1.x.toFixed(1)},${p1.y.toFixed(1)}-${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    
    // If not found in reversed form in other cells, it's a boundary edge
    if (!otherEdgesMap.has(key)) {
      boundaryEdges.push({ p1, p2 });
    }
  }

  if (boundaryEdges.length === 0) return undefined;

  // Build continuous path by connecting boundary edges
  const orderedPoints: Point[] = [];
  const usedEdges = new Set<number>();
  
  // Start with first edge
  if (boundaryEdges.length > 0) {
    orderedPoints.push(boundaryEdges[0].p1);
    orderedPoints.push(boundaryEdges[0].p2);
    usedEdges.add(0);
    
    // Try to connect remaining edges
    let currentPoint = boundaryEdges[0].p2;
    let foundConnection = true;
    
    while (usedEdges.size < boundaryEdges.length && foundConnection) {
      foundConnection = false;
      
      for (let i = 0; i < boundaryEdges.length; i++) {
        if (usedEdges.has(i)) continue;
        
        const edge = boundaryEdges[i];
        const dist1 = Math.abs(currentPoint.x - edge.p1.x) + Math.abs(currentPoint.y - edge.p1.y);
        const dist2 = Math.abs(currentPoint.x - edge.p2.x) + Math.abs(currentPoint.y - edge.p2.y);
        
        if (dist1 < 0.5) {
          orderedPoints.push(edge.p2);
          currentPoint = edge.p2;
          usedEdges.add(i);
          foundConnection = true;
          break;
        } else if (dist2 < 0.5) {
          orderedPoints.push(edge.p1);
          currentPoint = edge.p1;
          usedEdges.add(i);
          foundConnection = true;
          break;
        }
      }
    }
    
    // Add any remaining unconnected edges as separate segments
    for (let i = 0; i < boundaryEdges.length; i++) {
      if (!usedEdges.has(i)) {
        orderedPoints.push(boundaryEdges[i].p1);
        orderedPoints.push(boundaryEdges[i].p2);
      }
    }
  }

  // Convert to SVG path with line segments - higher precision for tighter fit
  const pathCommands: string[] = [];
  for (let i = 0; i < orderedPoints.length; i++) {
    const pt = orderedPoints[i];
    const x = (pt.x / 100) * mapWidth;
    const y = (pt.y / 100) * mapHeight;
    
    if (i === 0) {
      pathCommands.push(`M ${x.toFixed(4)} ${y.toFixed(4)}`);
    } else {
      pathCommands.push(`L ${x.toFixed(4)} ${y.toFixed(4)}`);
    }
  }

  return pathCommands.join(' ');
}

export function renderRegionsWithVoronoi(map: GameMapV2, boundaryPolygon?: Array<{x: number, y: number}> | null): RenderedRegion[] {
  const seeds = map.cities.map((city, idx) => ({
    x: city.x,
    y: city.y,
    id: city.id || `city_${idx}`,
  }));

  // Generate Voronoi diagram from all cities
  const diagram = generateVoronoi(seeds, { width: map.width, height: map.height });

  // For each region, collect its individual Voronoi cells
  const rendered: RenderedRegion[] = [];

  for (const region of map.regions) {
    // Get all cells for cities in this region
    const cells = region.cityIds
      .map(cityId => {
        const cell = diagram.cells.get(cityId);
        if (cell) {
          const svgPath = pointsToSvgPath(cell.vertices, map.width, map.height);
          return {
            polygon: cell.vertices,
            svgPath,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ polygon: Point[]; svgPath: string }>;

    if (cells.length === 0) continue;

    // Get all polygon arrays for edge comparison
    const allCellPolygons = cells.map(c => c.polygon);

    // Compute boundary paths for each cell
    const cellsWithBoundary = cells.map((cell, idx) => ({
      ...cell,
      boundaryPath: computeCellBoundaryPath(cell.polygon, allCellPolygons, map.width, map.height),
    }));

    // Calculate centroid from all cells in region
    const centroid = calculateCentroid(cellsWithBoundary, map.width, map.height, boundaryPolygon);

    rendered.push({
      region,
      cells: cellsWithBoundary,
      centroid,
    });
  }

  return rendered;
}
