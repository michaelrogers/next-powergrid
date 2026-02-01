'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getCachedMap } from '@/lib/mapCache';
import type { GameMapV2, RegionDefinition, ConnectionDefinition } from '@/lib/mapDataV2';
import { renderRegionsWithVoronoi } from '@/lib/voronoiRegionRenderer';
import type { RenderedRegion } from '@/lib/voronoiRegionRenderer';
import { buildOutlinePath, buildOutlinePoints, getPolygonsFromGeoJson, selectBestPolygon } from '@/lib/geojsonOutline';
import { getVoronoiRegions } from '@/lib/voronoiCache';
import type { GeoJson } from '@/lib/geojsonOutline';

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isValidSlug = (value: string) => slugPattern.test(value);

const slugifyId = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const ensureUniqueId = (baseId: string, existingIds: Set<string>) => {
  if (!existingIds.has(baseId)) return baseId;
  let i = 2;
  while (existingIds.has(`${baseId}-${i}`)) i += 1;
  return `${baseId}-${i}`;
};

type Props = {
  mapId: string;
};

export default function CityRegionEditor({ mapId }: Props) {
  const normalizedId = typeof mapId === 'string' ? mapId.trim().toLowerCase() : '';
  const [resolvedMapId, setResolvedMapId] = useState<string>(normalizedId);
  const [mapData, setMapData] = useState<GameMapV2 | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load map from cache
  useEffect(() => {
    const loadMap = async () => {
      try {
        const map = await getCachedMap(normalizedId);
        setMapData(map);
      } catch (error) {
        console.error('Failed to load map:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (normalizedId) {
      loadMap();
    }
  }, [normalizedId]);
  
  // State
  const [cities, setCities] = useState<any[]>([]);
  const [regions, setRegions] = useState<RegionDefinition[]>([]);
  const [connections, setConnections] = useState<ConnectionDefinition[]>([]);
  
  // Initialize state from loaded map
  useEffect(() => {
    if (mapData) {
      setCities(mapData.cities || []);
      setRegions(mapData.regions || []);
      setConnections(mapData.connections || []);
    }
  }, [mapData]);
  
  const [newCityName, setNewCityName] = useState('');
  const [newCityId, setNewCityId] = useState('');
  const [newCityRegionId, setNewCityRegionId] = useState('');
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionColor, setNewRegionColor] = useState('#60a5fa');
  const [showConnectionCosts, setShowConnectionCosts] = useState(true);
  const [newConnectionA, setNewConnectionA] = useState('');
  const [newConnectionB, setNewConnectionB] = useState('');
  const [newConnectionCost, setNewConnectionCost] = useState('');
  const [newRegionId, setNewRegionId] = useState('');
  const [isNewCityIdManual, setIsNewCityIdManual] = useState(false);
  const [isNewRegionIdManual, setIsNewRegionIdManual] = useState(false);
  const [selectedConnectionIdx, setSelectedConnectionIdx] = useState<number | null>(null);
  const [renderedRegions, setRenderedRegions] = useState<RenderedRegion[]>([]);
  const [countryOutlinePath, setCountryOutlinePath] = useState<string | null>(null);
  const [boundaryPolygon, setBoundaryPolygon] = useState<Array<{ x: number; y: number }> | null>(null);
  const [map, setMap] = useState<any>(null);
  const [draggedCityId, setDraggedCityId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [citiesOutsideBorder, setCitiesOutsideBorder] = useState<Set<string>>(new Set());
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [showCountryOutline, setShowCountryOutline] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const cityIdManualRef = useRef(new Set<string>());
  const regionIdManualRef = useRef(new Set<string>());
  const stableKeyCounterRef = useRef(0);
  const regionStableKeyRef = useRef(new Map<string, string>());
  const connectionInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Load cached Voronoi visualization on map load
  useEffect(() => {
    if (!mapData) return;
    
    const loadVoronoi = async () => {
      const cachedRegions = await getVoronoiRegions(mapData.id);
      if (cachedRegions) {
        setRenderedRegions(cachedRegions);
      }
    };
    
    loadVoronoi();
  }, [mapData?.id]);

  // Load country outline
  useEffect(() => {
    if (!mapData) return;
    let cancelled = false;

    async function loadOutline() {
      try {
        const resp = await fetch(`/maps/${mapData!.id}.geo.json`);
        if (!resp.ok) return;
        const geo: GeoJson = await resp.json();
        const polygons = getPolygonsFromGeoJson(geo);
        
        // Select the best polygon (mainland, not islands)
        const selectedPolygon = selectBestPolygon(polygons, mapData!.id);
        if (selectedPolygon) {
          const outline = buildOutlinePath(selectedPolygon, mapData!.id);
          if (!cancelled) {
            setCountryOutlinePath(outline);
            
            // Convert boundary to percentage coordinates for visual clipping
            const boundaryPoints = buildOutlinePoints(selectedPolygon, mapData!.id);
            setBoundaryPolygon(boundaryPoints);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    loadOutline();
    return () => { cancelled = true; };
  }, [mapData]);

  // Compute Voronoi regions asynchronously after cities/regions change - debounced
  // This recalculates only when user edits cities or regions
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
    x: (pt.x / 100) * (mapData?.width || 800),
    y: (pt.y / 100) * (mapData?.height || 600),
  }), [mapData?.width, mapData?.height]);

  const toMap = useCallback((screenPt: { x: number; y: number }) => {
    const svg = svgRef.current;
    if (!svg || !mapData) return screenPt;

    const rect = svg.getBoundingClientRect();
    // Convert screen coordinates to SVG viewBox coordinates
    const svgX = ((screenPt.x - rect.left) / rect.width) * mapData.width;
    const svgY = ((screenPt.y - rect.top) / rect.height) * mapData.height;
    
    // Account for zoom and pan transformations
    const x = (svgX - pan.x) / zoom;
    const y = (svgY - pan.y) / zoom;

    return {
      x: clamp((x / mapData.width) * 100, 0, 100),
      y: clamp((y / mapData.height) * 100, 0, 100),
    };
  }, [mapData, zoom, pan.x, pan.y]);

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

  const cityIdCounts = useMemo(() => {
    const counts = new Map<string, number>();
    cities.forEach(city => {
      if (!city.id) return;
      counts.set(city.id, (counts.get(city.id) || 0) + 1);
    });
    return counts;
  }, [cities]);

  const regionIdCounts = useMemo(() => {
    const counts = new Map<string, number>();
    regions.forEach(region => {
      if (!region.id) return;
      counts.set(region.id, (counts.get(region.id) || 0) + 1);
    });
    return counts;
  }, [regions]);

  const invalidCities = useMemo(
    () => cities.filter(city => !city.id || !isValidSlug(city.id) || (cityIdCounts.get(city.id) || 0) > 1),
    [cities, cityIdCounts]
  );

  const invalidRegions = useMemo(
    () => regions.filter(region => !region.id || !isValidSlug(region.id) || (regionIdCounts.get(region.id) || 0) > 1),
    [regions, regionIdCounts]
  );

  const cityById = useMemo(() => {
    return new Map(cities.map(city => [city.id, city] as const));
  }, [cities]);

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

  if (!mapData) {
    return <div className="p-4 text-red-500">{loading ? 'Loading map...' : `Map not found: ${resolvedMapId}`}</div>;
  }

  // Event handlers
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Only get bounding rect when actually needed (panning or dragging)
    if (isPanning && panStart.current && spacePressed) {
      const start = panStart.current;
      setPan(prev => ({
        x: prev.x + (e.clientX - start.x),
        y: prev.y + (e.clientY - start.y),
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
      // Don't capture space if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (e.code === 'Space' && !isInputField) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.key === 'z' && e.ctrlKey) {
        // Undo
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (e.code === 'Space' && !isInputField) {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update region assignment
  const assignCityToRegion = (cityId: string, regionId: string | null) => {
    setRegions(prev => prev.map(r => {
      const newCityIds = r.cityIds.filter(id => id !== cityId);
      if (regionId && r.id === regionId) {
        newCityIds.push(cityId);
      }
      return { ...r, cityIds: newCityIds };
    }));
  };

  const addCity = () => {
    const trimmedName = newCityName.trim();
    if (!trimmedName) return;

    const existingIds = new Set(cities.map(c => c.id));
    const baseId = slugifyId(newCityId || trimmedName || 'city');
    const id = ensureUniqueId(baseId || `city-${cities.length + 1}`, existingIds);
    if (!isValidSlug(id)) return;

    const newCity = {
      id,
      name: trimmedName,
      x: 50,
      y: 50,
    };

    setCities(prev => [...prev, newCity]);
    setSelectedCityId(id);
    if (newCityRegionId) {
      assignCityToRegion(id, newCityRegionId);
    }
    setNewCityName('');
    setNewCityId('');
    setNewCityRegionId('');
    setIsNewCityIdManual(false);
  };

  const updateCityName = (cityId: string, name: string) => {
    setCities(prev => prev.map(c => c.id === cityId ? { ...c, name } : c));
    if (!cityIdManualRef.current.has(cityId)) {
      const nextId = slugifyId(name);
      if (nextId && nextId !== cityId) {
        updateCityId(cityId, nextId, false);
      }
    }
  };

  const updateCityId = (oldId: string, nextId: string, markManual = true) => {
    const trimmed = nextId.trim();
    if (!trimmed) {
      setCities(prev => prev.map(c => c.id === oldId ? { ...c, id: '' } : c));
      return;
    }
    setCities(prev => prev.map(c => c.id === oldId ? { ...c, id: trimmed } : c));
    setRegions(prev => prev.map(r => ({ ...r, cityIds: r.cityIds.map(id => id === oldId ? trimmed : id) })));
    setConnections(prev => prev.map(c => ({
      ...c,
      cityA: c.cityA === oldId ? trimmed : c.cityA,
      cityB: c.cityB === oldId ? trimmed : c.cityB,
    })));
    if (selectedCityId === oldId) setSelectedCityId(trimmed);
    if (markManual) {
      cityIdManualRef.current.delete(oldId);
      cityIdManualRef.current.add(trimmed);
    } else if (cityIdManualRef.current.has(oldId)) {
      cityIdManualRef.current.delete(oldId);
      cityIdManualRef.current.add(trimmed);
    }
  };

  const deleteCity = (cityId: string) => {
    setCities(prev => prev.filter(c => c.id !== cityId));
    setRegions(prev => prev.map(r => ({ ...r, cityIds: r.cityIds.filter(id => id !== cityId) })));
    setConnections(prev => prev.filter(c => c.cityA !== cityId && c.cityB !== cityId));
    if (selectedCityId === cityId) setSelectedCityId(null);
  };

  const addRegion = () => {
    const trimmedName = newRegionName.trim();
    if (!trimmedName) return;

    const existingIds = new Set(regions.map(r => r.id).filter((id): id is string => id !== undefined));
    const baseId = slugifyId(newRegionId || trimmedName || 'region');
    const id = ensureUniqueId(baseId || `region-${regions.length + 1}`, existingIds);
    if (!isValidSlug(id)) return;

    const region = {
      id,
      name: trimmedName,
      regionColor: newRegionColor || '#60a5fa',
      cityIds: [],
    };

    // Assign stable key for new region
    const stableKey = `region-key-${stableKeyCounterRef.current++}`;
    regionStableKeyRef.current.set(id, stableKey);

    setRegions(prev => [...prev, region]);
    setNewRegionName('');
    setNewRegionId('');
    setIsNewRegionIdManual(false);
  };

  const updateRegionName = (regionId: string, name: string) => {
    setRegions(prev => prev.map(r => r.id === regionId ? { ...r, name } : r));
    if (!regionIdManualRef.current.has(regionId)) {
      const nextId = slugifyId(name);
      if (nextId && nextId !== regionId) {
        updateRegionId(regionId, nextId, false);
      }
    }
  };

  const updateRegionId = (oldId: string, nextId: string, markManual = true) => {
    const trimmed = nextId.trim();
    if (!trimmed) {
      setRegions(prev => prev.map(r => r.id === oldId ? { ...r, id: '' } : r));
      return;
    }
    
    // Transfer stable key from old ID to new ID
    const stableKey = regionStableKeyRef.current.get(oldId);
    if (stableKey && trimmed !== oldId) {
      regionStableKeyRef.current.delete(oldId);
      regionStableKeyRef.current.set(trimmed, stableKey);
    }
    
    setRegions(prev => prev.map(r => r.id === oldId ? { ...r, id: trimmed } : r));
    if (markManual) {
      regionIdManualRef.current.delete(oldId);
      regionIdManualRef.current.add(trimmed);
    } else if (regionIdManualRef.current.has(oldId)) {
      regionIdManualRef.current.delete(oldId);
      regionIdManualRef.current.add(trimmed);
    }
  };

  const updateRegionColor = (regionId: string, color: string) => {
    setRegions(prev => prev.map(r => r.id === regionId ? { ...r, regionColor: color } : r));
  };

  const deleteRegion = (regionId: string) => {
    setRegions(prev => prev.filter(r => r.id !== regionId));
  };

  const updateConnectionCost = (index: number, cost: number | null) => {
    setConnections(prev => prev.map((connection, idx) => {
      if (idx !== index) return connection;
      if (cost === null) {
        const { cost: _cost, ...rest } = connection;
        return rest;
      }
      return { ...connection, cost };
    }));
  };

  const addConnection = () => {
    if (!newConnectionA || !newConnectionB || newConnectionA === newConnectionB) return;
    const pair = [newConnectionA, newConnectionB].sort();
    const exists = connections.some(c => {
      const existing = [c.cityA, c.cityB].sort();
      return existing[0] === pair[0] && existing[1] === pair[1];
    });
    if (exists) return;
    const costValue = newConnectionCost.trim() === '' ? undefined : Number.parseFloat(newConnectionCost);
    const cost = Number.isNaN(costValue as number) ? undefined : costValue;
    setConnections(prev => [...prev, { cityA: newConnectionA, cityB: newConnectionB, cost }]);
    setNewConnectionA('');
    setNewConnectionB('');
    setNewConnectionCost('');
  };

  const deleteConnection = (index: number) => {
    setConnections(prev => prev.filter((_, idx) => idx !== index));
  };

  // Save cities to static file
  const saveCities = async () => {
    if (invalidCities.length > 0 || invalidRegions.length > 0) {
      alert('Fix invalid or duplicate IDs before saving.');
      return;
    }
    try {
      const resp = await fetch('/api/save-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: mapData.id, cities, regions, connections }),
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
              <div className="mb-2">
                <Link
                  href="/editor"
                  className="text-sm text-gray-300 hover:text-white"
                >
                  ← All Maps
                </Link>
              </div>
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
            <label className="inline-flex items-center text-sm text-gray-200">
              <input
                type="checkbox"
                checked={showConnectionCosts}
                onChange={(e) => setShowConnectionCosts(e.target.checked)}
                className="mr-2"
              />
              Show Connection Costs
            </label>
            <span className="text-gray-400 text-xs">{spacePressed ? '🖐️ Pan Mode' : '💡 Hold SPACE + drag to pan'}</span>
          </div>

          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '100%' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${mapData.width} ${mapData.height}`}
              className="w-full h-full"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerDown={handlePointerDown}
              onWheel={handleWheel as any}
            >
              <rect width={mapData.width} height={mapData.height} fill="transparent" />

              {/* SVG clip path for country boundary */}
              {boundaryPolygon && boundaryPolygon.length > 0 && (
                <defs>
                  <clipPath id="countryClip">
                    <path
                      d={`M ${boundaryPolygon[0].x * (mapData.width / 100)} ${boundaryPolygon[0].y * (mapData.height / 100)} ${boundaryPolygon.map(p => `L ${p.x * (mapData.width / 100)} ${p.y * (mapData.height / 100)}`).join(' ')} Z`}
                    />
                  </clipPath>
                </defs>
              )}

              {/* Clipped group for regions and outline */}
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} clipPath="url(#countryClip)">
                {/* Country outline */}
                {showCountryOutline && countryOutlinePath && (
                  <g transform={`scale(${mapData.width / 100} ${mapData.height / 100})`}>
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
                {countryOutlinePath && renderedRegions.map((r, idx) => (
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
                  </g>
                ))}
              </g>

              {/* Region labels (unclipped so they can extend past border) */}
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {countryOutlinePath && renderedRegions.map((r, idx) => (
                  <text
                    key={`region-label-${idx}`}
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
                ))}
              </g>

              {/* City connections */}
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {connections.map((connection, idx) => {
                  const cityA = cityById.get(connection.cityA);
                  const cityB = cityById.get(connection.cityB);
                  if (!cityA || !cityB) return null;
                  const a = toScreen(cityA);
                  const b = toScreen(cityB);
                  const midX = (a.x + b.x) / 2;
                  const midY = (a.y + b.y) / 2;
                  return (
                    <g key={`connection-${idx}`}>
                      <circle
                        cx={a.x}
                        cy={a.y}
                        r={2.2}
                        fill="#cbd5f5"
                        fillOpacity={0.7}
                      />
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={2.2}
                        fill="#cbd5f5"
                        fillOpacity={0.7}
                      />
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#a5b4fc"
                        strokeWidth={2.4}
                        strokeOpacity={0.65}
                        strokeLinecap="round"
                        strokeDasharray="5 3"
                        vectorEffect="non-scaling-stroke"
                      />
                      {showConnectionCosts && typeof connection.cost === 'number' && connection.cost !== 0 && (
                        <g
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConnectionIdx(idx);
                            // Focus the input in the side menu
                            setTimeout(() => {
                              const input = connectionInputRefs.current.get(idx);
                              if (input) {
                                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                input.focus();
                                input.select();
                              }
                            }, 100);
                          }}
                          className="group"
                        >
                          <circle
                            cx={midX}
                            cy={midY}
                            r={6}
                            fill={selectedConnectionIdx === idx ? '#3b82f6' : '#0f172a'}
                            fillOpacity={0.75}
                            stroke={selectedConnectionIdx === idx ? '#60a5fa' : '#e2e8f0'}
                            strokeWidth={selectedConnectionIdx === idx ? 2 : 1.2}
                            style={{ transition: 'r 0.2s ease', vectorEffect: 'non-scaling-stroke' }}
                            onMouseEnter={(e) => {
                              (e.target as SVGCircleElement).setAttribute('r', '14');
                            }}
                            onMouseLeave={(e) => {
                              (e.target as SVGCircleElement).setAttribute('r', '6');
                            }}
                          />
                          <text
                            x={midX}
                            y={midY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#e2e8f0"
                            fontSize="9"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {connection.cost}
                          </text>
                          <title>
                            {`${cityById.get(connection.cityA)?.name || connection.cityA} ↔ ${cityById.get(connection.cityB)?.name || connection.cityB}\nCost: ${connection.cost}`}
                          </title>
                        </g>
                      )}
                    </g>
                  );
                })}
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
                          r={isSelected ? 16 : 14}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={2}
                          opacity={0.8}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                      {(() => {
                        const shieldWidth = 20;
                        const shieldTop = s.y - 12;
                        const shieldLeft = s.x - shieldWidth / 2;
                        const shieldRight = s.x + shieldWidth / 2;
                        const shieldMid = s.y + 4;
                        const shieldBottom = s.y + 14;
                        const ribbonTop = s.y + 2;
                        const ribbonBottom = s.y + 11;
                        const labelText = city.name;
                        const labelWidth = Math.max(14, labelText.length * 3.9 + 2);
                        const ribbonLeft = s.x - labelWidth / 2;
                        const ribbonRight = s.x + labelWidth / 2;
                        const labelScaleX = Math.min(1, 10 / Math.max(1, labelText.length));

                        return (
                          <>
                            <path
                              d={`M ${shieldLeft} ${shieldTop} L ${shieldRight} ${shieldTop} L ${shieldRight - 2} ${shieldMid} L ${s.x} ${shieldBottom} L ${shieldLeft + 2} ${shieldMid} Z`}
                              fill={isOutsideBorder ? '#ef4444' : (region?.regionColor || '#999')}
                              stroke={isSelected ? '#fff' : (isOutsideBorder ? '#ef4444' : '#ccc')}
                              strokeWidth={isSelected ? 2 : 1.2}
                              opacity={0.95}
                              style={{ cursor: 'grab' }}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                handlePointerDown(e as any, city.id);
                              }}
                            />
                            <circle
                              cx={s.x}
                              cy={s.y - 2}
                              r={3.2}
                              fill="white"
                              opacity={0.9}
                              style={{ pointerEvents: 'none' }}
                            />
                            {/* City label ribbon */}
                            <g className="pointer-events-none select-none">
                              <path
                                d={`M ${ribbonLeft - 0.5} ${ribbonTop} L ${ribbonRight + 0.5} ${ribbonTop} L ${ribbonRight - 0.5} ${ribbonBottom} L ${ribbonLeft + 0.5} ${ribbonBottom} Z`}
                                fill="#0f172a"
                                stroke="white"
                                strokeWidth="0.8"
                                opacity={0.9}
                              />
                              <text
                                x={s.x}
                                y={ribbonTop + 7}
                                textAnchor="middle"
                                fill={isSelected ? 'white' : (isOutsideBorder ? '#ef4444' : '#e2e8f0')}
                                fontSize="7"
                                fontWeight={isSelected ? 'bold' : 'normal'}
                                style={{ userSelect: 'none', letterSpacing: '-0.2px' }}
                                transform={`translate(${s.x} ${ribbonTop + 7}) scale(${labelScaleX} 1) translate(${-s.x} ${-(ribbonTop + 7)})`}
                              >
                                {labelText}
                              </text>
                            </g>
                          </>
                        );
                      })()}
                      {isOutsideBorder && (
                        <text
                          x={s.x}
                          y={s.y - 22}
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
        <div className="w-96 bg-slate-800 rounded-lg p-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold mb-4">Cities & Regions</h2>
            <div className="bg-slate-700 p-3 rounded mb-4">
              <div className="text-sm font-semibold mb-2">Add City</div>
              <div className="space-y-2">
                <input
                  value={newCityName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setNewCityName(next);
                    if (!isNewCityIdManual) {
                      setNewCityId(slugifyId(next));
                    }
                  }}
                  placeholder="City name"
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-sm"
                />
                <input
                  value={newCityId}
                  onChange={(e) => {
                    setNewCityId(e.target.value);
                    setIsNewCityIdManual(true);
                  }}
                  placeholder="City id (slug)"
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-xs"
                />
                <div className="text-[10px] text-gray-400">
                  Use lowercase letters, numbers, and hyphens.
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Assign to Region</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor:
                          regions.find(r => r.id === newCityRegionId)?.regionColor || '#475569',
                      }}
                      title="Selected region color"
                    />
                    <select
                      value={newCityRegionId}
                      onChange={(e) => setNewCityRegionId(e.target.value)}
                      className="flex-1 px-2 py-1 bg-slate-600 text-white rounded text-sm"
                    >
                      <option value="">-- No Region --</option>
                      {regions.map(r => (
                        <option
                          key={r.id}
                          value={r.id}
                          style={{ color: r.regionColor }}
                        >
                          ● {r.name} ({r.cityIds.length})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  onClick={addCity}
                >
                  + Add City
                </button>
              </div>
            </div>
            {selectedCityId ? (
              <div className="bg-slate-700 p-4 rounded">
                {(() => {
                  const city = cities.find(c => c.id === selectedCityId);
                  const currentRegion = getCityRegion(selectedCityId);
                  const isOutsideBorder = citiesOutsideBorder.has(selectedCityId);
                  if (!city) return null;

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {city.name}
                          {isOutsideBorder && (
                            <span className="text-red-400" title="Outside border">⚠</span>
                          )}
                        </h3>
                        <button
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                          onClick={() => deleteCity(city.id)}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-300 block mb-1">Rename City</label>
                        <input
                          value={city.name}
                          onChange={(e) => updateCityName(city.id, e.target.value)}
                          className="w-full px-2 py-1 bg-slate-600 text-white rounded text-sm"
                        />
                        <label className="text-xs text-gray-300 block mb-1 mt-3">City ID (slug)</label>
                        <input
                          value={city.id}
                          onChange={(e) => updateCityId(city.id, e.target.value, true)}
                          className={`w-full px-2 py-1 rounded text-sm ${isValidSlug(city.id) ? 'bg-slate-600 text-white' : 'bg-red-900/40 text-red-200 border border-red-600/50'}`}
                        />
                        {!isValidSlug(city.id) && (
                          <div className="text-[10px] text-red-300 mt-1">Invalid slug format.</div>
                        )}
                      </div>
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
                            const nextRegionId = e.target.value || null;
                            assignCityToRegion(selectedCityId, nextRegionId);
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

                      {/* City Connections */}
                      {(() => {
                        const cityConnections = connections.filter(c => c.cityA === selectedCityId || c.cityB === selectedCityId);
                        return (
                          <div className="mt-4 pt-4 border-t border-slate-600">
                            <div className="text-sm text-gray-300 font-semibold mb-2">Connections ({cityConnections.length})</div>
                            {cityConnections.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {cityConnections.map((conn) => {
                                  const otherCityId = conn.cityA === selectedCityId ? conn.cityB : conn.cityA;
                                  const otherCity = cities.find(c => c.id === otherCityId);
                                  const connectionIdx = connections.findIndex(c => c.cityA === conn.cityA && c.cityB === conn.cityB);
                                  return (
                                    <div key={`${conn.cityA}-${conn.cityB}`} className="bg-slate-600 p-2 rounded text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-gray-200">
                                          ↔ {otherCity?.name || otherCityId}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            value={typeof conn.cost === 'number' ? conn.cost : ''}
                                            onChange={(e) => {
                                              const raw = e.target.value;
                                              if (raw === '') {
                                                updateConnectionCost(connectionIdx, null);
                                              } else {
                                                const next = Number.parseFloat(raw);
                                                updateConnectionCost(connectionIdx, Number.isNaN(next) ? null : next);
                                              }
                                            }}
                                            className="w-12 px-1 py-0.5 bg-slate-700 text-yellow-300 rounded text-xs font-semibold border border-slate-500"
                                          />
                                          <button
                                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                            onClick={() => deleteConnection(connectionIdx)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Add Connection Form */}
                            <div className="bg-slate-700 p-2 rounded text-xs">
                              <div className="text-gray-300 font-semibold mb-2">Add Connection</div>
                              <div className="space-y-2">
                                <select
                                  value={newConnectionB}
                                  onChange={(e) => setNewConnectionB(e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-xs"
                                >
                                  <option value="">-- Select City --</option>
                                  {cities
                                    .filter(c => c.id !== selectedCityId && !cityConnections.some(conn => (conn.cityA === selectedCityId && conn.cityB === c.id) || (conn.cityB === selectedCityId && conn.cityA === c.id)))
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                </select>
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Cost"
                                    value={newConnectionCost}
                                    onChange={(e) => setNewConnectionCost(e.target.value)}
                                    className="flex-1 px-2 py-1 bg-slate-600 text-white rounded text-xs"
                                  />
                                  <button
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50"
                                    onClick={() => {
                                      if (!newConnectionB) return;
                                      const costNum = newConnectionCost ? Number.parseFloat(newConnectionCost) : undefined;
                                      setConnections(prev => [
                                        ...prev,
                                        {
                                          cityA: selectedCityId,
                                          cityB: newConnectionB,
                                          cost: Number.isNaN(costNum as number) ? undefined : costNum,
                                        }
                                      ]);
                                      setNewConnectionB('');
                                      setNewConnectionCost('');
                                    }}
                                    disabled={!newConnectionB}
                                  >
                                    + Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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
            <div className="bg-slate-700 p-3 rounded mb-3">
              <div className="text-sm font-semibold mb-2">Add Region</div>
              <div className="space-y-2">
                <input
                  value={newRegionName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setNewRegionName(next);
                    if (!isNewRegionIdManual) {
                      setNewRegionId(slugifyId(next));
                    }
                  }}
                  placeholder="Region name"
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-sm"
                />
                <input
                  value={newRegionId}
                  onChange={(e) => {
                    setNewRegionId(e.target.value);
                    setIsNewRegionIdManual(true);
                  }}
                  placeholder="Region id (slug)"
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-xs"
                />
                <button
                  type="button"
                  className="w-full px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
                  onClick={() => {
                    setNewRegionId(slugifyId(newRegionName));
                    setIsNewRegionIdManual(false);
                  }}
                >
                  Auto-generate from name
                </button>
                <div className="text-[10px] text-gray-400">
                  Use lowercase letters, numbers, and hyphens.
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newRegionColor}
                    onChange={(e) => setNewRegionColor(e.target.value)}
                    className="h-8 w-10 bg-transparent border border-slate-600 rounded"
                    title="Region color"
                  />
                </div>
                <button
                  className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  onClick={addRegion}
                >
                  + Add Region
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {regions.map(region => {
                // Skip regions without IDs
                if (!region.id) return null;
                
                // Get or create stable key for this region
                if (!regionStableKeyRef.current.has(region.id)) {
                  regionStableKeyRef.current.set(region.id, `region-key-${stableKeyCounterRef.current++}`);
                }
                const stableKey = regionStableKeyRef.current.get(region.id)!;
                const regionId = region.id as string; // Type guard - we know it exists since we checked above
                const regionName = region.name || ''; // Default to empty string if undefined
                
                return (
                <div key={stableKey} className="bg-slate-700 p-3 rounded text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={region.regionColor}
                        onChange={(e) => updateRegionColor(regionId, e.target.value)}
                        className="h-6 w-8 bg-transparent border border-slate-600 rounded"
                        title="Region color"
                      />
                      <input
                        value={regionName}
                        onChange={(e) => updateRegionName(regionId, e.target.value)}
                        className="px-2 py-1 bg-slate-600 text-white rounded text-sm"
                      />
                      <span className="text-xs text-gray-400">({region.cityIds.length})</span>
                    </div>
                    <button
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      onClick={() => deleteRegion(regionId)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-300 block mb-1">Region ID (slug)</label>
                    <div className="flex items-center gap-2">
                      <input
                        value={regionId}
                        onChange={(e) => updateRegionId(regionId, e.target.value, true)}
                        className={`flex-1 px-2 py-1 rounded text-xs ${isValidSlug(regionId) ? 'bg-slate-600 text-white' : 'bg-red-900/40 text-red-200 border border-red-600/50'}`}
                      />
                      <button
                        type="button"
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
                        onClick={() => updateRegionId(regionId, slugifyId(regionName), false)}
                      >
                        Auto
                      </button>
                    </div>
                    {!isValidSlug(regionId) && (
                      <div className="text-[10px] text-red-300 mt-1">Invalid slug format.</div>
                    )}
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
              );
              })}
            </div>
          </div>

          {/* Connection Costs */}
          <div>
            <h3 className="font-bold mb-3">Connections</h3>
            <div className="bg-slate-700 p-3 rounded mb-3">
              <div className="text-sm font-semibold mb-2">Add Connection</div>
              <div className="space-y-2">
                <select
                  value={newConnectionA}
                  onChange={(e) => setNewConnectionA(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-sm"
                >
                  <option value="">City A</option>
                  {cities.map(city => (
                    <option key={`conn-a-${city.id}`} value={city.id}>{city.name}</option>
                  ))}
                </select>
                <select
                  value={newConnectionB}
                  onChange={(e) => setNewConnectionB(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-sm"
                >
                  <option value="">City B</option>
                  {cities.map(city => (
                    <option key={`conn-b-${city.id}`} value={city.id}>{city.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={newConnectionCost}
                  onChange={(e) => setNewConnectionCost(e.target.value)}
                  placeholder="Cost (optional)"
                  className="w-full px-2 py-1 bg-slate-600 text-white rounded text-sm"
                />
                <button
                  className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  onClick={addConnection}
                >
                  + Add Connection
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {connections.map((connection, idx) => {
                const cityA = cityById.get(connection.cityA);
                const cityB = cityById.get(connection.cityB);
                const label = `${cityA?.name || connection.cityA} ↔ ${cityB?.name || connection.cityB}`;
                return (
                  <div 
                    key={`connection-row-${idx}`} 
                    className={`p-3 rounded text-sm transition-colors ${
                      selectedConnectionIdx === idx ? 'bg-blue-900/40 border border-blue-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-200">{label}</div>
                      <button
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                        onClick={() => deleteConnection(idx)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-300">Cost</label>
                      <input
                        ref={(el) => {
                          if (el) {
                            connectionInputRefs.current.set(idx, el);
                          } else {
                            connectionInputRefs.current.delete(idx);
                          }
                        }}
                        type="number"
                        min="0"
                        value={typeof connection.cost === 'number' ? connection.cost : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            updateConnectionCost(idx, null);
                          } else {
                            const next = Number.parseFloat(raw);
                            updateConnectionCost(idx, Number.isNaN(next) ? null : next);
                          }
                        }}
                        onFocus={() => setSelectedConnectionIdx(idx)}
                        onBlur={() => setSelectedConnectionIdx(null)}
                        className="w-24 px-2 py-1 bg-slate-600 text-white rounded text-xs"
                      />
                      <span className="text-[10px] text-gray-400">{connection.cityA} ↔ {connection.cityB}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          {(invalidCities.length > 0 || invalidRegions.length > 0) && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-3 text-xs text-red-200">
              Fix invalid or duplicate IDs before saving.
            </div>
          )}
          <button
            className={`px-4 py-2 rounded mt-auto font-semibold ${invalidCities.length > 0 || invalidRegions.length > 0 ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            onClick={saveCities}
            disabled={invalidCities.length > 0 || invalidRegions.length > 0}
          >
            💾 Save Cities
          </button>
        </div>
      </div>
    </main>
  );
}
