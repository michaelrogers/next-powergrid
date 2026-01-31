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

export function buildOutlinePath(poly: PolygonRings): string {
  const { minLon, maxLon, minLat, maxLat } = getPolygonBounds(poly);
  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;
  const toXY = (lon: number, lat: number) => {
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