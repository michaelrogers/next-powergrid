'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MAPS_V2, type GameMapV2, type RegionDefinition } from '@/lib/mapDataV2';
import { renderRegionsWithVoronoi } from '@/lib/voronoiRegionRenderer';
import { buildOutlinePath, buildOutlinePoints, getPolygonsFromGeoJson, selectBestPolygon } from '@/lib/geojsonOutline';
import type { GeoJson } from '@/lib/geojsonOutline';

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

type Props = {
  mapId: string;
};

export default function CityRegionEditor({ mapId }: Props) {
  const normalizedId = typeof mapId === 'string' ? mapId.trim().toLowerCase() : '';
  const [resolvedMapId, setResolvedMapId] = useState<string>(normalizedId);
  
  const map = MAPS_V2[resolvedMapId as keyof typeof MAPS_V2];
  
  // State
  const [cities, setCities] = useState(map?.cities || []);
  const [regions, setRegions] = useState(map?.regions || []);
  
  // Sync cities and regions when map changes
  useEffect(() => {
    if (map) {
      setCities(map.cities);
      setRegions(map.regions);
    }
  }, [map]);

  // Load saved cities from map trace file if available
  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    async function loadSavedCities() {
      try {
        const resp = await fetch(`/api/cities?mapId=${map.id}`);
        if (!resp.ok) return; // No saved cities yet, use defaults
        const payload = await resp.json();
        if (payload.ok && payload.data?.cities && !cancelled) {
          setCities(payload.data.cities);
        }
      } catch (err) {
        // ignore - use default cities
      }
    }

    loadSavedCities();
    return () => {
      cancelled = true;
    };
  }, [map]);
  
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [draggedCityId, setDraggedCityId] = useState<string | null>(null);
  const [showCountryOutline, setShowCountryOutline] = useState(true);
  const [countryOutlinePath, setCountryOutlinePath] = useState<string | null>(null);
  
  // Zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [boundaryPolygon, setBoundaryPolygon] = useState<Array<{x: number, y: number}> | null>(null);
  const [citiesOutsideBorder, setCitiesOutsideBorder] = useState<Set<string>>(new Set());
  
  // Voronoi regions - computed asynchronously to avoid blocking render
  const [renderedRegions, setRenderedRegions] = useState<ReturnType<typeof renderRegionsWithVoronoi>>([]);

  // Load country outline
  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    async function loadOutline() {
      try {
        const resp = await fetch(`/maps/${map.id}.geo.json`);
        if (!resp.ok) return;
        const geo: GeoJson = await resp.json();
        const polygons = getPolygonsFromGeoJson(geo);
        
        // Select the best polygon (mainland, not islands)
        const selectedPolygon = selectBestPolygon(polygons, map.id);
        if (selectedPolygon) {
          const outline = buildOutlinePath(selectedPolygon, map.id);
          if (!cancelled) {
            setCountryOutlinePath(outline);
            
            // Convert boundary to percentage coordinates for visual clipping
            const boundaryPoints = buildOutlinePoints(selectedPolygon, map.id);
            setBoundaryPolygon(boundaryPoints);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    loadOutline();
    return () => { cancelled = true; };
  }, [map]);

  // Compute Voronoi regions asynchronously after mount - debounced
  useEffect(() => {
    if (!map || cities.length === 0 || regions.length === 0) {
      setRenderedRegions([]);
      return;
    }
    
    // Don't recalculate Voronoi while actively dragging for performance
    if (draggedCityId) {
      return;
    }
    
    let rafId: number;
    let timeoutId: NodeJS.Timeout;
    
    // Debounce for responsive updates after drag ends
    timeoutId = setTimeout(() => {
      const computeRegions = () => {
        const voronoiRegions = renderRegionsWithVoronoi({ ...map, cities, regions }, boundaryPolygon);
        setRenderedRegions(voronoiRegions);
      };
      
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(computeRegions);
      });
    }, 10); // 10ms debounce - quick update after drag ends
    
    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [map, cities, regions, draggedCityId, boundaryPolygon]);

  // SVG coordinate helpers - memoized (MUST be before early return)
  const toScreen = useCallback((pt: { x: number; y: number }) => ({
    x: (pt.x / 100) * (map?.width || 800),
    y: (pt.y / 100) * (map?.height || 600),
  }), [map?.width, map?.height]);

  const toMap = useCallback((screenPt: { x: number; y: number }) => {
    const svg = svgRef.current;
    if (!svg || !map) return screenPt;

    const rect = svg.getBoundingClientRect();
    // Convert screen coordinates to SVG viewBox coordinates
    const svgX = ((screenPt.x - rect.left) / rect.width) * map.width;
    const svgY = ((screenPt.y - rect.top) / rect.height) * map.height;
    
    // Account for zoom and pan transformations
    const x = (svgX - pan.x) / zoom;
    const y = (svgY - pan.y) / zoom;

    return {
      x: clamp((x / map.width) * 100, 0, 100),
      y: clamp((y / map.height) * 100, 0, 100),
    };
  }, [map, zoom, pan.x, pan.y]);

  // Memoize city region lookup to avoid repeated array.find()
  const cityRegionMap = useMemo(() => {
    const map = new Map<string, RegionDefinition>();
    regions.forEach(region => {
      region.cityIds.forEach(cityId => {
        map.set(cityId, region);
      });
    });
    return map;
  }, [regions]);

  const getCityRegion = useCallback((cityId: string): RegionDefinition | undefined => {
    return cityRegionMap.get(cityId);
  }, [cityRegionMap]);

  // Point-in-polygon test for boundary validation
  const isPointInPolygon = useCallback((point: { x: number; y: number }, polygon: Array<{x: number, y: number}>): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Validate cities against boundary
  useEffect(() => {
    if (!boundaryPolygon || boundaryPolygon.length === 0) {
      setCitiesOutsideBorder(new Set());
      return;
    }

    const outsideCities = new Set<string>();
    for (const city of cities) {
      if (!isPointInPolygon(city, boundaryPolygon)) {
        outsideCities.add(city.id);
      }
    }
    setCitiesOutsideBorder(outsideCities);
  }, [cities, boundaryPolygon, isPointInPolygon]);

  if (!map) {
    return <div className="p-4 text-red-500">Map not found: {resolvedMapId}</div>;
  }

  // Event handlers
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Only get bounding rect when actually needed (panning or dragging)
    if (isPanning && panStart.current && spacePressed) {
      setPan(prev => ({
        x: prev.x + (e.clientX - panStart.current!.x),
        y: prev.y + (e.clientY - panStart.current!.y),
      }));
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (draggedCityId) {
      // Update city position directly without throttling for smooth dragging
      const mapCoords = toMap({ x: e.clientX, y: e.clientY });
      setCities(prev => prev.map(c => c.id === draggedCityId ? { ...c, x: mapCoords.x, y: mapCoords.y } : c));
    }
  }, [isPanning, spacePressed, draggedCityId, toMap]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    setDraggedCityId(null);
    panStart.current = null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>, cityId?: string) => {
    if (cityId) {
      setSelectedCityId(cityId);
      setDraggedCityId(cityId);
      e.preventDefault();
    } else if (spacePressed) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  }, [spacePressed]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.2, Math.min(5, z / zoomDelta)));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.key === 'z' && e.ctrlKey) {
        // Undo
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update region assignment
  const assignCityToRegion = (cityId: string, regionId: string) => {
    setRegions(prev => prev.map(r => {
      const newCityIds = r.cityIds.filter(id => id !== cityId);
      if (r.id === regionId) {
        newCityIds.push(cityId);
      }
      return { ...r, cityIds: newCityIds };
    }));
  };

  // Save cities to static file
  const saveCities = async () => {
    try {
      const resp = await fetch('/api/save-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: map.id, cities }),
      });
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Failed to save: ${error}`);
      } else {
        alert('Cities saved successfully!');
      }
    } catch (err) {
      alert(`Error saving cities: ${err}`);
    }
  };

  return (
    <main className="w-full h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{map.name} - City Region Editor</h1>
              {citiesOutsideBorder.size > 0 && (
                <div className="text-sm text-red-400 mt-1">
                  ⚠ {citiesOutsideBorder.size} {citiesOutsideBorder.size === 1 ? 'city' : 'cities'} outside border
                </div>
              )}
              {boundaryPolygon && citiesOutsideBorder.size === 0 && (
                <div className="text-sm text-green-400 mt-1">
                  ✓ All cities within border
                </div>
              )}
            </div>
            <div className="inline-flex items-center gap-2">
              <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => setZoom((z) => Math.max(0.2, z / 1.1))}>−</button>
              <div className="text-white text-sm px-2">{Math.round(zoom * 100)}%</div>
              <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => setZoom((z) => Math.min(5, z * 1.1))}>+</button>
              <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-4">
            <label className="inline-flex items-center text-sm text-gray-200">
              <input type="checkbox" checked={showCountryOutline} onChange={(e) => setShowCountryOutline(e.target.checked)} className="mr-2" />
              Show Country Outline
            </label>
            <span className="text-gray-400 text-xs">{spacePressed ? '🖐️ Pan Mode' : '💡 Hold SPACE + drag to pan'}</span>
          </div>

          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '100%' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${map.width} ${map.height}`}
              className="w-full h-full"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerDown={handlePointerDown}
              onWheel={handleWheel as any}
            >
              <rect width={map.width} height={map.height} fill="transparent" />

              {/* SVG clip path for country boundary */}
              {boundaryPolygon && boundaryPolygon.length > 0 && (
                <defs>
                  <clipPath id="countryClip">
                    <path
                      d={`M ${boundaryPolygon[0].x * (map.width / 100)} ${boundaryPolygon[0].y * (map.height / 100)} ${boundaryPolygon.map(p => `L ${p.x * (map.width / 100)} ${p.y * (map.height / 100)}`).join(' ')} Z`}
                    />
                  </clipPath>
                </defs>
              )}

              {/* Clipped group for regions and outline */}
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} clipPath="url(#countryClip)">
                {/* Country outline */}
                {showCountryOutline && countryOutlinePath && (
                  <g transform={`scale(${map.width / 100} ${map.height / 100})`}>
                    <path
                      d={countryOutlinePath}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={0.9}
                      strokeOpacity={0.9}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )}

                {/* Region backgrounds with Voronoi boundaries */}
                {renderedRegions.map((r, idx) => (
                  <g key={`region-${idx}`}>
                    {/* Individual Voronoi cells for this region */}
                    {r.cells.map((cell, cellIdx) => (
                      <g key={`cell-${idx}-${cellIdx}`}>
                        {/* Fill with slight stroke for overbleed to eliminate gaps */}
                        <path
                          d={cell.svgPath}
                          fill={r.region.regionColor}
                          fillOpacity={0.2}
                          stroke={r.region.regionColor}
                          strokeWidth={2}
                          strokeOpacity={0.2}
                          strokeLinejoin="round"
                          shapeRendering="crispEdges"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Boundary stroke - same color as fill */}
                        {cell.boundaryPath && (
                          <path
                            d={cell.boundaryPath}
                            fill="none"
                            stroke={r.region.regionColor}
                            strokeWidth={0.2}
                            strokeOpacity={0.03}
                            strokeLinejoin="miter"
                            strokeLinecap="square"
                          />
                        )}
                      </g>
                    ))}
                    {/* Region label */}
                    <text
                      x={r.centroid.x}
                      y={r.centroid.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={r.region.regionColor}
                      fontSize="18"
                      fontWeight="bold"
                      opacity={0.5}
                      style={{ 
                        pointerEvents: 'none', 
                        userSelect: 'none',
                        textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'
                      }}
                    >
                      {r.region.name}
                    </text>
                  </g>
                ))}
              </g>

              {/* Cities (unclipped so they're always visible) */}
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {cities.map(city => {
                  const s = toScreen(city);
                  const region = getCityRegion(city.id);
                  const isSelected = selectedCityId === city.id;
                  const isOutsideBorder = citiesOutsideBorder.has(city.id);

                  return (
                    <g key={city.id}>
                      {/* Warning ring for cities outside border */}
                      {isOutsideBorder && (
                        <circle
                          cx={s.x}
                          cy={s.y}
                          r={isSelected ? 12 : 10}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={2}
                          opacity={0.8}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r={isSelected ? 8 : 6}
                        fill={isOutsideBorder ? '#ef4444' : (region?.regionColor || '#999')}
                        stroke={isSelected ? '#fff' : (isOutsideBorder ? '#ef4444' : '#ccc')}
                        strokeWidth={isSelected ? 2 : 1}
                        opacity={0.9}
                        style={{ cursor: 'grab' }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handlePointerDown(e as any, city.id);
                        }}
                      />
                      {/* City name - always visible */}
                      <text
                        x={s.x}
                        y={s.y - 16}
                        textAnchor="middle"
                        fill={isSelected ? 'white' : (isOutsideBorder ? '#ef4444' : '#cbd5e1')}
                        fontSize="12"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {city.name}
                      </text>
                      {isOutsideBorder && (
                        <text
                          x={s.x}
                          y={s.y - 28}
                          textAnchor="middle"
                          fill="#ef4444"
                          fontSize="16"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          ⚠
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Sidebar - City/Region Assignment */}
        <div className="w-80 bg-slate-800 rounded-lg p-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold mb-4">Cities & Regions</h2>
            {selectedCityId ? (
              <div className="bg-slate-700 p-4 rounded">
                {(() => {
                  const city = cities.find(c => c.id === selectedCityId);
                  const currentRegion = getCityRegion(selectedCityId);
                  const isOutsideBorder = citiesOutsideBorder.has(selectedCityId);
                  if (!city) return null;

                  return (
                    <div>
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        {city.name}
                        {isOutsideBorder && (
                          <span className="text-red-400" title="Outside border">⚠</span>
                        )}
                      </h3>
                      {isOutsideBorder && (
                        <div className="bg-red-900/30 border border-red-500/50 rounded p-2 mb-3 text-xs">
                          <div className="text-red-300 font-semibold mb-1">Outside Border</div>
                          <div className="text-red-200">
                            This city is placed outside the country boundary. Drag it to a valid position.
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-300 mb-3">
                        <div>X: {city.x.toFixed(1)}%</div>
                        <div>Y: {city.y.toFixed(1)}%</div>
                      </div>

                      <div className="mb-4">
                        <label className="text-sm text-gray-300 block mb-2">Assign to Region:</label>
                        <select
                          value={currentRegion?.id || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              assignCityToRegion(selectedCityId, e.target.value);
                            }
                          }}
                          className="w-full px-2 py-2 bg-slate-600 text-white rounded text-sm"
                        >
                          <option value="">-- No Region --</option>
                          {regions.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.cityIds.length})
                            </option>
                          ))}
                        </select>
                      </div>

                      {currentRegion && (
                        <div className="text-xs text-gray-300">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: currentRegion.regionColor }}
                            />
                            <span>Current Region: {currentRegion.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Select a city to assign it to a region</div>
            )}
          </div>

          {/* Border Validation Summary */}
          {citiesOutsideBorder.size > 0 && (
            <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
              <h3 className="font-bold mb-2 text-red-300">Cities Outside Border</h3>
              <div className="text-xs text-red-200 space-y-1 max-h-32 overflow-y-auto">
                {Array.from(citiesOutsideBorder).map(cityId => {
                  const city = cities.find(c => c.id === cityId);
                  return city ? (
                    <div 
                      key={cityId}
                      className="cursor-pointer hover:text-white"
                      onClick={() => setSelectedCityId(cityId)}
                    >
                      • {city.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Region Summary */}
          <div>
            <h3 className="font-bold mb-3">Regions</h3>
            <div className="space-y-2">
              {regions.map(region => (
                <div key={region.id} className="bg-slate-700 p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: region.regionColor }}
                    />
                    <span className="font-semibold">{region.name}</span>
                    <span className="text-xs text-gray-400">({region.cityIds.length} cities)</span>
                  </div>
                  <div className="text-xs text-gray-300 space-y-1">
                    {region.cityIds.map(cityId => {
                      const city = cities.find(c => c.id === cityId);
                      return city ? (
                        <div key={cityId} className="ml-2 text-gray-400">
                          • {city.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded mt-auto font-semibold"
            onClick={saveCities}
          >
            💾 Save Cities
          </button>
        </div>
      </div>
    </main>
  );
}
