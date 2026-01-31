type GeoJsonFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][][] | number[][][];
  };
};

export type GeoJson = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

type LonLat = [number, number];
type PolygonRings = LonLat[][];

export function getPolygonsFromGeoJson(data: GeoJson): PolygonRings[] {
  const polygons: PolygonRings[] = [];
  for (const feature of data.features || []) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      polygons.push(geom.coordinates as PolygonRings);
    } else if (geom.type === 'MultiPolygon') {
      const multi = geom.coordinates as PolygonRings[];
      multi.forEach((poly) => polygons.push(poly));
    }
  }
  return polygons;
}

function polygonArea(ring: LonLat[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function ringCentroid(ring: LonLat[]): { lon: number; lat: number } {
  let lon = 0;
  let lat = 0;
  if (!ring.length) return { lon: 0, lat: 0 };
  for (const [x, y] of ring) {
    lon += x;
    lat += y;
  }
  return { lon: lon / ring.length, lat: lat / ring.length };
}

function getPolygonBounds(poly: PolygonRings) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ring of poly) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

export function buildOutlinePath(poly: PolygonRings, mapId?: string): string {
  // Define geographic bounds for each map (in lon/lat) - MUST MATCH buildOutlinePoints
  let lonBounds = [-180, 180];
  let latBounds = [-90, 90];
  
  if (mapId === 'usa') {
    // USA continental bounds (approximately)
    lonBounds = [-125, -66];
    latBounds = [24, 50];
  } else if (mapId === 'germany') {
    // Germany bounds (approximately)
    lonBounds = [6, 16];
    latBounds = [47, 56];
  } else if (mapId === 'france') {
    // France bounds (approximately)
    lonBounds = [-8, 9];
    latBounds = [42, 52];
  }
  
  const [minLon, maxLon] = lonBounds;
  const [minLat, maxLat] = latBounds;
  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;
  const toXY = (lon: number, lat: number) => {
    // DON'T clamp - let coordinates flow naturally
    const x = ((lon - minLon) / lonSpan) * 100;
    const y = ((maxLat - lat) / latSpan) * 100;
    return { x, y };
  };

  const paths: string[] = [];
  for (const ring of poly) {
    if (!ring.length) continue;
    const [firstLon, firstLat] = ring[0];
    const first = toXY(firstLon, firstLat);
    const parts = [`M ${first.x.toFixed(2)},${first.y.toFixed(2)}`];
    for (let i = 1; i < ring.length; i++) {
      const { x, y } = toXY(ring[i][0], ring[i][1]);
      parts.push(`L ${x.toFixed(2)},${y.toFixed(2)}`);
    }
    parts.push('Z');
    paths.push(parts.join(' '));
  }
  return paths.join(' ');
}

/**
 * Convert GeoJSON polygon to normalized percentage coordinates (0-100)
 * Normalizes based on geographic bounds, not polygon bounds
 * @param poly GeoJSON polygon rings
 * @param mapId Map identifier to use correct geographic bounds
 */
export function buildOutlinePoints(poly: PolygonRings, mapId?: string): Array<{x: number, y: number}> {
  const outerRing = poly[0] || [];
  if (!outerRing.length) return [];
  
  // Define geographic bounds for each map (in lon/lat)
  let lonBounds = [-180, 180];
  let latBounds = [-90, 90];
  
  if (mapId === 'usa') {
    // USA continental bounds (approximately)
    lonBounds = [-125, -66];
    latBounds = [24, 50];
  } else if (mapId === 'germany') {
    // Germany bounds (approximately)
    lonBounds = [6, 16];
    latBounds = [47, 56];
  } else if (mapId === 'france') {
    // France bounds (approximately)
    lonBounds = [-8, 9];
    latBounds = [42, 52];
  }
  
  const [minLon, maxLon] = lonBounds;
  const [minLat, maxLat] = latBounds;
  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;
  
  const toXY = (lon: number, lat: number) => {
    // DON'T clamp here - allow points outside bounds to pass through
    // This ensures the clipping polygon covers the full coastline
    const x = ((lon - minLon) / lonSpan) * 100;
    const y = ((maxLat - lat) / latSpan) * 100;  // Y inversion
    return { x, y };
  };

  const points: Array<{x: number, y: number}> = [];
  for (const [lon, lat] of outerRing) {
    points.push(toXY(lon, lat));
  }
  
  // Ensure polygon is closed (first point = last point)
  if (points.length > 0) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first.x - last.x) > 0.01 || Math.abs(first.y - last.y) > 0.01) {
      points.push(first); // Close the polygon
    }
  }
  
  return points;
}

export function selectBestPolygon(polygons: PolygonRings[], mapId: string): PolygonRings | null {
  if (!polygons.length) return null;

  if (mapId === 'usa') {
    const filtered = polygons.filter((poly) => {
      const outer = poly[0] || [];
      const { lon, lat } = ringCentroid(outer);
      return lon >= -125 && lon <= -66 && lat >= 24 && lat <= 50;
    });
    const candidates = filtered.length ? filtered : polygons;
    return candidates.reduce((best, poly) => {
      const area = polygonArea(poly[0] || []);
      const bestArea = polygonArea(best[0] || []);
      return area > bestArea ? poly : best;
    }, candidates[0]);
  }

  return polygons.reduce((best, poly) => {
    const area = polygonArea(poly[0] || []);
    const bestArea = polygonArea(best[0] || []);
    return area > bestArea ? poly : best;
  }, polygons[0]);
}