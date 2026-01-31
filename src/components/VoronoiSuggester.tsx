/**
 * Voronoi Region Renderer Component
 * Displays region boundaries computed from city seed points
 * Regions are auto-generated via Voronoi diagram from city assignments
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { renderRegionsWithVoronoi } from '@/lib/voronoiRegionRenderer';
import { buildOutlinePoints, getPolygonsFromGeoJson, selectBestPolygon, type GeoJson } from '@/lib/geojsonOutline';
import type { GameMapV2 } from '@/lib/mapDataV2';

interface VoronoiRegionRendererProps {
  map: GameMapV2;
  opacity?: number;
  showLabels?: boolean;
}

/**
 * Renders region boundaries computed from Voronoi diagram
 * Each region is seeded by its assigned cities
 */
export const VoronoiRegionRenderer: React.FC<VoronoiRegionRendererProps> = ({
  map,
  opacity = 0.3,
  showLabels = true,
}) => {
  const [boundaryPolygon, setBoundaryPolygon] = useState<Array<{x: number, y: number}> | null>(null);

  // Load country outline boundary for clipping
  useEffect(() => {
    let cancelled = false;

    async function loadBoundary() {
      try {
        const resp = await fetch(`/maps/${map.id}.geo.json`);
        if (!resp.ok) return;
        const geo: GeoJson = await resp.json();
        const polygons = getPolygonsFromGeoJson(geo);
        
        // Select the best polygon (mainland, not islands)
        const selectedPolygon = selectBestPolygon(polygons, map.id);
        if (selectedPolygon && !cancelled) {
          const boundaryPoints = buildOutlinePoints(selectedPolygon, map.id);
          setBoundaryPolygon(boundaryPoints);
        }
      } catch (e) {
        // ignore
      }
    }

    loadBoundary();
    return () => { cancelled = true; };
  }, [map.id]);

  const renderedRegions = useMemo(() => {
    try {
      return renderRegionsWithVoronoi(map, boundaryPolygon || undefined);
    } catch (e) {
      console.warn('Voronoi rendering failed:', e);
      return [];
    }
  }, [map, boundaryPolygon]);

  if (renderedRegions.length === 0) return null;

  return (
    <g>
      {/* Render polygon fills */}
      {renderedRegions.map((r, idx) => (
        <path
          key={`region-fill-${idx}`}
          d={r.svgPath}
          fill={r.region.regionColor}
          fillOpacity={opacity}
          stroke={r.region.regionColor}
          strokeWidth={2}
          strokeOpacity={0.8}
        />
      ))}

      {/* Render labels */}
      {showLabels && renderedRegions.map((r, idx) => (
        <g key={`region-label-${idx}`}>
          <text
            x={r.centroid.x}
            y={r.centroid.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={r.region.regionColor}
            fontSize="16"
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {r.region.name}
          </text>
          <text
            x={r.centroid.x}
            y={r.centroid.y + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={r.region.regionColor}
            fontSize="12"
            opacity={0.7}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {r.region.cityIds.length} cities
          </text>
        </g>
      ))}
    </g>
  );
};

export default VoronoiRegionRenderer;
